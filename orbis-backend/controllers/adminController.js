const mongoose = require('mongoose');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Interaction = require('../models/Interaction');

// === 1. STATISTIQUES GLOBALES (vue Direction) ===
exports.getAdminStats = async (req, res) => {
  try {
    const allDeals = await Deal.find({});

    const totalPipeline = allDeals
      .filter(d => d.stage !== 'perdu')
      .reduce((sum, d) => sum + d.amount, 0);

    const activeDealsCount = allDeals.filter(d => !['gagné', 'perdu'].includes(d.stage)).length;

    const wonDeals = allDeals.filter(d => d.stage === 'gagné').length;
    const closedDeals = allDeals.filter(d => ['gagné', 'perdu'].includes(d.stage)).length;
    const winRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0;

    res.json({ totalPipeline, activeDealsCount, winRate });
  } catch (err) {
    res.status(500).json({ error: "Erreur calcul statistiques admin." });
  }
};

// === 2. LISTE DES COMMERCIAUX AVEC NB DE DEALS ===
exports.getCommercials = async (req, res) => {
  try {
    const commercials = await User.find({ role: 'commercial', isActive: true }).select('name email role');

    // Agrégation du nombre de deals par commercial
    const dealCounts = await Deal.aggregate([
      { $group: { _id: '$ownedBy', dealCount: { $sum: 1 } } }
    ]);

    const countMap = {};
    dealCounts.forEach(dc => {
      countMap[dc._id.toString()] = dc.dealCount;
    });

    const result = commercials.map(c => ({
      _id: c._id,
      name: c.name,
      email: c.email,
      role: c.role,
      dealCount: countMap[c._id.toString()] || 0
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération commerciaux." });
  }
};

// === 3. TOUS LES DEALS (vue globale Admin) ===
exports.getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.find({})
      .populate('contact', 'firstName lastName company')
      .populate('ownedBy', 'name email')
      .sort({ createdAt: -1 });

    // Normalise le champ pour le front (assignedTo = ownedBy)
    const result = deals.map(d => ({
      _id: d._id,
      title: d.title,
      amount: d.amount,
      stage: d.stage,
      probability: d.probability,
      company: d.contact?.company || '—',
      contact: d.contact,
      assignedTo: d.ownedBy
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération deals globaux." });
  }
};

// === 4. RÉATTRIBUTION D'UN DEAL À UN AUTRE COMMERCIAL ===
exports.reassignDeal = async (req, res) => {
  try {
    const { newCommercialId } = req.body;
    const deal = await Deal.findById(req.params.id);

    if (!deal) return res.status(404).json({ error: "Deal introuvable." });

    const newCommercial = await User.findOne({ _id: newCommercialId, role: 'commercial', isActive: true });
    if (!newCommercial) return res.status(404).json({ error: "Commercial cible introuvable ou inactif." });

    deal.ownedBy = newCommercialId;
    await deal.save();

    res.json({ message: `Deal réattribué à ${newCommercial.name} avec succès.`, deal });
  } catch (err) {
    res.status(500).json({ error: "Erreur réattribution." });
  }
};
