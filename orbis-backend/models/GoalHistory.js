const mongoose = require('mongoose');

const GoalHistorySchema = new mongoose.Schema({
  period: { type: String, enum: ['weekly', 'monthly', 'yearly'], required: true },
  oldGoal: { type: Number, default: 0 },
  newGoal: { type: Number, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changedByName: { type: String, required: true },
  note: { type: String, default: '' }
}, { timestamps: true });

GoalHistorySchema.index({ period: 1, createdAt: -1 });
GoalHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('GoalHistory', GoalHistorySchema);
