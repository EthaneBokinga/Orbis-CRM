const mongoose = require('mongoose');

// Singleton document — toujours un seul enregistrement via upsert {}
const SettingsSchema = new mongoose.Schema({
  weeklyGoal:  { type: Number, default: 0 },
  monthlyGoal: { type: Number, default: 0 },
  yearlyGoal:  { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
