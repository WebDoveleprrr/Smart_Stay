const cron = require('node-cron');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ServiceRequest = require('../models/ServiceRequest');

const getUserModel = () => mongoose.model('User');

// 1. Booking Cron (Every 5 minutes)
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    
    // a) Cancel if time > startTime + 15 mins AND no check-in (status = booked or under_review)
    const pendingBookings = await Booking.find({
      status: { $in: ['booked', 'under_review'] },
      startTime: { $lt: new Date(now.getTime() - 15 * 60 * 1000) },
      checkInTime: null
    });

    for (const bk of pendingBookings) {
      bk.status = 'cancelled';
      await bk.save();

      const User = getUserModel();
      const user = await User.findById(bk.user_id);
      if (user && user.role !== 'admin') {
        user.rating = Math.max(0, (user.rating || 5.0) - 0.5);
        if (user.rating < 3.0) user.isBlocked = true;
        await user.save();
      }
    }

    // b) Complete if status = in_use AND time > endTime
    const inUseBookings = await Booking.find({
      status: 'in_use',
      endTime: { $lt: now }
    });

    for (const bk of inUseBookings) {
      bk.status = 'completed';
      await bk.save();

      const User = getUserModel();
      const user = await User.findById(bk.user_id);
      if (user && user.role !== 'admin') {
        user.rating = Math.min(5.0, (user.rating || 5.0) + 0.2);
        await user.save();
      }
    }

  } catch (err) {
    console.error("Booking Cron Error:", err);
  }
});

// 2. Service Escalation Cron (Every 1 hour)
cron.schedule('0 * * * *', async () => {
  try {
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    
    const overdueRequests = await ServiceRequest.find({
      status: { $in: ['pending', 'in_progress'] },
      created_at: { $lt: twentyFourHoursAgo }
    });

    for (const req of overdueRequests) {
      req.status = 'escalated';
      req.priority = 'High'; // elevate priority
      await req.save();
      
      console.log(`[ESCALATION] Service Request ${req._id} escalated due to timeout.`);
      // Future: send email notifying admin of escalation
    }

  } catch (err) {
    console.error("Service Escalation Cron Error:", err);
  }
});

console.log('Cron jobs initialized successfully.');
