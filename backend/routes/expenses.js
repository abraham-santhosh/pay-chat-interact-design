import express from 'express';
import { body, validationResult } from 'express-validator';
import Expense from '../models/Expense.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { authenticate, isGroupMember } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

// Validation middleware
const validateExpense = [
  body('description')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Description must be between 1 and 200 characters'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('category')
    .optional()
    .isIn(['food', 'transport', 'accommodation', 'entertainment', 'shopping', 'utilities', 'other'])
    .withMessage('Invalid category'),
  body('participants')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required'),
  body('group')
    .isMongoId()
    .withMessage('Valid group ID is required'),
  body('splitMethod')
    .optional()
    .isIn(['equal', 'exact', 'percentage'])
    .withMessage('Invalid split method')
];

// Helper function to notify group members about expense changes
const notifyGroupMembers = async (groupId, eventType, data, excludeUserId = null) => {
  try {
    const group = await Group.findById(groupId).populate('members.user', 'name email');
    if (!group) return;

    // Emit to all group members
    io.to(groupId.toString()).emit(eventType, {
      groupId,
      ...data,
      timestamp: new Date()
    });

    console.log(`Notified group ${groupId} about ${eventType}`);
  } catch (error) {
    console.error('Error notifying group members:', error);
  }
};

// Get all expenses for a group
router.get('/group/:groupId', authenticate, isGroupMember, async (req, res) => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const settled = req.query.settled;

    // Build query
    const query = { group: groupId };
    if (category) query.category = category;
    if (settled !== undefined) query.settled = settled === 'true';

    const expenses = await Expense.find(query)
      .populate('paidBy', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Expense.countDocuments(query);

    res.json({
      expenses: expenses.map(expense => ({
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        paidBy: expense.paidBy,
        participants: expense.participants,
        splitMethod: expense.splitMethod,
        date: expense.date,
        settled: expense.settled,
        settledAt: expense.settledAt,
        notes: expense.notes,
        tags: expense.tags,
        location: expense.location,
        receipt: expense.receipt,
        createdBy: expense.createdBy,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get group expenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's expenses across all groups
router.get('/user', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const expenses = await Expense.find({
      $or: [
        { paidBy: userId },
        { 'participants.user': userId }
      ]
    })
      .populate('paidBy', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('group', 'name description')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Expense.countDocuments({
      $or: [
        { paidBy: userId },
        { 'participants.user': userId }
      ]
    });

    res.json({
      expenses: expenses.map(expense => ({
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        paidBy: expense.paidBy,
        participants: expense.participants,
        group: expense.group,
        splitMethod: expense.splitMethod,
        date: expense.date,
        settled: expense.settled,
        settledAt: expense.settledAt,
        notes: expense.notes,
        tags: expense.tags,
        location: expense.location,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user expenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific expense
router.get('/:expenseId', authenticate, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user._id;

    const expense = await Expense.findById(expenseId)
      .populate('paidBy', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('group', 'name description members')
      .populate('createdBy', 'name email')
      .populate('settledBy', 'name email')
      .populate('settlements.from', 'name email')
      .populate('settlements.to', 'name email')
      .populate('editHistory.editedBy', 'name email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if user has access to this expense
    const group = await Group.findById(expense.group);
    if (!group) {
      return res.status(404).json({ message: 'Associated group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === userId.toString() && member.isActive
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    res.json({
      expense: {
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        paidBy: expense.paidBy,
        participants: expense.participants,
        group: expense.group,
        splitMethod: expense.splitMethod,
        date: expense.date,
        settled: expense.settled,
        settledAt: expense.settledAt,
        settledBy: expense.settledBy,
        settlements: expense.settlements,
        notes: expense.notes,
        tags: expense.tags,
        location: expense.location,
        receipt: expense.receipt,
        recurring: expense.recurring,
        createdBy: expense.createdBy,
        editHistory: expense.editHistory,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      }
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new expense
router.post('/', authenticate, validateExpense, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const {
      description,
      amount,
      currency,
      category,
      paidBy,
      participants,
      group: groupId,
      splitMethod,
      notes,
      tags,
      location,
      date,
      recurring
    } = req.body;

    const userId = req.user._id;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === userId.toString() && member.isActive
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Verify paidBy user exists and is a group member
    const paidByUser = await User.findById(paidBy);
    if (!paidByUser) {
      return res.status(404).json({ message: 'Payer not found' });
    }

    const isPayerMember = group.members.some(member => 
      member.user.toString() === paidBy.toString() && member.isActive
    );

    if (!isPayerMember) {
      return res.status(400).json({ message: 'Payer must be a group member' });
    }

    // Verify all participants are group members
    const participantIds = participants.map(p => typeof p === 'string' ? p : p.user);
    const participantUsers = await User.find({ _id: { $in: participantIds } });

    if (participantUsers.length !== participantIds.length) {
      return res.status(400).json({ message: 'One or more participants not found' });
    }

    for (const participantId of participantIds) {
      const isParticipantMember = group.members.some(member => 
        member.user.toString() === participantId.toString() && member.isActive
      );
      
      if (!isParticipantMember) {
        return res.status(400).json({ message: 'All participants must be group members' });
      }
    }

    // Create expense
    const expense = new Expense({
      description,
      amount,
      currency: currency || group.settings.currency,
      category: category || 'other',
      paidBy,
      participants: participants.map(p => ({
        user: typeof p === 'string' ? p : p.user,
        share: typeof p === 'object' ? p.share : 0,
        shareType: typeof p === 'object' ? p.shareType : 'equal'
      })),
      group: groupId,
      splitMethod: splitMethod || group.settings.splitMethod,
      notes,
      tags,
      location,
      date: date || new Date(),
      recurring,
      createdBy: userId
    });

    await expense.save();

    // Populate the response
    await expense.populate('paidBy', 'name email avatar');
    await expense.populate('participants.user', 'name email avatar');
    await expense.populate('group', 'name description');
    await expense.populate('createdBy', 'name email');

    // Notify all group members about the new expense
    await notifyGroupMembers(groupId, 'expense-created', {
      expense: {
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paidBy,
        participants: expense.participants
      },
      createdBy: req.user.name
    });

    res.status(201).json({
      message: 'Expense created successfully',
      expense: {
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        paidBy: expense.paidBy,
        participants: expense.participants,
        group: expense.group,
        splitMethod: expense.splitMethod,
        date: expense.date,
        settled: expense.settled,
        notes: expense.notes,
        tags: expense.tags,
        location: expense.location,
        recurring: expense.recurring,
        createdBy: expense.createdBy,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an expense
router.put('/:expenseId', authenticate, validateExpense, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { expenseId } = req.params;
    const userId = req.user._id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.settled) {
      return res.status(400).json({ message: 'Cannot update settled expense' });
    }

    // Check if user has permission to update
    const group = await Group.findById(expense.group);
    if (!group) {
      return res.status(404).json({ message: 'Associated group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === userId.toString() && member.isActive
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Only creator or group admin can update
    const isCreator = expense.createdBy.toString() === userId.toString();
    const userMember = group.members.find(member => 
      member.user.toString() === userId.toString()
    );
    const isAdmin = userMember?.role === 'admin' || group.createdBy.toString() === userId.toString();

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Only expense creator or group admin can update' });
    }

    // Update expense using the model method
    const updates = req.body;
    delete updates.group; // Don't allow group change
    delete updates.createdBy; // Don't allow creator change

    await expense.updateExpense(updates, userId);

    // Populate the response
    await expense.populate('paidBy', 'name email avatar');
    await expense.populate('participants.user', 'name email avatar');
    await expense.populate('group', 'name description');
    await expense.populate('createdBy', 'name email');

    // Notify all group members about the update
    await notifyGroupMembers(expense.group._id, 'expense-updated', {
      expense: {
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paidBy,
        participants: expense.participants
      },
      updatedBy: req.user.name
    });

    res.json({
      message: 'Expense updated successfully',
      expense: {
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        paidBy: expense.paidBy,
        participants: expense.participants,
        group: expense.group,
        splitMethod: expense.splitMethod,
        date: expense.date,
        settled: expense.settled,
        notes: expense.notes,
        tags: expense.tags,
        location: expense.location,
        recurring: expense.recurring,
        createdBy: expense.createdBy,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Settle an expense
router.post('/:expenseId/settle', authenticate, [
  body('settlements')
    .optional()
    .isArray()
    .withMessage('Settlements must be an array'),
  body('settlements.*.from')
    .optional()
    .isMongoId()
    .withMessage('From user ID must be valid'),
  body('settlements.*.to')
    .optional()
    .isMongoId()
    .withMessage('To user ID must be valid'),
  body('settlements.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Settlement amount must be positive'),
  body('settlements.*.method')
    .optional()
    .isIn(['cash', 'upi', 'bank_transfer', 'card', 'other'])
    .withMessage('Invalid settlement method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { expenseId } = req.params;
    const { settlements } = req.body;
    const userId = req.user._id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.settled) {
      return res.status(400).json({ message: 'Expense is already settled' });
    }

    // Check if user has permission to settle
    const group = await Group.findById(expense.group);
    if (!group) {
      return res.status(404).json({ message: 'Associated group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === userId.toString() && member.isActive
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Settle the expense
    await expense.settle(userId, settlements);

    // Populate the response
    await expense.populate('paidBy', 'name email avatar');
    await expense.populate('participants.user', 'name email avatar');
    await expense.populate('settledBy', 'name email');
    await expense.populate('settlements.from', 'name email');
    await expense.populate('settlements.to', 'name email');

    // Notify all group members about the settlement
    await notifyGroupMembers(expense.group, 'expense-settled', {
      expense: {
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paidBy
      },
      settledBy: req.user.name
    });

    res.json({
      message: 'Expense settled successfully',
      expense: {
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        paidBy: expense.paidBy,
        participants: expense.participants,
        settled: expense.settled,
        settledAt: expense.settledAt,
        settledBy: expense.settledBy,
        settlements: expense.settlements,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      }
    });
  } catch (error) {
    console.error('Settle expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a settlement to an expense
router.post('/:expenseId/settlements', authenticate, [
  body('from')
    .isMongoId()
    .withMessage('From user ID must be valid'),
  body('to')
    .isMongoId()
    .withMessage('To user ID must be valid'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Settlement amount must be positive'),
  body('method')
    .optional()
    .isIn(['cash', 'upi', 'bank_transfer', 'card', 'other'])
    .withMessage('Invalid settlement method'),
  body('transactionId')
    .optional()
    .isString()
    .withMessage('Transaction ID must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { expenseId } = req.params;
    const { from, to, amount, method, transactionId } = req.body;
    const userId = req.user._id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if user has permission
    const group = await Group.findById(expense.group);
    if (!group) {
      return res.status(404).json({ message: 'Associated group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === userId.toString() && member.isActive
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // User can only add settlements involving themselves
    if (from.toString() !== userId.toString() && to.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only add settlements involving yourself' });
    }

    // Add the settlement
    await expense.addSettlement(from, to, amount, method, transactionId);

    // Populate the response
    await expense.populate('settlements.from', 'name email avatar');
    await expense.populate('settlements.to', 'name email avatar');

    // Notify all group members about the settlement
    await notifyGroupMembers(expense.group, 'settlement-added', {
      expense: {
        id: expense._id,
        description: expense.description
      },
      settlement: {
        from: from,
        to: to,
        amount: amount,
        method: method || 'cash'
      },
      addedBy: req.user.name
    });

    res.json({
      message: 'Settlement added successfully',
      settlement: expense.settlements[expense.settlements.length - 1]
    });
  } catch (error) {
    console.error('Add settlement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an expense
router.delete('/:expenseId', authenticate, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user._id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.settled) {
      return res.status(400).json({ message: 'Cannot delete settled expense' });
    }

    // Check if user has permission to delete
    const group = await Group.findById(expense.group);
    if (!group) {
      return res.status(404).json({ message: 'Associated group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === userId.toString() && member.isActive
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Only creator or group admin can delete
    const isCreator = expense.createdBy.toString() === userId.toString();
    const userMember = group.members.find(member => 
      member.user.toString() === userId.toString()
    );
    const isAdmin = userMember?.role === 'admin' || group.createdBy.toString() === userId.toString();

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Only expense creator or group admin can delete' });
    }

    // Store expense info for notification
    const expenseInfo = {
      id: expense._id,
      description: expense.description,
      amount: expense.amount
    };

    // Remove expense from group
    await Group.findByIdAndUpdate(expense.group, {
      $pull: { expenses: expense._id }
    });

    // Delete the expense
    await expense.deleteOne();

    // Notify all group members about the deletion
    await notifyGroupMembers(expense.group, 'expense-deleted', {
      expense: expenseInfo,
      deletedBy: req.user.name
    });

    res.json({
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expense statistics for a group
router.get('/group/:groupId/stats', authenticate, isGroupMember, async (req, res) => {
  try {
    const { groupId } = req.params;
    const summary = await Expense.getGroupSummary(groupId);

    res.json({
      summary
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;