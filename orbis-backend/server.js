const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const User = require('./models/User');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Connexion Mongoose Atlas
connectDB().then(() => {
  // ═══════════════════════════════════════════════════════
  // SEEDER DE SECOURS AUTOMATIQUE (Self-healing Admin)
  // Directive: Si aucun admin n'existe au démarrage, en créer un
  // ═══════════════════════════════════════════════════════
  seedAdminIfMissing();
});

async function seedAdminIfMissing() {
  try {
    // Supprimer l'ancien admin de test s'il existe
    await User.deleteOne({ email: 'admin@orbis-crm.com' });

    const adminExists = await User.findOne({ email: 'ethanebokinga00@gmail.com' });
    if (!adminExists) {
      const adminUser = new User({
        name: 'Ethan Bokinga (Admin)',
        email: 'ethanebokinga00@gmail.com',
        passwordHash: 'NTHBG1234@',
        authProvider: 'local',
        role: 'admin',
        isActive: true
      });
      await adminUser.save();
      console.log('=== ORBIS SEEDER === ✓ Compte Admin créé : ethanebokinga00@gmail.com / NTHBG1234@');
    } else {
      console.log('=== ORBIS SEEDER === ✓ Admin existant détecté (ethanebokinga00@gmail.com).');
    }
  } catch (err) {
    console.error('=== ORBIS SEEDER === ✗ Erreur lors du seeding admin :', err.message);
  }
}

// Points d'ancrage API
app.use('/api/auth', authRoutes);
const crmRoutes = require('./routes/crmRoutes');
app.use('/api/crm', crmRoutes);

app.get('/health', (req, res) => res.json({ status: 'API Orbis En Ligne', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`=== ORBIS SERVER === Actif sur le port ${PORT}`));
