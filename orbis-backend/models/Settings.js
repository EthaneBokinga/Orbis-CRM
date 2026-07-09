const mongoose = require('mongoose');

// Singleton document — toujours un seul enregistrement via upsert {}
const SettingsSchema = new mongoose.Schema({
  weeklyGoal: { type: Number, default: 1250000 },  // 1 250 000 FCFA par défaut
  monthlyGoal: { type: Number, default: 5000000 }, // 5 000 000 FCFA par défaut
  yearlyGoal: { type: Number, default: 60000000 }  // 60 000 000 FCFA par défaut
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
