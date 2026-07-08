const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  type: { type: String, enum: ['appel', 'email', 'rdv'], required: true },
  notes: { type: String, required: true },
  nextActionDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

interactionSchema.index({ contact: 1, createdAt: -1 });
interactionSchema.index({ nextActionDate: 1 });

module.exports = mongoose.model('Interaction', interactionSchema);
