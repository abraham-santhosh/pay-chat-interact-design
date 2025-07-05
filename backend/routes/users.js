import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Group from '../models/Group.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Search users by email or name
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    const searchTerm = q.trim();
    
    // Search by email or name
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, // Exclude current user
        { isActive: true }, // Only active users
        {
          $or: [
            { email: { $regex: searchTerm, $options: 'i' } },
            { name: { $regex: searchTerm, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name email avatar')
    .limit(20);
    
    res.json({
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }))
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile by ID
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    const user = await User.findById(userId)
      .select('name email avatar preferences createdAt')
      .populate('groups', 'name description');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(404).json({ message: 'User account is deactivated' });
    }
    
    // Check if users share any groups
    const sharedGroups = await Group.find({
      isActive: true,
      'members.user': { $all: [currentUserId, userId] },
      'members.isActive': true
    }).select('name description');
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        preferences: user.preferences,
        createdAt: user.createdAt,
        sharedGroups: sharedGroups.map(group => ({
          id: group._id,
          name: group.name,
          description: group.description
        }))
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's groups
router.get('/:userId/groups', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    // Only allow users to see their own groups or shared groups
    if (userId !== currentUserId.toString()) {
      // Return only shared groups
      const sharedGroups = await Group.find({
        isActive: true,
        'members.user': { $all: [currentUserId, userId] },
        'members.isActive': true
      })
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email')
      .select('name description createdBy members totalExpenses totalSettled createdAt');
      
      return res.json({
        groups: sharedGroups.map(group => ({
          id: group._id,
          name: group.name,
          description: group.description,
          createdBy: group.createdBy,
          members: group.members.filter(member => member.isActive),
          membersCount: group.members.filter(member => member.isActive).length,
          totalExpenses: group.totalExpenses,
          totalSettled: group.totalSettled,
          createdAt: group.createdAt
        }))
      });
    }
    
    // User's own groups
    const groups = await Group.find({
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    })
    .populate('members.user', 'name email avatar')
    .populate('createdBy', 'name email')
    .sort({ updatedAt: -1 });
    
    res.json({
      groups: groups.map(group => ({
        id: group._id,
        name: group.name,
        description: group.description,
        createdBy: group.createdBy,
        members: group.members.filter(member => member.isActive),
        membersCount: group.members.filter(member => member.isActive).length,
        totalExpenses: group.totalExpenses,
        totalSettled: group.totalSettled,
        settings: group.settings,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user preferences
router.put('/:userId/preferences', authenticate, [
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be boolean'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification preference must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }
    
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    // Only allow users to update their own preferences
    if (userId !== currentUserId.toString()) {
      return res.status(403).json({ message: 'You can only update your own preferences' });
    }
    
    const { currency, notifications } = req.body;
    const updateData = {};
    
    if (currency) {
      updateData['preferences.currency'] = currency;
    }
    
    if (notifications) {
      if (notifications.email !== undefined) {
        updateData['preferences.notifications.email'] = notifications.email;
      }
      if (notifications.push !== undefined) {
        updateData['preferences.notifications.push'] = notifications.push;
      }
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('preferences');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload/update user avatar
router.put('/:userId/avatar', authenticate, [
  body('avatar')
    .isString()
    .withMessage('Avatar must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }
    
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const { avatar } = req.body;
    
    // Only allow users to update their own avatar
    if (userId !== currentUserId.toString()) {
      return res.status(403).json({ message: 'You can only update your own avatar' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true, runValidators: true }
    ).select('name email avatar');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: 'Avatar updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics
router.get('/:userId/stats', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    // Only allow users to see their own stats
    if (userId !== currentUserId.toString()) {
      return res.status(403).json({ message: 'You can only view your own statistics' });
    }
    
    const user = await User.findById(userId).populate('groups');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's expense statistics
    const Expense = (await import('../models/Expense.js')).default;
    
    const expenseStats = await Expense.aggregate([
      {
        $match: {
          $or: [
            { paidBy: user._id },
            { 'participants.user': user._id }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          settledExpenses: {
            $sum: { $cond: [{ $eq: ['$settled', true] }, 1, 0] }
          },
          settledAmount: {
            $sum: { $cond: [{ $eq: ['$settled', true] }, '$amount', 0] }
          },
          expensesPaidBy: {
            $sum: { $cond: [{ $eq: ['$paidBy', user._id] }, 1, 0] }
          },
          amountPaidBy: {
            $sum: { $cond: [{ $eq: ['$paidBy', user._id] }, '$amount', 0] }
          }
        }
      }
    ]);
    
    const stats = expenseStats[0] || {
      totalExpenses: 0,
      totalAmount: 0,
      settledExpenses: 0,
      settledAmount: 0,
      expensesPaidBy: 0,
      amountPaidBy: 0
    };
    
    // Get category breakdown
    const categoryStats = await Expense.aggregate([
      {
        $match: {
          $or: [
            { paidBy: user._id },
            { 'participants.user': user._id }
          ]
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);
    
    res.json({
      stats: {
        totalGroups: user.groups.length,
        totalExpenses: stats.totalExpenses,
        totalAmount: stats.totalAmount,
        settledExpenses: stats.settledExpenses,
        settledAmount: stats.settledAmount,
        expensesPaidBy: stats.expensesPaidBy,
        amountPaidBy: stats.amountPaidBy,
        pendingExpenses: stats.totalExpenses - stats.settledExpenses,
        pendingAmount: stats.totalAmount - stats.settledAmount,
        categoryBreakdown: categoryStats.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            amount: item.amount
          };
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's activity feed
router.get('/:userId/activity', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Only allow users to see their own activity
    if (userId !== currentUserId.toString()) {
      return res.status(403).json({ message: 'You can only view your own activity' });
    }
    
    // Get user's groups
    const userGroups = await Group.find({
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    }).select('_id');
    
    const groupIds = userGroups.map(group => group._id);
    
    // Get activity from all user's groups
    const activities = await Group.aggregate([
      { $match: { _id: { $in: groupIds } } },
      { $unwind: '$activityLog' },
      { $sort: { 'activityLog.timestamp': -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'activityLog.performedBy',
          foreignField: '_id',
          as: 'performer'
        }
      },
      {
        $project: {
          groupId: '$_id',
          groupName: '$name',
          action: '$activityLog.action',
          performedBy: { $arrayElemAt: ['$performer', 0] },
          details: '$activityLog.details',
          timestamp: '$activityLog.timestamp'
        }
      }
    ]);
    
    res.json({
      activities: activities.map(activity => ({
        groupId: activity.groupId,
        groupName: activity.groupName,
        action: activity.action,
        performedBy: {
          id: activity.performedBy._id,
          name: activity.performedBy.name,
          email: activity.performedBy.email,
          avatar: activity.performedBy.avatar
        },
        details: activity.details,
        timestamp: activity.timestamp
      })),
      pagination: {
        page,
        limit,
        hasMore: activities.length === limit
      }
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;