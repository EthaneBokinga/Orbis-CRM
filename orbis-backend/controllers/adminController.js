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

// === 2. LISTE DE TOUTE L'ÉQUIPE AVEC NB DE DEALS ===
exports.getCommercials = async (req, res) => {
  try {
    // Récupérer tous les utilisateurs
    const users = await User.find({}).select('name email role isActive avatarUrl');

    // Agrégation du nombre de deals par commercial
    const dealCounts = await Deal.aggregate([
      { $group: { _id: '$ownedBy', dealCount: { $sum: 1 } } }
    ]);

    const countMap = {};
    dealCounts.forEach(dc => {
      if (dc._id) {
        countMap[dc._id.toString()] = dc.dealCount;
      }
    });

    const result = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarUrl: u.avatarUrl,
      isActive: u.isActive !== false, // Valeur par défaut true
      dealCount: countMap[u._id.toString()] || 0
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération de l'équipe." });
  }
};

// === 2b. MODIFICATION DU RÔLE D'UN MEMBRE (PUT /users/:id/role) ===
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['admin', 'commercial', 'marketing', 'rh', 'autre'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Rôle invalide." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: "Action interdite : vous ne pouvez pas modifier votre propre rôle." });
    }

    user.role = role;
    await user.save();

    logAudit(req.user.id, req.user.name, `Rôle de ${user.name} modifié en "${role}".`, 'warning');
    res.json({ message: `Le rôle a été mis à jour avec succès : ${role}.`, user });
  } catch (err) {
    res.status(500).json({ error: "Erreur modification rôle." });
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
    const { title, company, amount, assignedTo, contactFirstName, contactLastName, phone, email, address } = req.body;
    if (!title || !company || !amount || !assignedTo) {
      return res.status(400).json({ error: "Champs requis manquants." });
    }
 
    let isPublic = assignedTo === 'public';
    let targetOwnerId = null;

    if (!isPublic) {
      const targetUser = await User.findOne({ _id: assignedTo, isActive: true });
      if (!targetUser) {
        return res.status(404).json({ error: "Utilisateur assigné introuvable ou inactif." });
      }
      targetOwnerId = targetUser._id;
    }
 
    // Trouver ou créer automatiquement un contact d'entreprise pour l'association Mongoose obligatoire
    const Contact = require('../models/Contact');
    let contact = await Contact.findOne({ company });
    if (!contact) {
      contact = new Contact({
        firstName: contactFirstName?.trim() || "Contact",
        lastName: contactLastName?.trim() || company,
        phone: phone?.trim() || "+242 06 000 00 00",
        email: email?.trim().toLowerCase() || ("contact@" + company.toLowerCase().replace(/\s+/g, '') + ".com"),
        company: company,
        address: address?.trim() || '',
        assignedTo: targetOwnerId || req.user.id,
        createdBy: req.user.id
      });
      await contact.save();
    } else {
      // Mettre à jour les infos du contact si fournies
      if (contactFirstName) contact.firstName = contactFirstName.trim();
      if (contactLastName) contact.lastName = contactLastName.trim();
      if (phone) contact.phone = phone.trim();
      if (email) contact.email = email.trim().toLowerCase();
      if (address) contact.address = address.trim();
      await contact.save();
    }
 
    const deal = new Deal({
      contact: contact._id,
      title: title.trim(),
      amount: Number(amount),
      stage: 'découverte',
      probability: 10,
      ownedBy: targetOwnerId || undefined
    });
 
    await deal.save();

    logAudit(req.user.id, req.user.name, `Deal "${title}" créé pour ${company} (${amount.toLocaleString('fr-FR')} FCFA).`, 'info');
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
    const limit = parseInt(req.query.limit) || 50;
    const filter = {};
    
    // Filtre par utilisateur (actorId)
    if (req.query.actorId) {
      filter.actorId = req.query.actorId;
    }
    // Filtre par sévérité
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await AuditLog.countDocuments(filter);
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Erreur journal audit :", err);
    res.status(500).json({ error: "Erreur récupération journal d'audit." });
  }
};

// === 10. RÉCUPÉRATION DES PARAMÈTRES (GET /settings) ===
exports.getSettings = async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération des paramètres." });
  }
};

// === 11. MISE À JOUR DE L'OBJECTIF PAR PÉRIODE (PUT /settings/goal) ===
exports.updateGoal = async (req, res) => {
  try {
    const { goal, period } = req.body; // period = 'weekly' | 'monthly' | 'yearly'
    const goalValue = Number(goal);
    if (!goalValue || goalValue <= 0) {
      return res.status(400).json({ error: "Objectif invalide." });
    }
    const allowedPeriods = ['weekly', 'monthly', 'yearly'];
    const targetPeriod = allowedPeriods.includes(period) ? period : 'monthly';
    const fieldToUpdate = { [`${targetPeriod}Goal`]: goalValue };

    const Settings = require('../models/Settings');
    const updated = await Settings.findOneAndUpdate({}, fieldToUpdate, { upsert: true, new: true });
    const periodLabel = { weekly: 'hebdomadaire', monthly: 'mensuel', yearly: 'annuel' }[targetPeriod];
    logAudit(req.user.id, req.user.name, `Objectif ${periodLabel} mis à jour : ${goalValue.toLocaleString('fr-FR')} FCFA.`, 'info');
    res.json({ message: `Objectif ${periodLabel} fixé à ${goalValue.toLocaleString('fr-FR')} FCFA.`, settings: updated });
  } catch (err) {
    console.error("Erreur mise à jour objectif :", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de l'objectif." });
  }
};

