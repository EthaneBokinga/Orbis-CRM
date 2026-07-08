const Activity = require('../models/Activity');
const Deal     = require('../models/Deal');

// === GET /activities/:dealId — Timeline chronologique d'un deal ===
exports.getActivitiesByDeal = async (req, res) => {
  try {
    const { dealId } = req.params;

    // Vérifier que le deal appartient bien à l'utilisateur (ou qu'il est admin)
    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ error: "Deal introuvable." });

    if (req.user.role !== 'admin' && deal.ownedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Accès interdit à ce deal." });
    }

    const activities = await Activity.find({ dealId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(activities);
  } catch (err) {
    console.error("Erreur récupération activités :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// === POST /activities — Enregistrer une nouvelle interaction ===
exports.createActivity = async (req, res) => {
  try {
    const { title, type, description, dealId, dueDate } = req.body;

    if (!title || !type || !dealId) {
      return res.status(400).json({ error: "Champs requis : title, type, dealId." });
    }

    // Vérifier que le deal appartient bien à l'utilisateur
    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ error: "Deal introuvable." });

    if (req.user.role !== 'admin' && deal.ownedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Accès interdit à ce deal." });
    }

    const activity = new Activity({
      title:      title.trim(),
      type,
      description: description?.trim() || '',
      dealId,
      assignedTo: req.user.id,
      dueDate:    dueDate || null
    });

    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    console.error("Erreur création activité :", err);
    res.status(500).json({ error: "Erreur serveur lors de la création de l'activité." });
  }
};
