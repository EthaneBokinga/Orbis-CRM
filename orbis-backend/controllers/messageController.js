const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

// === GET /messages/conversations — Liste des conversations de l'utilisateur ===
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Trouver tous les messages où l'utilisateur est sender ou recipient
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { recipient: new mongoose.Types.ObjectId(userId) }]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$recipient', new mongoose.Types.ObjectId(userId)] }, { $eq: ['$read', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    // Pour chaque conversation, déterminer l'autre participant
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = conv.lastMessage;
        const otherUserId = lastMsg.sender.toString() === userId 
          ? lastMsg.recipient 
          : lastMsg.sender;
        
        let otherUser = null;
        try {
          otherUser = await User.findById(otherUserId).select('name email avatarUrl role').lean();
        } catch {}
        
        return {
          conversationId: conv._id,
          otherUser: otherUser || { name: 'Utilisateur inconnu', _id: otherUserId },
          lastMessage: lastMsg,
          unreadCount: conv.unreadCount
        };
      })
    );

    res.json(populatedConversations);
  } catch (err) {
    console.error("Erreur récupération conversations:", err);
    res.status(500).json({ error: "Erreur récupération des conversations." });
  }
};

// === GET /messages/:userId — Messages avec un utilisateur spécifique ===
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    // Créer l'ID de conversation (trier les IDs pour être cohérent)
    const conversationId = [userId, otherUserId].sort().join('_');
    
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'name email avatarUrl')
      .populate('recipient', 'name email avatarUrl')
      .lean();
    
    const total = await Message.countDocuments({ conversationId });
    
    // Marquer les messages non lus comme lus
    if (page === 1) {
      await Message.updateMany(
        { conversationId, recipient: userId, read: false },
        { read: true, readAt: new Date() }
      );
    }
    
    res.json({
      messages: messages.reverse(),
      total,
      page,
      pages: Math.ceil(total / limit),
      conversationId
    });
  } catch (err) {
    console.error("Erreur récupération messages:", err);
    res.status(500).json({ error: "Erreur récupération des messages." });
  }
};

// === POST /messages — Envoyer un message ===
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.user.id;
    
    if (!recipientId || !content || !content.trim()) {
      return res.status(400).json({ error: "Destinataire et contenu requis." });
    }
    
    // Vérifier que le destinataire existe
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: "Destinataire introuvable." });
    }
    
    // Créer l'ID de conversation
    const conversationId = [senderId, recipientId].sort().join('_');
    
    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      content: content.trim(),
      conversationId
    });
    
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email avatarUrl')
      .populate('recipient', 'name email avatarUrl')
      .lean();
    
    // Envoyer notification temps réel via WebSocket
    try {
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      if (io && userSockets) {
        const recipientSocketId = userSockets.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_message', populatedMessage);
        }
        // Émettre aussi à l'expéditeur pour synchronisation
        const senderSocketId = userSockets.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_sent', populatedMessage);
        }
      }
    } catch (wsErr) {
      console.warn('[Message] Erreur envoi WS:', wsErr.message);
    }
    
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error("Erreur envoi message:", err);
    res.status(500).json({ error: "Erreur lors de l'envoi du message." });
  }
};

// === GET /messages/unread/count — Nombre de messages non lus ===
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.id,
      read: false
    });
    res.json({ unreadMessages: count });
  } catch (err) {
    res.status(500).json({ error: "Erreur comptage messages." });
  }
};

// === GET /messages/search/users — Rechercher des utilisateurs pour le chat ===
exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const users = await User.find({
      _id: { $ne: req.user.id },
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name email avatarUrl role')
    .limit(20)
    .lean();
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Erreur recherche utilisateurs." });
  }
};

// === GET /messages/users/all — Liste de tous les utilisateurs actifs ===
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user.id },
      isActive: true
    })
    .select('name email avatarUrl role')
    .sort({ name: 1 })
    .lean();
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération utilisateurs." });
  }
};

