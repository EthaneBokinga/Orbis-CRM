const mongoose = require('mongoose');

// Singleton document — toujours un seul enregistrement via upsert {}
const SettingsSchema = new mongoose.Schema({
  monthlyGoal: { type: Number, default: 5000000 } // 5 000 000 FCFA par défaut
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
