const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Interaction = require('../models/Interaction');
const Deal = require('../models/Deal');

// === 1. CONTROLLER CONTACTS (Sécurité RBAC intégrée) ===
exports.getContacts = async (req, res) => {
  try {
    // Un commercial ne récupère que ses contacts assignés. L'admin voit tout.
    const query = req.user.role === 'admin' ? {} : { assignedTo: req.user.id };
    const contacts = await Contact.find(query).populate('assignedTo', 'name email').sort({ lastName: 1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des contacts." });
  }
};

exports.createContact = async (req, res) => {
  try {
    const newContact = new Contact({
      ...req.body,
      assignedTo: req.user.role === 'admin' ? (req.body.assignedTo || req.user.id) : req.user.id,
      createdBy: req.user.id
    });
    await newContact.save();
    res.status(201).json(newContact);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la création du contact." });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: "Contact introuvable." });

    // Sécurité : Un commercial ne peut modifier que ses contacts
    if (req.user.role !== 'admin' && contact.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ error: "Accès refusé à ce contact." });
    }

    const updatedContact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedContact);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour." });
  }
};

// === 2. CONTROLLER INTERACTIONS (Historique & Suivi) ===
exports.getInteractionsByContact = async (req, res) => {
  try {
    const interactions = await Interaction.find({ contact: req.params.contactId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(interactions);
  } catch (err) {
    res.status(500).json({ error: "Erreur interactions." });
  }
};

exports.createInteraction = async (req, res) => {
  try {
    // Nettoyage anti-XSS basique pour le champ notes
    const sanitizedNotes = req.body.notes ? req.body.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
    
    const newInteraction = new Interaction({
      ...req.body,
      notes: sanitizedNotes,
      createdBy: req.user.id
    });
    await newInteraction.save();
    res.status(201).json(newInteraction);
  } catch (err) {
    res.status(500).json({ error: "Erreur interaction." });
  }
};

// === 3. CONTROLLER DEALS (Pipeline Kanban) ===
exports.getDeals = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { ownedBy: req.user.id };
    const deals = await Deal.find(query).populate('contact', 'firstName lastName company');
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: "Erreur deals." });
  }
};

exports.createDeal = async (req, res) => {
  try {
    const newDeal = new Deal({
      ...req.body,
      ownedBy: req.user.role === 'admin' ? (req.body.ownedBy || req.user.id) : req.user.id
    });
    await newDeal.save();
    res.status(201).json(newDeal);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la création du deal." });
  }
};

exports.updateDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal introuvable." });

    if (req.user.role !== 'admin' && deal.ownedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Accès refusé à ce deal." });
    }

    const updatedDeal = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedDeal);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du deal." });
  }
};

exports.updateDealStage = async (req, res) => {
  try {
    const { stage } = req.body;
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal introuvable." });

    if (req.user.role !== 'admin' && deal.ownedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Modification interdite." });
    }

    deal.stage = stage;
    await deal.save();
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: "Erreur pipeline." });
  }
};

// === 4. DASHBOARD ANALYTICS (Agrégations Mongoose Complexes) ===
exports.getDashboardStats = async (req, res) => {
  try {
    const matchQuery = req.user.role === 'admin' ? {} : { ownedBy: new mongoose.Types.ObjectId(req.user.id) };

    // Agrégation 1 : Calcul du Chiffre d'Affaires Prévisionnel et Cumulé par étape
    const pipelineStats = await Deal.aggregate([
      { $match: matchQuery },
      { $group: {
          _id: "$stage",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Agrégation 2 : Calcul des relances en retard (Interactions planifiées dans le passé)
    const queryInteractions = req.user.role === 'admin' ? {} : { createdBy: req.user.id };
    const overdueReminders = await Interaction.countDocuments({
      ...queryInteractions,
      nextActionDate: { $lt: new Date() }
    });

    res.json({
      pipeline: pipelineStats,
      overdueReminders
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors du calcul des statistiques analytiques." });
  }
};
