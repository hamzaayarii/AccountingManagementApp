// socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const User = require('../models/User');

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling']
  });
 
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
 
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
   
    // Store active users
    socket.join(`user_${socket.userId}`);
   
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
        });
   
        // Populate the sender info for the message
        await savedMessage.populate('sender', 'name avatar');
        
        // Get conversation participants
        const conversation = await Conversation.findById(conversationId).populate('participants', '_id');
        
        // Emit to all participants in the conversation
        io.to(conversationId).emit('receive_message', savedMessage);
   
        // Create notifications for each participant except the sender
        for (const participant of conversation.participants) {
          if (participant._id.toString() !== socket.userId) {
            try {
              // Get sender info
              const senderUser = await User.findById(socket.userId).select('name');
              
              // Create notification
              const notification = new Notification({
                recipient: participant._id,
                sender: socket.userId,
                type: 'message',
                text: `${senderUser.name}: ${content.length > 30 ? content.substring(0, 30) + '...' : content}`,
                conversationId: conversationId
              });
              
              const savedNotification = await notification.save();
              
              // Populate sender info for notification
              await savedNotification.populate('sender', 'name avatar');
              
              // Emit notification to recipient
              io.to(`user_${participant._id}`).emit('receive_notification', {
                _id: savedNotification._id,
                senderName: senderUser.name,
                text: savedNotification.text,
                type: savedNotification.type,
                conversationId: savedNotification.conversationId,
                createdAt: savedNotification.createdAt,
                sender: savedNotification.sender
              });
              
              console.log(`Notification sent to user ${participant._id}`);
            } catch (notificationError) {
              console.error('Error creating notification:', notificationError);
            }
          }
        }
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
    
    // Handle mark notification as read
    socket.on('mark_notification_read', async (notificationId) => {
      try {
        const notification = await Notification.findById(notificationId);
        
        if (notification && notification.recipient.toString() === socket.userId) {
          notification.read = true;
          await notification.save();
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });
    
    // Handle mark all notifications as read
    socket.on('mark_all_notifications_read', async () => {
      try {
        await Notification.updateMany(
          { recipient: socket.userId, read: false },
          { $set: { read: true } }
        );
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    });
   
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
 
  return io;
}

module.exports = initializeSocket;