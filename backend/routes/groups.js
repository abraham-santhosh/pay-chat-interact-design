import express from 'express';
import { body, validationResult } from 'express-validator';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import { authenticate, isGroupMember, isGroupAdmin, sensitiveOperationLimit } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

// Validation middleware
const validateGroup = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Group name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must be less than 200 characters')
];

const validateGroupUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Group name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must be less than 200 characters')
];

const validateSettings = [
  body('settings.allowMemberInvites')
    .optional()
    .isBoolean()
    .withMessage('Allow member invites must be boolean'),
  body('settings.autoSettleDebts')
    .optional()
    .isBoolean()
    .withMessage('Auto settle debts must be boolean'),
  body('settings.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),
  body('settings.splitMethod')
    .optional()
    .isIn(['equal', 'exact', 'percentage'])
    .withMessage('Invalid split method')
];

// Helper function to notify all group members
const notifyGroupMembers = async (groupId, eventType, data, excludeUserId = null) => {
  try {
    const group = await Group.findById(groupId).populate('members.user', 'name email');
    if (!group) return;

    const memberIds = group.members
      .filter(member => member.isActive && (!excludeUserId || member.user._id.toString() !== excludeUserId.toString()))
      .map(member => member.user._id.toString());

    // Emit to all group members
    io.to(groupId.toString()).emit(eventType, {
      groupId,
      ...data,
      timestamp: new Date()
    });

    // In a real app, you'd also send push notifications, emails, etc.
    console.log(`Notified ${memberIds.length} members of group ${groupId} about ${eventType}`);
  } catch (error) {
    console.error('Error notifying group members:', error);
  }
};

// Get all groups for the current user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const groups = await Group.find({
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    })
    .populate('members.user', 'name email avatar')
    .populate('createdBy', 'name email')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Group.countDocuments({
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    });

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
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific group
router.get('/:groupId', authenticate, isGroupMember, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('expenses');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json({
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        createdBy: group.createdBy,
        members: group.members.filter(member => member.isActive),
        expenses: group.expenses,
        balances: group.balances,
        settings: group.settings,
        inviteCode: group.inviteCode,
        totalExpenses: group.totalExpenses,
        totalSettled: group.totalSettled,
        activityLog: group.activityLog.slice(-20), // Last 20 activities
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new group
router.post('/', authenticate, validateGroup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, description } = req.body;
    const userId = req.user._id;

    // Create the group
    const group = new Group({
      name,
      description,
      createdBy: userId,
      members: [{
        user: userId,
        role: 'admin',
        joinedAt: new Date(),
        isActive: true
      }],
      balances: [{
        user: userId,
        balance: 0,
        owes: [],
        owed: []
      }]
    });

    await group.save();

    // Add group to user's groups
    await User.findByIdAndUpdate(userId, {
      $addToSet: { groups: group._id }
    });

    // Populate the response
    await group.populate('members.user', 'name email avatar');
    await group.populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Group created successfully',
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        createdBy: group.createdBy,
        members: group.members,
        membersCount: group.members.length,
        totalExpenses: group.totalExpenses,
        totalSettled: group.totalSettled,
        settings: group.settings,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update group details (affects all members)
router.put('/:groupId', authenticate, isGroupAdmin, validateGroupUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, description } = req.body;
    const groupId = req.params.groupId;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Store old values for activity log
    const oldValues = {
      name: group.name,
      description: group.description
    };

    // Update group
    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    // Add activity log
    group.activityLog.push({
      action: 'GROUP_UPDATED',
      performedBy: userId,
      details: { oldValues, newValues: { name, description } },
      timestamp: new Date()
    });

    await group.save();

    // Populate the response
    await group.populate('members.user', 'name email avatar');
    await group.populate('createdBy', 'name email');

    // Notify all group members about the update
    await notifyGroupMembers(groupId, 'group-updated', {
      name: group.name,
      description: group.description,
      updatedBy: req.user.name
    }, userId);

    res.json({
      message: 'Group updated successfully',
      group: {
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
      }
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update group settings (affects all members)
router.put('/:groupId/settings', authenticate, isGroupAdmin, validateSettings, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { settings } = req.body;
    const groupId = req.params.groupId;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Update settings using the model method
    await group.updateSettings(settings, userId);

    // Populate the response
    await group.populate('members.user', 'name email avatar');

    // Notify all group members about the settings change
    await notifyGroupMembers(groupId, 'group-settings-updated', {
      settings: group.settings,
      updatedBy: req.user.name
    }, userId);

    res.json({
      message: 'Group settings updated successfully',
      settings: group.settings
    });
  } catch (error) {
    console.error('Update group settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to group
router.post('/:groupId/members', authenticate, isGroupMember, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be either admin or member')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, role = 'member' } = req.body;
    const groupId = req.params.groupId;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user has permission to add members
    const currentUserMember = group.members.find(
      member => member.user.toString() === userId.toString()
    );
    
    if (!group.settings.allowMemberInvites && 
        currentUserMember?.role !== 'admin' && 
        group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: 'Only admins can add members to this group' 
      });
    }

    // Find user by email
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add member using the model method
    await group.addMember(userToAdd._id, role);

    // Populate the response
    await group.populate('members.user', 'name email avatar');

    // Notify all group members about the new member
    await notifyGroupMembers(groupId, 'member-added', {
      newMember: {
        id: userToAdd._id,
        name: userToAdd.name,
        email: userToAdd.email,
        role
      },
      addedBy: req.user.name
    });

    res.json({
      message: 'Member added successfully',
      member: {
        user: {
          id: userToAdd._id,
          name: userToAdd.name,
          email: userToAdd.email,
          avatar: userToAdd.avatar
        },
        role,
        joinedAt: new Date(),
        isActive: true
      }
    });
  } catch (error) {
    console.error('Add member error:', error);
    if (error.message === 'User is already a member of this group') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from group
router.delete('/:groupId/members/:memberId', authenticate, isGroupMember, sensitiveOperationLimit, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check permissions
    const currentUserMember = group.members.find(
      member => member.user.toString() === userId.toString()
    );
    
    const isAdmin = currentUserMember?.role === 'admin' || 
                   group.createdBy.toString() === userId.toString();
    const isSelf = userId.toString() === memberId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ 
        message: 'You can only remove yourself or be an admin to remove others' 
      });
    }

    // Get user info before removal
    const memberToRemove = group.members.find(
      member => member.user.toString() === memberId
    );
    
    if (!memberToRemove) {
      return res.status(404).json({ message: 'Member not found in group' });
    }

    // Get user details for notification
    const userToRemove = await User.findById(memberId);

    // Remove member using the model method
    await group.removeMember(memberId, userId);

    // Notify all group members about the removal
    await notifyGroupMembers(groupId, 'member-removed', {
      removedMember: {
        id: memberId,
        name: userToRemove?.name || 'Unknown',
        email: userToRemove?.email || 'Unknown'
      },
      removedBy: req.user.name,
      isSelfRemoval: isSelf
    });

    res.json({
      message: isSelf ? 'Left group successfully' : 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update member role
router.put('/:groupId/members/:memberId/role', authenticate, isGroupAdmin, [
  body('role')
    .isIn(['admin', 'member'])
    .withMessage('Role must be either admin or member')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { role } = req.body;
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Find the member
    const memberToUpdate = group.members.find(
      member => member.user.toString() === memberId
    );

    if (!memberToUpdate) {
      return res.status(404).json({ message: 'Member not found in group' });
    }

    // Update role
    memberToUpdate.role = role;

    // Add activity log
    group.activityLog.push({
      action: 'MEMBER_ROLE_UPDATED',
      performedBy: userId,
      details: { memberId, newRole: role },
      timestamp: new Date()
    });

    await group.save();

    // Get user details for notification
    const userUpdated = await User.findById(memberId);

    // Notify all group members about the role change
    await notifyGroupMembers(groupId, 'member-role-updated', {
      member: {
        id: memberId,
        name: userUpdated?.name || 'Unknown',
        email: userUpdated?.email || 'Unknown',
        newRole: role
      },
      updatedBy: req.user.name
    });

    res.json({
      message: 'Member role updated successfully',
      member: {
        user: memberId,
        role,
        joinedAt: memberToUpdate.joinedAt,
        isActive: memberToUpdate.isActive
      }
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join group by invite code
router.post('/join/:inviteCode', authenticate, async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user._id;

    const group = await Group.findOne({ inviteCode, isActive: true });
    if (!group) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    // Check if user is already a member
    const existingMember = group.members.find(
      member => member.user.toString() === userId.toString()
    );
    
    if (existingMember) {
      if (existingMember.isActive) {
        return res.status(400).json({ message: 'You are already a member of this group' });
      } else {
        // Reactivate the member
        existingMember.isActive = true;
        existingMember.joinedAt = new Date();
      }
    } else {
      // Add as new member
      await group.addMember(userId, 'member');
    }

    // Populate the response
    await group.populate('members.user', 'name email avatar');
    await group.populate('createdBy', 'name email');

    // Notify all group members about the new member
    await notifyGroupMembers(group._id, 'member-joined', {
      newMember: {
        id: userId,
        name: req.user.name,
        email: req.user.email
      }
    });

    res.json({
      message: 'Joined group successfully',
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        createdBy: group.createdBy,
        members: group.members.filter(member => member.isActive),
        membersCount: group.members.filter(member => member.isActive).length,
        totalExpenses: group.totalExpenses,
        totalSettled: group.totalSettled,
        settings: group.settings,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group balances
router.get('/:groupId/balances', authenticate, isGroupMember, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId).populate('balances.user', 'name email avatar');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Recalculate balances to ensure accuracy
    const balances = await group.calculateBalances();

    res.json({
      balances: balances.map(balance => ({
        user: balance.user,
        balance: balance.balance,
        owes: balance.owes,
        owed: balance.owed
      }))
    });
  } catch (error) {
    console.error('Get group balances error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group activity log
router.get('/:groupId/activity', authenticate, isGroupMember, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const group = await Group.findById(groupId)
      .populate('activityLog.performedBy', 'name email');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const totalActivities = group.activityLog.length;
    const activities = group.activityLog
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(skip, skip + limit);

    res.json({
      activities,
      pagination: {
        page,
        limit,
        total: totalActivities,
        pages: Math.ceil(totalActivities / limit)
      }
    });
  } catch (error) {
    console.error('Get group activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete group (only creator can delete)
router.delete('/:groupId', authenticate, sensitiveOperationLimit, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only creator can delete the group
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the group creator can delete the group' });
    }

    // Check if there are unsettled expenses
    const unsettledExpenses = await Expense.find({ group: groupId, settled: false });
    if (unsettledExpenses.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete group with unsettled expenses. Please settle all expenses first.' 
      });
    }

    // Notify all group members about the deletion
    await notifyGroupMembers(groupId, 'group-deleted', {
      groupName: group.name,
      deletedBy: req.user.name
    });

    // Remove group from all users
    await User.updateMany(
      { groups: groupId },
      { $pull: { groups: groupId } }
    );

    // Soft delete the group
    group.isActive = false;
    await group.save();

    res.json({
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;