const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actorId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorName:         { type: String, required: true },
  actionDescription: { type: String, required: true },
  severity:          { type: String, enum: ['info', 'warning', 'high'], default: 'info' }
}, { timestamps: true });

// Index pour lecture rapide du journal (les plus récents en premier)
AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
