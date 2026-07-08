const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('=== ORBIS SYSTEM === ✓ Connecté avec succès au Cloud MongoDB Atlas');
  } catch (err) {
    console.error('=== ORBIS SYSTEM === ✗ Échec de connexion MongoDB Atlas :', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
