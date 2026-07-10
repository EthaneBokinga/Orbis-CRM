const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['appel', 'rdv', 'email', 'relance', 'tache', 'autre'], 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  remindAt: { type: Date, required: true },
  remindBeforeMinutes: { type: Number, default: 30 },
  notified: { type: Boolean, default: false },
  sentAt: { type: Date },
  relatedTo: {
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    interactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interaction' }
  },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date }
}, { timestamps: true });

ReminderSchema.index({ userId: 1, remindAt: 1, notified: 1 });
ReminderSchema.index({ remindAt: 1, notified: 1 });

module.exports = mongoose.model('Reminder', ReminderSchema);
