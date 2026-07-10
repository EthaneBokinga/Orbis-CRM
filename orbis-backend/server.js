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

// Routes Notifications
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

// Routes Messagerie
const messageRoutes = require('./routes/messageRoutes');
app.use('/api/messages', messageRoutes);

// Routes Rappels
const reminderRoutes = require('./routes/reminderRoutes');
app.use('/api/reminders', reminderRoutes);

// Routes Calendrier
const eventRoutes = require('./routes/eventRoutes');
app.use('/api/events', eventRoutes);

// Routes Factures
const invoiceRoutes = require('./routes/invoiceRoutes');
app.use('/api/invoices', invoiceRoutes);

// Routes Recherche Globale
const searchRoutes = require('./routes/searchRoutes');
app.use('/api/search', searchRoutes);

// WebSocket - Configuration Socket.io pour les notifications temps réel
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(o => origin.startsWith(o))) {
        callback(null, true);
      } else {
        callback(new Error('Bloqué par CORS WebSocket'));
      }
    },
    credentials: true
  }
});

// Stockage des connexions utilisateur pour les notifications ciblées
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('[WS] Nouvelle connexion:', socket.id);

  // L'utilisateur s'authentifie via un événement 'auth'
  socket.on('auth', (userId) => {
    // Déconnecter l'ancien socket s'il existe
    if (userSockets.has(userId)) {
      const oldSocket = userSockets.get(userId);
      if (oldSocket !== socket.id) {
        // Garder seulement le plus récent
      }
    }
    // Si c'est une nouvelle connexion (pas un reconnect), prévenir les autres
    const isNewConnection = !userSockets.has(userId) || userSockets.get(userId) !== socket.id;
    
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    console.log('[WS] Utilisateur authentifié:', userId, '-> Socket:', socket.id);

    // Envoyer le nombre de messages non lus
    const Message = require('./models/Message');
    Message.countDocuments({ recipient: userId, read: false }).then(count => {
      io.to(socket.id).emit('unread_messages_count', count);
    }).catch(() => {});

    // Diffuser la liste des utilisateurs en ligne à tout le monde
    const onlineUsers = Array.from(userSockets.keys());
    io.emit('users_online', onlineUsers);
  });

  // === Événements de messagerie temps réel ===
  socket.on('send_message', async (data) => {
    try {
      const { recipientId, content } = data;
      if (!socket.userId || !recipientId || !content) return;

      const Message = require('./models/Message');
      const conversationId = [socket.userId, recipientId].sort().join('_');

      const message = await Message.create({
        sender: socket.userId,
        recipient: recipientId,
        content: content.trim(),
        conversationId
      });

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'name email avatarUrl')
        .populate('recipient', 'name email avatarUrl')
        .lean();

      // Envoyer au destinataire
      const recipientSocketId = userSockets.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_message', populatedMessage);
        // Mettre à jour le compteur de messages non lus
        Message.countDocuments({ recipient: recipientId, read: false }).then(count => {
          io.to(recipientSocketId).emit('unread_messages_count', count);
        }).catch(() => {});
      }

      // Accuser réception à l'expéditeur
      io.to(socket.id).emit('message_sent', populatedMessage);

    } catch (err) {
      console.error('[WS] Erreur envoi message:', err.message);
      io.to(socket.id).emit('message_error', { error: 'Erreur envoi message' });
    }
  });

  // === Événement de frappe (typing indicator) ===
  socket.on('typing', (data) => {
    if (!socket.userId || !data.recipientId) return;
    const recipientSocketId = userSockets.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', { userId: socket.userId, isTyping: data.isTyping });
    }
  });

  socket.on('disconnect', () => {
    console.log('[WS] Déconnexion:', socket.id);
    if (socket.userId && userSockets.get(socket.userId) === socket.id) {
      userSockets.delete(socket.userId);
      // Diffuser la mise à jour des utilisateurs en ligne
      const onlineUsers = Array.from(userSockets.keys());
      io.emit('users_online', onlineUsers);
    }
  });
});

// Service planifié : Vérification des rappels toutes les minutes
const reminderController = require('./controllers/reminderController');
setInterval(() => {
  reminderController.checkAndNotify(io, userSockets).catch(() => {});
}, 60 * 1000);

// Rendre io et userSockets accessibles globalement
app.set('io', io);
app.set('userSockets', userSockets);

app.get('/health', (req, res) => res.json({ status: 'API Orbis En Ligne', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`=== ORBIS SERVER === Actif sur le port ${PORT}`));

module.exports = server; // Export pour les tests
