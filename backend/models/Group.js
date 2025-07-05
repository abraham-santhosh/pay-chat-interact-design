import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  expenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  }],
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    autoSettleDebts: {
      type: Boolean,
      default: false
    },
    currency: {
      type: String,
      default: 'INR'
    },
    splitMethod: {
      type: String,
      enum: ['equal', 'exact', 'percentage'],
      default: 'equal'
    }
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalExpenses: {
    type: Number,
    default: 0
  },
  totalSettled: {
    type: Number,
    default: 0
  },
  balances: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    balance: {
      type: Number,
      default: 0
    },
    owes: [{
      to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      amount: {
        type: Number,
        default: 0
      }
    }],
    owed: [{
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      amount: {
        type: Number,
        default: 0
      }
    }]
  }],
  activityLog: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Generate invite code before saving
groupSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  next();
});

// Method to add member to group
groupSchema.methods.addMember = async function(userId, role = 'member') {
  const User = mongoose.model('User');
  
  // Check if user is already a member
  const existingMember = this.members.find(member => member.user.toString() === userId.toString());
  if (existingMember) {
    throw new Error('User is already a member of this group');
  }
  
  // Add to group members
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date(),
    isActive: true
  });
  
  // Add to user's groups
  await User.findByIdAndUpdate(userId, {
    $addToSet: { groups: this._id }
  });
  
  // Initialize balance for new member
  this.balances.push({
    user: userId,
    balance: 0,
    owes: [],
    owed: []
  });
  
  // Log activity
  this.activityLog.push({
    action: 'MEMBER_ADDED',
    performedBy: this.createdBy,
    details: { userId, role },
    timestamp: new Date()
  });
  
  await this.save();
  return this;
};

// Method to remove member from group
groupSchema.methods.removeMember = async function(userId, removedBy) {
  const User = mongoose.model('User');
  
  // Check if user is a member
  const memberIndex = this.members.findIndex(member => member.user.toString() === userId.toString());
  if (memberIndex === -1) {
    throw new Error('User is not a member of this group');
  }
  
  // Remove from group members
  this.members.splice(memberIndex, 1);
  
  // Remove from user's groups
  await User.findByIdAndUpdate(userId, {
    $pull: { groups: this._id }
  });
  
  // Remove from balances
  this.balances = this.balances.filter(balance => balance.user.toString() !== userId.toString());
  
  // Update other members' balances to remove references to this user
  this.balances.forEach(balance => {
    balance.owes = balance.owes.filter(owe => owe.to.toString() !== userId.toString());
    balance.owed = balance.owed.filter(owed => owed.from.toString() !== userId.toString());
  });
  
  // Log activity
  this.activityLog.push({
    action: 'MEMBER_REMOVED',
    performedBy: removedBy,
    details: { userId },
    timestamp: new Date()
  });
  
  await this.save();
  return this;
};

// Method to update group settings (affects all members)
groupSchema.methods.updateSettings = async function(newSettings, updatedBy) {
  const oldSettings = { ...this.settings };
  
  // Update settings
  Object.assign(this.settings, newSettings);
  
  // Log activity
  this.activityLog.push({
    action: 'SETTINGS_UPDATED',
    performedBy: updatedBy,
    details: { oldSettings, newSettings },
    timestamp: new Date()
  });
  
  await this.save();
  return this;
};

// Method to calculate balances for all members
groupSchema.methods.calculateBalances = async function() {
  const Expense = mongoose.model('Expense');
  const expenses = await Expense.find({ group: this._id, settled: false });
  
  // Reset all balances
  this.balances.forEach(balance => {
    balance.balance = 0;
    balance.owes = [];
    balance.owed = [];
  });
  
  // Calculate balances from all expenses
  expenses.forEach(expense => {
    const paidById = expense.paidBy.toString();
    const splitAmount = expense.amount / expense.participants.length;
    
    expense.participants.forEach(participantId => {
      const participantIdStr = participantId.toString();
      
      if (paidById !== participantIdStr) {
        // Find balances for payer and participant
        let payerBalance = this.balances.find(b => b.user.toString() === paidById);
        let participantBalance = this.balances.find(b => b.user.toString() === participantIdStr);
        
        if (!payerBalance) {
          payerBalance = { user: paidById, balance: 0, owes: [], owed: [] };
          this.balances.push(payerBalance);
        }
        
        if (!participantBalance) {
          participantBalance = { user: participantIdStr, balance: 0, owes: [], owed: [] };
          this.balances.push(participantBalance);
        }
        
        // Update balances
        payerBalance.balance += splitAmount;
        participantBalance.balance -= splitAmount;
        
        // Update owes/owed relationships
        const existingOwe = participantBalance.owes.find(owe => owe.to.toString() === paidById);
        if (existingOwe) {
          existingOwe.amount += splitAmount;
        } else {
          participantBalance.owes.push({ to: paidById, amount: splitAmount });
        }
        
        const existingOwed = payerBalance.owed.find(owed => owed.from.toString() === participantIdStr);
        if (existingOwed) {
          existingOwed.amount += splitAmount;
        } else {
          payerBalance.owed.push({ from: participantIdStr, amount: splitAmount });
        }
      }
    });
  });
  
  await this.save();
  return this.balances;
};

// Method to get group summary
groupSchema.methods.getSummary = function() {
  const activeMembersCount = this.members.filter(member => member.isActive).length;
  const totalBalance = this.balances.reduce((sum, balance) => sum + Math.abs(balance.balance), 0);
  
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    membersCount: activeMembersCount,
    totalExpenses: this.totalExpenses,
    totalSettled: this.totalSettled,
    totalBalance: totalBalance,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Indexes for efficient queries
groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ inviteCode: 1 });
groupSchema.index({ isActive: 1 });

const Group = mongoose.model('Group', groupSchema);

export default Group;