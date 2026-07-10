const Notification = require('../models/Notification');

// === GET /notifications — Récupérer les notifications de l'utilisateur ===
exports.getNotifications = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = { recipientId: req.user.id };
    if (req.query.unread === 'true') {
      filter.read = false;
    }
    
    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter)
    ]);
    
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user.id,
      read: false
    });
    
    res.json({ 
      notifications, 
      total, 
      page, 
      pages: Math.ceil(total / limit),
      unreadCount
    });
  } catch (err) {
    console.error("Erreur récupération notifications:", err);
    res.status(500).json({ error: "Erreur récupération notifications." });
  }
};

// === PUT /notifications/:id/read — Marquer une notification comme lue ===
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: "Notification introuvable." });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour notification." });
  }
};

// === PUT /notifications/read-all — Marquer toutes les notifications comme lues ===
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, read: false },
      { read: true }
    );
    res.json({ message: "Toutes les notifications marquées comme lues." });
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour notifications." });
  }
};

// === Helper pour créer une notification (appelé depuis d'autres contrôleurs) ===
exports.createNotification = async ({ recipientId, type, title, message, link, metadata }) => {
  try {
    const notification = await Notification.create({
      recipientId, type, title, message, link, metadata
    });
    return notification;
  } catch (err) {
    console.error("Erreur création notification:", err.message);
    return null;
  }
};
