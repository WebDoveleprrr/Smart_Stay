const cron = require('node-cron');
const mongoose = require('mongoose');
const { sendEmail, emailTemplate } = require('./mailer');
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
        user.noShows = (user.noShows || 0) + 1;
        if (user.rating < 3.0) user.isBlocked = true;
        await user.save();
        await sendEmail(user.email, "Booking Cancelled", emailTemplate("Booking Auto-Cancelled", "#dc2626", `Hello ${user.name},<br><br>Your booking was cancelled due to no-show or reports.<br>Rating decreased by 0.5. New rating: ${user.rating.toFixed(1)}/5.0`));
      }
    }

    // Admin visually verifies and clicks "Used" now. Auto-complete disabled.

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
      await sendEmail(process.env.ADMIN_EMAIL || "admin@smartstay.com", "Request Escalated", emailTemplate("Service Ticket Escalated", "#dc2626", `Attention Admin,<br><br>Service request <b>${req._id}</b> has been escalated due to inaction over 24 hours.`));
    }

  } catch (err) {
    console.error("Service Escalation Cron Error:", err);
  }
});

console.log('Cron jobs initialized successfully.');
