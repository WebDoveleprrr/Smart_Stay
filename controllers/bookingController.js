const Booking = require('../models/Booking');
const mongoose = require('mongoose');

// Helper to get User model since it's still attached to mongoose in server.js
const getUserModel = () => mongoose.model('User');

// Helper to parse "6:00–7:00 AM" strings
// Replaces en-dash with hyphen just in case
const parseTimeSlot = (dateStr, slotStr) => {
  try {
    const cleanSlot = slotStr.replace('–', '-');
    const [times, period] = cleanSlot.split(' ');
    const [startRaw, endRaw] = times.split('-');
    
    let startHour = parseInt(startRaw.split(':')[0] || startRaw);
    let startMin = startRaw.includes(':') ? parseInt(startRaw.split(':')[1]) : 0;
    
    let endHour = parseInt(endRaw.split(':')[0] || endRaw);
    let endMin = endRaw.includes(':') ? parseInt(endRaw.split(':')[1]) : 0;

    // simplistic AM/PM logic assuming end time is in the same period or PM
    let isPM = period.toUpperCase() === 'PM';
    if (isPM && startHour !== 12) startHour += 12;
    if (isPM && endHour !== 12) endHour += 12;
    if (!isPM && startHour === 12) startHour = 0;
    if (!isPM && endHour === 12) endHour = 0;

    const startDate = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
    const endDate = new Date(`${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`);
    
    return { startTime: startDate, endTime: endDate };
  } catch (e) {
    // fallback
    const d = new Date(dateStr);
    return { startTime: d, endTime: new Date(d.getTime() + 60*60*1000) };
  }
};

exports.createBooking = async (req, res) => {
  const { facility, date, time_slot } = req.body;
  if (!facility || !date || !time_slot) return res.status(400).json({ error: 'All fields required.' });

  const today = new Date().toISOString().split('T')[0];
  if (date < today) return res.status(400).json({ error: 'Cannot book in the past.' });

  try {
    const User = getUserModel();
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.rating === undefined) { user.rating = 5.0; user.totalBookings = 0; user.cancelledBookings = 0; user.noShows = 0; user.isBlocked = false; }
    if (user.rating < 3.0) return res.status(403).json({ error: 'Booking disabled due to low reliability score' });

    const existing = await Booking.findOne({ facility, date, time_slot, status: { $in: ['booked', 'in_use', 'under_review'] } });
    if (existing) return res.status(409).json({ error: 'This slot is already booked. Choose another time.' });

    const { startTime, endTime } = parseTimeSlot(date, time_slot);

    const booking = new Booking({
      userId: req.session.userId,
      user_id: req.session.userId,
      facility,
      date,
      time_slot,
      startTime,
      endTime,
      status: 'booked'
    });
    await booking.save();
    console.log("Booking created:", booking);

    user.totalBookings = (user.totalBookings || 0) + 1;
    await user.save();

    res.json({ success: true, message: `${facility} booked for ${date} at ${time_slot}! Confirmation sent.`, id: booking._id });
  } catch (err) { res.status(500).json({ error: 'Booking failed.' }); }
};

exports.getBookings = async (req, res) => {
  try {
    const isAdmin = req.session.userRole === 'admin';
    const User = getUserModel();
    let bookings;
    
    if (isAdmin) {
      const bks = await Booking.find().sort({ date: -1 }).lean();
      const userIds = [...new Set(bks.map(b => b.user_id))];
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const userMap = {};
      users.forEach(u => { userMap[u._id] = u; });
      bookings = bks.map(b => {
        const u = userMap[b.user_id];
        return {
          ...b,
          id: b._id,
          user_name: u?.name || '—',
          user_rating: u?.rating || 5.0,
          user_totalBookings: u?.totalBookings || 0,
          user_cancelledBookings: u?.cancelledBookings || 0,
          user_noShows: u?.noShows || 0,
          user_isBlocked: u?.isBlocked || false
        };
      });
    } else {
      const bks = await Booking.find({ user_id: req.session.userId }).sort({ date: -1 }).lean();
      bookings = bks.map(b => ({ ...b, id: b._id }));
    }
    res.json({ bookings });
  } catch (err) { res.status(500).json({ error: 'DB error.' }); }
};

exports.deleteBooking = async (req, res) => {
  try {
    const User = getUserModel();
    let booking;
    if (req.session.userRole === 'admin') {
      booking = await Booking.findById(req.params.id);
    } else {
      booking = await Booking.findOne({ _id: req.params.id, user_id: req.session.userId });
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    booking.status = 'cancelled';
    await booking.save();

    const user = await User.findById(booking.user_id);
    if (user && user.role !== 'admin') {
      user.cancelledBookings = (user.cancelledBookings || 0) + 1;
      user.rating = Math.max(0, (user.rating || 5.0) - 0.5);
      if (user.rating < 3.0) user.isBlocked = true;
      await user.save();
    }
    res.json({ success: true, message: 'Booking Cancelled' });
  } catch (err) { res.status(500).json({ error: 'Cancel failed.' }); }
};

// POST /api/bookings/report/:id
exports.reportBooking = async (req, res) => {
  try {
    const User = getUserModel();
    const reporterId = req.session.userId;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    if (booking.status === 'in_use' || booking.status === 'completed') {
      // Anti-abuse: if report is invalid
      const reporter = await User.findById(reporterId);
      if (reporter && reporter.role !== 'admin') {
        reporter.rating = Math.max(0, (reporter.rating || 5.0) - 0.2);
        await reporter.save();
      }
      return res.status(400).json({ error: 'Facility is already in use. Your rating has been decreased for false reporting.' });
    }

    if (['cancelled'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking is already cancelled.' });
    }

    // Prevent duplicate reports
    const hasReported = booking.reports.some(r => r.userId === reporterId);
    if (hasReported) return res.status(400).json({ error: 'You have already reported this booking.' });

    booking.reports.push({ userId: reporterId, timestamp: Math.floor(Date.now() / 1000) });

    if (booking.reports.length >= 2) {
      booking.status = 'cancelled';
      
      const booker = await User.findById(booking.user_id);
      if (booker && booker.role !== 'admin') {
        booker.rating = Math.max(0, (booker.rating || 5.0) - 0.5);
        if (booker.rating < 3.0) booker.isBlocked = true;
        await booker.save();
      }
    } else {
      booking.status = 'under_review';
    }

    await booking.save();
    res.json({ success: true, message: booking.status === 'cancelled' ? 'Booking cancelled due to multiple reports.' : 'Report submitted.' });

  } catch (err) { res.status(500).json({ error: 'Reporting failed.' }); }
};

// POST /api/bookings/checkin/:id
exports.checkIn = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user_id: req.session.userId });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot check-in to this booking.' });
    }

    booking.status = 'in_use';
    booking.checkInTime = new Date();
    await booking.save();

    res.json({ success: true, message: 'Checked in successfully.' });
  } catch (err) { res.status(500).json({ error: 'Check-in failed.' }); }
};

exports.getAllActiveBookings = async (req, res) => {
  try {
    console.log("Fetching all active bookings");
    const bookings = await Booking.find({ status: { $in: ['booked', 'under_review'] } }).lean();
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active bookings' });
  }
};
