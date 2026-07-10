const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Recherche d'utilisateurs
router.get('/search/users', messageController.searchUsers);

// Liste de tous les utilisateurs actifs
router.get('/users/all', messageController.getAllUsers);

// Liste des conversations
router.get('/conversations', messageController.getConversations);

// Nombre de messages non lus
router.get('/unread/count', messageController.getUnreadCount);

// Messages avec un utilisateur spécifique
router.get('/:userId', messageController.getMessages);

// Envoyer un message
router.post('/', messageController.sendMessage);

module.exports = router;
