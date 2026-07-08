const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  email: { type: String, trim: true, lowercase: true },
  company: { type: String, trim: true },
  status: { type: String, enum: ['à_contacter', 'en_cours', 'gagné', 'perdu'], default: 'à_contacter' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

contactSchema.index({ assignedTo: 1, status: 1 });
contactSchema.index({ email: 1 });

module.exports = mongoose.model('Contact', contactSchema);
