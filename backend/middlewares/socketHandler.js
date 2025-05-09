const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const User = require('../models/User');

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5000'],
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling']
  });
  
  // Track online users
  const onlineUsers = new Map();
  
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token missing'));
      }
      
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      socket.userId = decoded._id;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication failed: ' + error.message));
    }
  });
  
  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Store active users
    onlineUsers.set(socket.userId, socket.id);
    socket.join(`user_${socket.userId}`);
    
    // Fetch user role
    try {
      const user = await User.findById(socket.userId).select('role');
      socket.userRole = user.role;
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
    
    // Join a conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });
    
    // Leave a conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });
    
    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content } = data;
        const sender = socket.userId;
       
        // Create new message
        const newMessage = new Message({
          conversationId,
          sender,
          content
        });
       
        const savedMessage = await newMessage.save();
       
        // Update conversation's lastMessage and updatedAt
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: savedMessage._id,
          updatedAt: Date.now()
        }).populate('participants', '_id');
       
        // Populate the sender info
        await savedMessage.populate('sender', '_id fullName avatar');
        
        // Get conversation participants
        const conversation = await Conversation.findById(conversationId).populate('participants', '_id fullName');
        
        // Emit to all participants in the conversation
        io.to(conversationId).emit('receive_message', savedMessage);
        
        // Create notifications and notify participants who might not be in the conversation room
        conversation.participants.forEach(async (participant) => {
          if (participant._id.toString() !== socket.userId) {
            // Create notification
            const notification = new Notification({
              recipient: participant._id,
              sender: socket.userId,
              type: 'message',
              title: 'New Message',
              content: `${savedMessage.sender.fullName} sent you a message`,
              relatedId: conversationId,
              onModel: 'Conversation',
              url: `/admin/messages/${conversationId}`
            });
            
            await notification.save();
            
            // Send notification to user if online
            io.to(`user_${participant._id}`).emit('new_notification', notification);
            
            // Also send message notification
            io.to(`user_${participant._id}`).emit('new_message_notification', {
              conversationId,
              message: savedMessage
            });
          }
        });
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });
    
    // Handle typing indicators
    socket.on('typing', async (data) => {
      try {
        const { conversationId, isTyping } = data;
        
        // Get conversation participants
        const conversation = await Conversation.findById(conversationId).select('participants');
        
        // Broadcast to all other participants
        conversation.participants.forEach(participant => {
          if (participant._id.toString() !== socket.userId) {
            socket.to(`user_${participant._id}`).emit('user_typing', {
              conversationId,
              userId: socket.userId,
              isTyping
            });
          }
        });
      } catch (error) {
        console.error('Error handling typing event:', error);
      }
    });
    
    // Mark notification as read
    socket.on('mark_notification_read', async (notificationId) => {
      try {
        const notification = await Notification.findOneAndUpdate(
          { _id: notificationId, recipient: socket.userId },
          { read: true },
          { new: true }
        );
        
        if (notification) {
          socket.emit('notification_updated', notification);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });
    
    // Mark all notifications as read
    socket.on('mark_all_notifications_read', async () => {
      try {
        await Notification.updateMany(
          { recipient: socket.userId, read: false },
          { read: true }
        );
        
        socket.emit('all_notifications_marked_read');
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    });
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);
    });
  });
  
  // Export functions to be used by controllers
  io.sendNotification = async (userId, notification) => {
    try {
      // Save the notification to database
      const savedNotification = await notification.save();
      
      // Send real-time notification if user is online
      io.to(`user_${userId}`).emit('new_notification', savedNotification);
      
      return savedNotification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  };
  
  io.sendNotificationToMany = async (userIds, notificationData) => {
    try {
      const notifications = [];
      
      // Create and save notifications for each user
      for (const userId of userIds) {
        const notification = new Notification({
          ...notificationData,
          recipient: userId
        });
        
        const savedNotification = await notification.save();
        notifications.push(savedNotification);
        
        // Send real-time notification if user is online
        io.to(`user_${userId}`).emit('new_notification', savedNotification);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error sending notifications to multiple users:', error);
      throw error;
    }
  };
  
  io.sendRoleBasedNotification = async (role, notificationData, excludeUserId = null) => {
    try {
      // Find all users with specified role
      const users = await User.find({ role }).select('_id');
      const userIds = users
        .map(user => user._id.toString())
        .filter(id => id !== excludeUserId);
      
      return io.sendNotificationToMany(userIds, notificationData);
    } catch (error) {
      console.error('Error sending role-based notification:', error);
      throw error;
    }
  };
  
  return io;
}

module.exports = initializeSocket;
