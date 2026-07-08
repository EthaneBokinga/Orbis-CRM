const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  type:        { type: String, enum: ['call', 'email', 'meeting', 'task'], required: true },
  description: { type: String, trim: true },
  status:      { type: String, enum: ['pending', 'completed'], default: 'completed' },
  dealId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', required: true },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate:     { type: Date }
}, { timestamps: true });

// Index composé pour maximiser la vitesse de lecture de la Timeline chronologique
ActivitySchema.index({ dealId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
