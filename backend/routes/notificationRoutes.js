const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const Notification = require('../models/Notification');


// Store reference to io
let io;

// Set io from outside
Object.defineProperty(router, 'io', {
  set: function(value) {
    io = value;
  }
});
// Get all unread notifications for a user
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('User ID:', req.user._id); // Check if the user is properly authenticated
    const notifications = await Notification.find({
      recipient: req.user._id,
      read: false
    })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 });
    
    console.log('Notifications:', notifications); // Log notifications for debugging
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/test', authenticate, async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    
    // Create a test notification
    const notification = new Notification({
      recipient: recipientId,
      sender: req.user._id,
      senderName: req.user.name,
      type: 'message',
      text: message || 'This is a test notification',
      conversationId: null
    });
    
    const savedNotification = await notification.save();
    await savedNotification.populate('sender', 'name avatar');
    
    // Emit the notification to the recipient
    if (io) {
      io.to(`user_${recipientId}`).emit('receive_notification', savedNotification);
    }
    
    res.json({ success: true, notification: savedNotification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;