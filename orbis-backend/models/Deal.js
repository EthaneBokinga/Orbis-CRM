const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  stage: { type: String, enum: ['découverte', 'proposition', 'négociation', 'gagné', 'perdu'], default: 'découverte' },
  probability: { type: Number, min: 0, max: 100, default: 10 },
  expectedCloseDate: { type: Date },
  ownedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }
}, { timestamps: true });

dealSchema.index({ ownedBy: 1, stage: 1 });

module.exports = mongoose.model('Deal', dealSchema);
