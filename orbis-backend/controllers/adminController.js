const mongoose = require('mongoose');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Interaction = require('../models/Interaction');
const AuditLog = require('../models/AuditLog');

// Helper interne — écrit un log d'audit sans bloquer la réponse
const logAudit = (actorId, actorName, actionDescription, severity = 'info') => {
  AuditLog.create({ actorId, actorName, actionDescription, severity }).catch(
    err => console.warn('[AuditLog] Écriture échouée :', err.message)
  );
};

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
    const commercials = await User.find({ role: 'commercial' }).select('name email role isActive');

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
      isActive: c.isActive !== false, // Valeur par défaut true
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

    logAudit(req.user.id, req.user.name, `Deal "${deal.title}" réattribué à ${newCommercial.name}.`, 'warning');
    res.json({ message: `Deal réattribué à ${newCommercial.name} avec succès.`, deal });
  } catch (err) {
    res.status(500).json({ error: "Erreur réattribution." });
  }
};
 
// === 5. CRÉATION D'UN DEAL DEPUIS LA CONSOLE ADMIN (POST /deals) ===
exports.createDeal = async (req, res) => {
  try {
    const { title, company, amount, assignedTo } = req.body;
    if (!title || !company || !amount || !assignedTo) {
      return res.status(400).json({ error: "Champs requis manquants." });
    }
 
    // Valider si le commercial de destination existe et est actif
    const commercial = await User.findOne({ _id: assignedTo, role: 'commercial', isActive: true });
    if (!commercial) {
      return res.status(404).json({ error: "Commercial assigné introuvable ou inactif." });
    }
 
    // Trouver ou créer automatiquement un contact d'entreprise pour l'association Mongoose obligatoire
    const Contact = require('../models/Contact');
    let contact = await Contact.findOne({ company, assignedTo });
    if (!contact) {
      contact = new Contact({
        firstName: "Contact",
        lastName: company,
        phone: "+242 06 000 00 00",
        company: company,
        assignedTo: assignedTo,
        createdBy: req.user.id
      });
      await contact.save();
    }
 
    const deal = new Deal({
      contact: contact._id,
      title: title.trim(),
      amount: Number(amount),
      stage: 'découverte',
      probability: 10,
      ownedBy: assignedTo
    });
 
    await deal.save();
    res.status(201).json(deal);
  } catch (err) {
    console.error("Erreur création deal admin :", err);
    res.status(500).json({ error: "Erreur lors de la création du deal." });
  }
};
 
// === 6. INTÉGRATION / INVITATION D'UN NOUVEAU MEMBRE D'ÉQUIPE (POST /users) ===
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Tous les champs requis." });
    }
 
    const cleanEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ error: "Cet email est déjà attribué à un autre compte." });
    }
 
    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      passwordHash: password,
      role: role || 'commercial',
      authProvider: 'local'
    });
 
    await newUser.save();
    
    // Retourner l'utilisateur sans son mot de passe ou d'autres attributs sensibles
    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      dealCount: 0
    });
  } catch (err) {
    console.error("Erreur création utilisateur admin :", err);
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur." });
  }
};
 
// === 7. SUPPRESSION / ARCHIVAGE D'UN MARCHÉ (DELETE /deals/:id) ===
exports.deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) {
      return res.status(404).json({ error: "Opportunité de vente introuvable." });
    }
    res.json({ message: "Le deal a été supprimé du marché avec succès." });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
};

// === 8. ACTIVER / SUSPENDRE UN COMPTE UTILISATEUR (PUT /users/:id/toggle-status) ===
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: "Action interdite : vous ne pouvez pas suspendre votre propre compte administrateur." });
    }

    user.isActive = !user.isActive;
    await user.save();

    const action = user.isActive ? 'réactivé' : 'suspendu';
    logAudit(req.user.id, req.user.name, `Compte de ${user.name} (${user.email}) ${action}.`, user.isActive ? 'info' : 'high');
    
    res.json({
      message: `Le compte de ${user.name} a été ${action} avec succès.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    console.error("Erreur suspension utilisateur :", err);
    res.status(500).json({ error: "Erreur lors du changement de statut." });
  }
};

// === 9. JOURNAL D'AUDIT (GET /logs) ===
exports.getAuditLogs = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;
    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await AuditLog.countDocuments();
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Erreur journal audit :", err);
    res.status(500).json({ error: "Erreur récupération journal d'audit." });
  }
};

// === 10. MISE À JOUR DE L'OBJECTIF MENSUEL (PUT /settings/goal) ===
exports.updateGoal = async (req, res) => {
  try {
    const { monthlyGoal } = req.body;
    const goal = Number(monthlyGoal);
    if (!goal || goal <= 0) {
      return res.status(400).json({ error: "Objectif invalide." });
    }
    // Stocker dans un modèle simple Settings ou directement en variable globale process
    // Pour éviter une dépendance lourde, on stocke dans un document Settings upsert
    const Settings = require('../models/Settings');
    await Settings.findOneAndUpdate({}, { monthlyGoal: goal }, { upsert: true, new: true });
    logAudit(req.user.id, req.user.name, `Objectif mensuel mis à jour : ${goal.toLocaleString('fr-FR')} FCFA.`, 'info');
    res.json({ message: `Objectif mensuel fixé à ${goal.toLocaleString('fr-FR')} FCFA.`, monthlyGoal: goal });
  } catch (err) {
    console.error("Erreur mise à jour objectif :", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de l'objectif." });
  }
};

