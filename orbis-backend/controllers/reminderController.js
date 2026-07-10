const Reminder = require('../models/Reminder');
const Interaction = require('../models/Interaction');
const Contact = require('../models/Contact');
const User = require('../models/User');
const Notification = require('../models/Notification');

// === POST /reminders — Créer un rappel ===
exports.createReminder = async (req, res) => {
  try {
    const { type, title, description, remindAt, remindBeforeMinutes, contactId, dealId, interactionId } = req.body;
    
    if (!type || !title || !remindAt) {
      return res.status(400).json({ error: "Type, titre et date de rappel requis." });
    }

    const reminder = await Reminder.create({
      userId: req.user.id,
      type,
      title,
      description,
      remindAt: new Date(remindAt),
      remindBeforeMinutes: remindBeforeMinutes || 30,
      relatedTo: {
        contactId: contactId || undefined,
        dealId: dealId || undefined,
        interactionId: interactionId || undefined
      }
    });

    res.status(201).json(reminder);
  } catch (err) {
    console.error("Erreur création rappel:", err);
    res.status(500).json({ error: "Erreur lors de la création du rappel." });
  }
};

// === GET /reminders — Liste des rappels de l'utilisateur ===
exports.getReminders = async (req, res) => {
  try {
    const { upcoming, completed } = req.query;
    const filter = { userId: req.user.id };
    
    if (upcoming === 'true') {
      filter.remindAt = { $gte: new Date() };
      filter.completed = false;
    } else if (completed === 'true') {
      filter.completed = true;
    }

    const reminders = await Reminder.find(filter)
      .sort({ remindAt: 1 })
      .populate('relatedTo.contactId', 'firstName lastName company phone')
      .lean();

    res.json(reminders);
  } catch (err) {
    console.error("Erreur récupération rappels:", err);
    res.status(500).json({ error: "Erreur récupération des rappels." });
  }
};

// === PUT /reminders/:id/complete — Marquer un rappel comme terminé ===
exports.completeReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { completed: true, completedAt: new Date() },
      { new: true }
    );
    if (!reminder) {
      return res.status(404).json({ error: "Rappel introuvable." });
    }
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour rappel." });
  }
};

// === PUT /reminders/:id — Modifier un rappel ===
exports.updateReminder = async (req, res) => {
  try {
    const { type, title, description, remindAt, remindBeforeMinutes } = req.body;
    const update = {};
    if (type) update.type = type;
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
    if (remindAt) update.remindAt = new Date(remindAt);
    if (remindBeforeMinutes) update.remindBeforeMinutes = remindBeforeMinutes;
    update.notified = false; // Réinitialiser pour renvoyer la notification

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true }
    );
    if (!reminder) {
      return res.status(404).json({ error: "Rappel introuvable." });
    }
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour rappel." });
  }
};

// === DELETE /reminders/:id — Supprimer un rappel ===
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!reminder) {
      return res.status(404).json({ error: "Rappel introuvable." });
    }
    res.json({ message: "Rappel supprimé." });
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression rappel." });
  }
};

// === Service planifié : Vérifier les rappels à notifier ===
exports.checkAndNotify = async (io, userSockets) => {
  try {
    const now = new Date();
    
    // Rappels dans les 30 prochaines minutes qui n'ont pas encore été notifiés
    const remindersDue = await Reminder.find({
      notified: false,
      completed: false,
      remindAt: { $lte: new Date(now.getTime() + 30 * 60 * 1000) }
    }).populate('relatedTo.contactId', 'firstName lastName company').lean();

    for (const reminder of remindersDue) {
      let message = `🔔 Rappel : ${reminder.title}`;
      if (reminder.description) message += ` - ${reminder.description}`;
      if (reminder.relatedTo?.contactId) {
        const c = reminder.relatedTo.contactId;
        message += ` (${c.firstName} ${c.lastName}${c.company ? ` - ${c.company}` : ''})`;
      }

      // Créer une notification
      try {
        await Notification.create({
          recipientId: reminder.userId,
          type: 'warning',
          title: `⏰ Rappel : ${reminder.title}`,
          message,
          link: '/dashboard',
          metadata: { reminderId: reminder._id, type: reminder.type }
        });
      } catch {}

      // Envoyer temps réel
      if (io && userSockets) {
        const socketId = userSockets.get(reminder.userId.toString());
        if (socketId) {
          io.to(socketId).emit('notification', {
            type: 'warning',
            title: `⏰ ${reminder.title}`,
            message
          });
        }
      }

      // Marquer comme notifié
      await Reminder.findByIdAndUpdate(reminder._id, { notified: true, sentAt: now });
    }

    // Vérifier les relances en retard (interactions avec nextActionDate dépassée)
    const lateInteractions = await Interaction.find({
      nextActionDate: { $lte: now, $ne: null },
      createdBy: { $exists: true }
    })
    .populate('contact', 'firstName lastName company')
    .populate('createdBy', '_id')
    .lean();

    const lateNotifs = new Set();
    for (const interaction of lateInteractions) {
      if (!interaction.createdBy?._id) continue;
      const userId = interaction.createdBy._id.toString();
      if (lateNotifs.has(userId)) continue;

      // Vérifier si on a déjà notifié récemment
      const recentNotif = await Notification.findOne({
        recipientId: userId,
        'metadata.interactionId': interaction._id.toString(),
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      });
      if (recentNotif) continue;

      const contactName = interaction.contact 
        ? `${interaction.contact.firstName} ${interaction.contact.lastName}`
        : 'un client';
      
      const msg = `⚠️ Relance en retard pour ${contactName} - Prévue le ${new Date(interaction.nextActionDate).toLocaleDateString('fr-FR')}`;
      
      try {
        await Notification.create({
          recipientId: userId,
          type: 'warning',
          title: '🔴 Relance en retard',
          message: msg,
          metadata: { interactionId: interaction._id.toString() }
        });
      } catch {}

      if (io && userSockets) {
        const socketId = userSockets.get(userId);
        if (socketId) {
          io.to(socketId).emit('notification', {
            type: 'warning',
            title: '🔴 Relance en retard',
            message: msg
          });
        }
      }

      lateNotifs.add(userId);
    }

    return { remindersNotified: remindersDue.length, lateFollowupsNotified: lateNotifs.size };
  } catch (err) {
    console.error('[ReminderChecker] Erreur:', err.message);
    return { error: err.message };
  }
};
