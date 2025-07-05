import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Verify JWT token middleware
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided, access denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'User account is deactivated' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Optional authentication middleware (for public routes that benefit from auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Check if user is group member
export const isGroupMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    const Group = (await import('../models/Group.js')).default;
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
    
    req.group = group;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error checking group membership' });
  }
};

// Check if user is group admin
export const isGroupAdmin = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    const Group = (await import('../models/Group.js')).default;
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const memberInfo = group.members.find(member => 
      member.user.toString() === userId.toString() && member.isActive
    );
    
    if (!memberInfo) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }
    
    if (memberInfo.role !== 'admin' && group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not an admin of this group' });
    }
    
    req.group = group;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error checking group admin status' });
  }
};

// Refresh token middleware
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    const newToken = generateToken(user._id);
    const newRefreshToken = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret', 
      { expiresIn: '30d' }
    );
    
    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
      user
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// Rate limiting for sensitive operations
export const sensitiveOperationLimit = (req, res, next) => {
  // This would typically use Redis or similar for production
  // For now, we'll use a simple in-memory approach
  const userOperations = req.app.locals.userOperations || {};
  const userId = req.user._id.toString();
  const currentTime = Date.now();
  const timeWindow = 60 * 1000; // 1 minute
  const maxOperations = 10;
  
  if (!userOperations[userId]) {
    userOperations[userId] = [];
  }
  
  // Clean old operations
  userOperations[userId] = userOperations[userId].filter(
    timestamp => currentTime - timestamp < timeWindow
  );
  
  if (userOperations[userId].length >= maxOperations) {
    return res.status(429).json({ 
      message: 'Too many sensitive operations. Please try again later.' 
    });
  }
  
  userOperations[userId].push(currentTime);
  req.app.locals.userOperations = userOperations;
  
  next();
};