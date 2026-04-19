const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const reportSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  timestamp: { type: Number, default: () => Math.floor(Date.now() / 1000) }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  userId: { type: String, ref: 'User' },
  user_id: { type: String, required: true }, // Backward compatibility
  facility: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  time_slot: { type: String, required: true },
  status: { 
    type: String, 
    default: 'booked', 
    enum: ['booked', 'under_review', 'in_use', 'cancelled', 'completed'] 
  },
  reports: [reportSchema],
  checkInTime: { type: Date, default: null },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) }
});

module.exports = mongoose.model('Booking', bookingSchema);
