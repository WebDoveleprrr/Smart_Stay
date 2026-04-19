const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const serviceSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  userId: { type: String, ref: 'User' },
  user_id: { type: String, required: true }, // Backward compatibility
  title: { type: String, default: 'Service Request' },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  block: { type: String, default: '' }, // Backward compatibility
  room: { type: String, default: '' },  // Backward compatibility
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  priority: { type: String, default: 'Normal' },
  status: { type: String, default: 'pending', enum: ['pending', 'in_progress', 'completed', 'verified', 'escalated'] },
  assignee_id: { type: String, ref: 'User', default: null },
  rating: { type: Number, default: null },
  resolutionTimeMinutes: { type: Number, default: null },
  recurring_issue: { type: Boolean, default: false },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
  updated_at: { type: Number, default: () => Math.floor(Date.now() / 1000) }
});

module.exports = mongoose.model('ServiceRequest', serviceSchema);
