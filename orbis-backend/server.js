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
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://orbis-crm-five.vercel.app',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Bloqué par la sécurité CORS Orbis'));
    }
  },
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

    // ▸ Admin 1 : Ethan Bokinga
    let a1 = await User.findOne({ email: 'ethanebokinga00@gmail.com' });
    if (!a1) {
      a1 = new User({
        name: 'Ethan Bokinga (Admin)',
        email: 'ethanebokinga00@gmail.com',
        passwordHash: 'NTHBG1234@',
        authProvider: 'local',
        role: 'admin',
        isActive: true
      });
      await a1.save();
      console.log('=== ORBIS SEEDER === ✓ Admin créé : ethanebokinga00@gmail.com');
    } else {
      if (!a1.isActive) {
        a1.isActive = true;
        await a1.save();
        console.log('=== ORBIS SEEDER === 🔄 Admin réactivé : ethanebokinga00@gmail.com');
      } else {
        console.log('=== ORBIS SEEDER === ✓ Admin OK : ethanebokinga00@gmail.com');
      }
    }

    // ▸ Admin 2 : Soise Gallouo
    let a2 = await User.findOne({ email: 'soisegallouo@gmail.com' });
    if (!a2) {
      a2 = new User({
        name: 'Soise Gallouo (Admin)',
        email: 'soisegallouo@gmail.com',
        passwordHash: 'NTHBG1234@',
        authProvider: 'local',
        role: 'admin',
        isActive: true
      });
      await a2.save();
      console.log('=== ORBIS SEEDER === ✓ Admin créé : soisegallouo@gmail.com');
    } else {
      if (!a2.isActive) {
        a2.isActive = true;
        await a2.save();
        console.log('=== ORBIS SEEDER === 🔄 Admin réactivé : soisegallouo@gmail.com');
      } else {
        console.log('=== ORBIS SEEDER === ✓ Admin OK : soisegallouo@gmail.com');
      }
    }
  } catch (err) {
    console.error('=== ORBIS SEEDER === ✗ Erreur :', err.message);
  }
}

// Points d'ancrage API
app.use('/api/auth', authRoutes);
const crmRoutes = require('./routes/crmRoutes');
app.use('/api/crm', crmRoutes);

app.get('/health', (req, res) => res.json({ status: 'API Orbis En Ligne', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`=== ORBIS SERVER === Actif sur le port ${PORT}`));
