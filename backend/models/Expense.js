import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  currency: {
    type: String,
    default: 'INR'
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'accommodation', 'entertainment', 'shopping', 'utilities', 'other'],
    default: 'other'
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    share: {
      type: Number,
      default: 0
    },
    shareType: {
      type: String,
      enum: ['equal', 'exact', 'percentage'],
      default: 'equal'
    }
  }],
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  splitMethod: {
    type: String,
    enum: ['equal', 'exact', 'percentage'],
    default: 'equal'
  },
  receipt: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  tags: [String],
  location: {
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  date: {
    type: Date,
    default: Date.now
  },
  settled: {
    type: Boolean,
    default: false
  },
  settledAt: Date,
  settledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  settlements: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    settledAt: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'card', 'other'],
      default: 'cash'
    },
    transactionId: String
  }],
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'monthly'
    },
    nextDate: Date,
    endDate: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  editHistory: [{
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    editedAt: {
      type: Date,
      default: Date.now
    },
    changes: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Pre-save middleware to calculate shares
expenseSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('amount') || this.isModified('participants') || this.isModified('splitMethod')) {
    await this.calculateShares();
  }
  next();
});

// Method to calculate shares based on split method
expenseSchema.methods.calculateShares = async function() {
  const totalParticipants = this.participants.length;
  
  if (totalParticipants === 0) {
    throw new Error('No participants found for expense');
  }
  
  switch (this.splitMethod) {
    case 'equal':
      const equalShare = this.amount / totalParticipants;
      this.participants.forEach(participant => {
        participant.share = Math.round(equalShare * 100) / 100;
        participant.shareType = 'equal';
      });
      break;
      
    case 'exact':
      // Shares should be pre-defined for exact split
      const totalExactShares = this.participants.reduce((sum, p) => sum + p.share, 0);
      if (Math.abs(totalExactShares - this.amount) > 0.01) {
        throw new Error('Exact shares do not match the total amount');
      }
      break;
      
    case 'percentage':
      const totalPercentage = this.participants.reduce((sum, p) => sum + p.share, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Percentage shares do not add up to 100%');
      }
      this.participants.forEach(participant => {
        participant.share = Math.round((this.amount * participant.share / 100) * 100) / 100;
        participant.shareType = 'percentage';
      });
      break;
  }
};

// Method to settle the expense
expenseSchema.methods.settle = async function(settledBy, settlements = []) {
  this.settled = true;
  this.settledAt = new Date();
  this.settledBy = settledBy;
  
  if (settlements.length > 0) {
    this.settlements = settlements;
  }
  
  // Update group balances
  const Group = mongoose.model('Group');
  const group = await Group.findById(this.group);
  if (group) {
    group.totalSettled += this.amount;
    await group.calculateBalances();
  }
  
  await this.save();
  return this;
};

// Method to add settlement
expenseSchema.methods.addSettlement = async function(from, to, amount, method = 'cash', transactionId = null) {
  const settlement = {
    from,
    to,
    amount,
    method,
    transactionId,
    settledAt: new Date()
  };
  
  this.settlements.push(settlement);
  
  // Check if expense is fully settled
  const totalSettled = this.settlements.reduce((sum, s) => sum + s.amount, 0);
  if (totalSettled >= this.amount) {
    this.settled = true;
    this.settledAt = new Date();
  }
  
  await this.save();
  return this;
};

// Method to update expense (with history tracking)
expenseSchema.methods.updateExpense = async function(updates, updatedBy) {
  const oldData = this.toObject();
  
  // Apply updates
  Object.assign(this, updates);
  
  // Add to edit history
  this.editHistory.push({
    editedBy: updatedBy,
    editedAt: new Date(),
    changes: {
      old: oldData,
      new: updates
    }
  });
  
  await this.save();
  return this;
};

// Method to get expense summary
expenseSchema.methods.getSummary = function() {
  const totalShare = this.participants.reduce((sum, p) => sum + p.share, 0);
  
  return {
    id: this._id,
    description: this.description,
    amount: this.amount,
    currency: this.currency,
    category: this.category,
    paidBy: this.paidBy,
    participantsCount: this.participants.length,
    totalShare,
    settled: this.settled,
    date: this.date,
    group: this.group
  };
};

// Static method to get group expenses summary
expenseSchema.statics.getGroupSummary = async function(groupId) {
  const expenses = await this.find({ group: groupId });
  
  const summary = expenses.reduce((acc, expense) => {
    acc.totalAmount += expense.amount;
    acc.totalExpenses += 1;
    
    if (expense.settled) {
      acc.settledAmount += expense.amount;
      acc.settledExpenses += 1;
    }
    
    // Category breakdown
    if (!acc.categories[expense.category]) {
      acc.categories[expense.category] = 0;
    }
    acc.categories[expense.category] += expense.amount;
    
    return acc;
  }, {
    totalAmount: 0,
    totalExpenses: 0,
    settledAmount: 0,
    settledExpenses: 0,
    categories: {}
  });
  
  return summary;
};

// Post-save middleware to update group totals
expenseSchema.post('save', async function(doc) {
  const Group = mongoose.model('Group');
  const group = await Group.findById(doc.group);
  
  if (group) {
    const expenses = await doc.constructor.find({ group: doc.group });
    group.totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    group.totalSettled = expenses.filter(exp => exp.settled).reduce((sum, exp) => sum + exp.amount, 0);
    
    // Add expense to group if not already there
    if (!group.expenses.includes(doc._id)) {
      group.expenses.push(doc._id);
    }
    
    await group.save();
  }
});

// Indexes for efficient queries
expenseSchema.index({ group: 1, date: -1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ 'participants.user': 1 });
expenseSchema.index({ settled: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ createdAt: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;