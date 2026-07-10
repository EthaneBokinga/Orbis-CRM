const Event = require('../models/Event');

// === GET : Récupérer les événements (filtrés par utilisateur ou admin) ===
exports.getEvents = async (req, res) => {
  try {
    const { start, end, userId } = req.query;
    const filter = {};

    // Filtre par date (vue calendrier)
    if (start && end) {
      filter.startDate = { $lte: new Date(end) };
      filter.endDate = { $gte: new Date(start) };
    }

    // L'admin voit tout, les autres voient leurs événements + ceux qui leur sont assignés
    if (req.user.role !== 'admin') {
      filter.$or = [
        { createdBy: req.user.id },
        { assignedTo: req.user.id }
      ];
    } else if (userId) {
      // L'admin peut filtrer par utilisateur
      filter.$or = [
        { createdBy: userId },
        { assignedTo: userId }
      ];
    }

    const events = await Event.find(filter)
      .populate('createdBy', 'name email avatarUrl')
      .populate('assignedTo', 'name email avatarUrl')
      .populate('relatedTo.contactId', 'firstName lastName company')
      .populate('relatedTo.dealId', 'title amount stage')
      .sort({ startDate: 1 });

    // Formatter pour FullCalendar / react-big-calendar
    const formatted = events.map(e => ({
      _id: e._id,
      title: e.title,
      description: e.description,
      start: e.startDate,
      end: e.endDate,
      allDay: e.allDay,
      type: e.type,
      color: e.color,
      backgroundColor: e.color,
      borderColor: e.color,
      createdBy: e.createdBy,
      assignedTo: e.assignedTo,
      relatedTo: e.relatedTo,
      completed: e.completed,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Erreur récupération événements :", err);
    res.status(500).json({ error: "Erreur lors du chargement du calendrier." });
  }
};

// === POST : Créer un événement ===
exports.createEvent = async (req, res) => {
  try {
    const { title, description, startDate, endDate, allDay, type, color, assignedTo, relatedTo } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: "Titre, date de début et date de fin requis." });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description?.trim() || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay: allDay || false,
      type: type || 'rdv',
      color: color || '#0d9488',
      createdBy: req.user.id,
      assignedTo: assignedTo || req.user.id,
      relatedTo: relatedTo || {}
    });

    const populated = await Event.findById(event._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('assignedTo', 'name email avatarUrl')
      .populate('relatedTo.contactId', 'firstName lastName company')
      .populate('relatedTo.dealId', 'title amount stage');

    res.status(201).json(populated);
  } catch (err) {
    console.error("Erreur création événement :", err);
    res.status(500).json({ error: "Erreur lors de la création de l'événement." });
  }
};

// === PUT : Modifier un événement ===
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Événement introuvable." });

    // Sécurité : seul le créateur ou un admin peut modifier
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Vous ne pouvez modifier que vos propres événements." });
    }

    const updates = {};
    const allowedFields = ['title', 'description', 'startDate', 'endDate', 'allDay', 'type', 'color', 'assignedTo', 'relatedTo', 'completed'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Event.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('createdBy', 'name email avatarUrl')
      .populate('assignedTo', 'name email avatarUrl')
      .populate('relatedTo.contactId', 'firstName lastName company')
      .populate('relatedTo.dealId', 'title amount stage');

    res.json(updated);
  } catch (err) {
    console.error("Erreur modification événement :", err);
    res.status(500).json({ error: "Erreur lors de la modification de l'événement." });
  }
};

// === DELETE : Supprimer un événement ===
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Événement introuvable." });

    // Sécurité : seul le créateur ou un admin peut supprimer
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Vous ne pouvez supprimer que vos propres événements." });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Événement supprimé avec succès." });
  } catch (err) {
    console.error("Erreur suppression événement :", err);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
};
