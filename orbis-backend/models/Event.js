const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  allDay: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ['rdv', 'appel', 'email', 'reunion', 'tache', 'autre'],
    default: 'rdv'
  },
  color: { type: String, default: '#0d9488' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedTo: {
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' }
  },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

EventSchema.index({ startDate: 1, endDate: 1 });
EventSchema.index({ createdBy: 1, startDate: -1 });
EventSchema.index({ assignedTo: 1, startDate: -1 });

module.exports = mongoose.model('Event', EventSchema);
