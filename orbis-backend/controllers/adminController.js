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

    const oldRole = user.role;
    user.role = role;
    await user.save();

    logAudit(req.user.id, req.user.name, `Rôle de ${user.name} modifié en "${role}".`, 'warning');

    // Créer une notification pour l'agent concerné
    try {
      const Notification = require('../models/Notification');
      const notif = await Notification.create({
        recipientId: user._id,
        type: 'role_change',
        title: 'Votre rôle a été modifié',
        message: `Votre rôle est passé de "${oldRole}" à "${role}" par l'administrateur ${req.user.name}.`,
        metadata: { oldRole, newRole: role, changedBy: req.user.name }
      });

      // Envoyer notification temps réel via WebSocket
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      if (io && userSockets) {
        const socketId = userSockets.get(user._id.toString());
        if (socketId) {
          io.to(socketId).emit('notification', {
            _id: notif._id,
            type: 'role_change',
            title: 'Votre rôle a été modifié',
            message: `Votre rôle est passé de "${oldRole}" à "${role}".`
          });
        }
      }
    } catch (notifErr) {
      console.warn('[ChangeRole] Notification non envoyée:', notifErr.message);
    }

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
      assignedTo: d.ownedBy,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
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

    // === ENVOI D'EMAIL DE BIENVENUE AVEC IDENTIFIANTS ===
    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = Number(process.env.SMTP_PORT || 587);
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || smtpUser || 'bokingaethanenathan@gmail.com';
      const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://orbis-crm-five.vercel.app';

      if (smtpHost && smtpUser && smtpPass) {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 8000
        });

        const roleLabels = {
          admin: 'Administrateur',
          commercial: 'Commercial / Vente',
          marketing: 'Marketing',
          rh: 'Ressources Humaines',
          autre: 'Autre service'
        };

        const mailOptions = {
          from: `"Orbis CRM - Portail Équipe" <${smtpFrom}>`,
          to: cleanEmail,
          subject: "🎉 Bienvenue sur Orbis CRM - Vos identifiants de connexion",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px; max-width: 560px; margin: auto;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0d9488; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: 2px;">ORBIS CRM</h1>
                <p style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 5px; letter-spacing: 1px;">Force de vente & Gestion Commerciale</p>
              </div>
              
              <div style="background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155;">
                <p style="font-size: 14px; color: #cbd5e1; margin-top: 0;">Bonjour <strong style="color: #0d9488;">${name.trim()}</strong>,</p>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                  Votre compte a été créé sur <strong>Orbis CRM</strong> par l'administrateur. 
                  Vous trouverez ci-dessous vos accès pour vous connecter à la plateforme.
                </p>
                
                <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #334155;">
                  <table style="width: 100%; font-size: 13px;">
                    <tr>
                      <td style="color: #64748b; padding-bottom: 10px;">📧 Email</td>
                      <td style="color: #f8fafc; font-weight: 600; padding-bottom: 10px;">${cleanEmail}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding-bottom: 10px;">🔑 Mot de passe</td>
                      <td style="color: #f8fafc; font-weight: 600; padding-bottom: 10px;">${password}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding-bottom: 10px;">👤 Rôle</td>
                      <td style="color: #0d9488; font-weight: 600; padding-bottom: 10px;">${roleLabels[role] || role}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">🔗 Plateforme</td>
                      <td><a href="${frontendUrl}" style="color: #0d9488; font-weight: 600;">${frontendUrl}</a></td>
                    </tr>
                  </table>
                </div>
                
                <p style="font-size: 11px; color: #64748b; margin-bottom: 0; line-height: 1.5;">
                  ⚠️ Pour des raisons de sécurité, veuillez changer votre mot de passe dès votre première connexion.
                </p>
              </div>
              
              <p style="font-size: 11px; color: #475569; text-align: center; margin-top: 30px; line-height: 1.5;">
                &copy; 2026 Orbis CRM - Tous droits réservés<br/>
                Ce message est confidentiel, ne le partagez pas.
              </p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log('[SMTP] Email de bienvenue envoyé à', cleanEmail);
      } else {
        console.warn('[SMTP] Configuration SMTP incomplète. Email de bienvenue NON envoyé à', cleanEmail);
      }
    } catch (mailErr) {
      console.error('[SMTP] Échec envoi email bienvenue à', cleanEmail, ':', mailErr.message);
    }
    
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

// === 9. JOURNAL D'AUDIT (GET /logs) — Pagination par 7 actions ===
exports.getAuditLogs = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 7; // 7 actions par page
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

// === 11. MISE À JOUR DE L'OBJECTIF PAR PÉRIODE (PUT /settings/goal) — AVEC HISTORIQUE ===
exports.updateGoal = async (req, res) => {
  try {
    const { goal, period, note } = req.body; // period = 'weekly' | 'monthly' | 'yearly'
    const goalValue = Number(goal);
    if (!goalValue || goalValue <= 0) {
      return res.status(400).json({ error: "Objectif invalide." });
    }
    const allowedPeriods = ['weekly', 'monthly', 'yearly'];
    const targetPeriod = allowedPeriods.includes(period) ? period : 'monthly';
    
    const Settings = require('../models/Settings');
    const oldSettings = await Settings.findOne({});
    const oldGoal = oldSettings ? oldSettings[`${targetPeriod}Goal`] : 0;
    
    const fieldToUpdate = { [`${targetPeriod}Goal`]: goalValue };
    const updated = await Settings.findOneAndUpdate({}, fieldToUpdate, { upsert: true, new: true });
    const periodLabel = { weekly: 'hebdomadaire', monthly: 'mensuel', yearly: 'annuel' }[targetPeriod];
    
    // Enregistrer l'historique
    try {
      const GoalHistory = require('../models/GoalHistory');
      await GoalHistory.create({
        period: targetPeriod,
        oldGoal,
        newGoal: goalValue,
        changedBy: req.user.id,
        changedByName: req.user.name,
        note: note || ''
      });
    } catch (histErr) {
      console.warn('[GoalHistory] Erreur enregistrement historique:', histErr.message);
    }
    
    logAudit(req.user.id, req.user.name, `Objectif ${periodLabel} mis à jour : ${goalValue.toLocaleString('fr-FR')} FCFA.`, 'info');
    
    // Notifier tous les agents du changement d'objectif
    try {
      const User = require('../models/User');
      const Notification = require('../models/Notification');
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      
      const allUsers = await User.find({ isActive: true }).select('_id').lean();
      for (const user of allUsers) {
        if (user._id.toString() === req.user.id) continue;
        
        const notif = await Notification.create({
          recipientId: user._id,
          type: 'goal_update',
          title: `📊 Objectif ${periodLabel} mis à jour`,
          message: `L'administrateur a fixé l'objectif ${periodLabel} à ${goalValue.toLocaleString('fr-FR')} FCFA.`,
          metadata: { period: targetPeriod, goal: goalValue }
        });
        
        const socketId = userSockets?.get(user._id.toString());
        if (socketId && io) {
          io.to(socketId).emit('notification', {
            _id: notif._id,
            type: 'goal_update',
            title: `📊 Objectif ${periodLabel} mis à jour`,
            message: `L'administrateur a fixé l'objectif ${periodLabel} à ${goalValue.toLocaleString('fr-FR')} FCFA.`
          });
        }
      }
    } catch (notifErr) {
      console.warn('[GoalUpdate] Notification non envoyée:', notifErr.message);
    }
    
    res.json({ message: `Objectif ${periodLabel} fixé à ${goalValue.toLocaleString('fr-FR')} FCFA.`, settings: updated });
  } catch (err) {
    console.error("Erreur mise à jour objectif :", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de l'objectif." });
  }
};

// === 12. SUIVI DE PROGRESSION DES OBJECTIFS (GET /goals/progress) — HIÉRARCHIE INCLUSIVE ===
exports.getGoalsProgress = async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({});
    }

    const now = new Date();
    
    // Début et fin du mois en cours
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Début et fin de l'année en cours
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    // Début et fin de la semaine en cours (lundi-dimanche)
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Agrégation des deals gagnés par période
    const [monthlyRevenue, yearlyRevenue, weeklyRevenue] = await Promise.all([
      Deal.aggregate([
        { $match: { stage: 'gagné', updatedAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Deal.aggregate([
        { $match: { stage: 'gagné', updatedAt: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Deal.aggregate([
        { $match: { stage: 'gagné', updatedAt: { $gte: startOfWeek, $lte: endOfWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const monthlyTotal = monthlyRevenue[0]?.total || 0;
    const yearlyTotal = yearlyRevenue[0]?.total || 0;
    const weeklyTotal = weeklyRevenue[0]?.total || 0;

    // Calcul avec hiérarchie inclusive : weekly ≤ monthly ≤ yearly
    // Calculer combien de semaines/mois se sont écoulés
    const startOfYearDate = new Date(now.getFullYear(), 0, 1);
    const monthsElapsed = (now.getFullYear() - startOfYearDate.getFullYear()) * 12 + now.getMonth() + 1;
    
    // Objectif mensuel proportionnel à l'année
    const monthlyGoalProportional = settings.yearlyGoal > 0 
      ? Math.round(settings.yearlyGoal / 12) 
      : settings.monthlyGoal;
    
    // L'objectif mensuel ne doit pas dépasser 1/12 de l'objectif annuel
    const effectiveMonthlyGoal = settings.monthlyGoal > 0 
      ? Math.min(settings.monthlyGoal, settings.yearlyGoal > 0 ? Math.round(settings.yearlyGoal / 12) : settings.monthlyGoal)
      : monthlyGoalProportional;
    
    // L'objectif hebdomadaire ne doit pas dépasser 1/4 de l'objectif mensuel
    const effectiveWeeklyGoal = settings.weeklyGoal > 0
      ? Math.min(settings.weeklyGoal, Math.round(effectiveMonthlyGoal / 4))
      : Math.round(effectiveMonthlyGoal / 4);

    res.json({
      monthly: {
        goal: effectiveMonthlyGoal,
        current: monthlyTotal,
        percentage: effectiveMonthlyGoal > 0 ? Math.round((monthlyTotal / effectiveMonthlyGoal) * 100) : 0
      },
      yearly: {
        goal: settings.yearlyGoal,
        current: yearlyTotal,
        percentage: settings.yearlyGoal > 0 ? Math.round((yearlyTotal / settings.yearlyGoal) * 100) : 0
      },
      weekly: {
        goal: effectiveWeeklyGoal,
        current: weeklyTotal,
        percentage: effectiveWeeklyGoal > 0 ? Math.round((weeklyTotal / effectiveWeeklyGoal) * 100) : 0
      },
      hierarchy: {
        weeklyInMonthly: effectiveWeeklyGoal <= effectiveMonthlyGoal,
        monthlyInYearly: effectiveMonthlyGoal <= settings.yearlyGoal || settings.yearlyGoal === 0
      }
    });
  } catch (err) {
    console.error("Erreur récupération progression objectifs :", err);
    res.status(500).json({ error: "Erreur lors du calcul de la progression." });
  }
};

// === 13. STATISTIQUES DÉTAILLÉES DES DEALS PAR AGENT (GET /deals/stats) ===
exports.getDealStatsByAgent = async (req, res) => {
  try {
    const stats = await Deal.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'ownedBy',
          foreignField: '_id',
          as: 'owner'
        }
      },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$owner._id',
          agentName: { $first: '$owner.name' },
          agentEmail: { $first: '$owner.email' },
          totalDeals: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          dealsByStage: {
            $push: {
              id: '$_id',
              title: '$title',
              amount: '$amount',
              stage: '$stage',
              probability: '$probability'
            }
          }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Calculer les répartitions par stage
    const result = stats.map(s => ({
      agentId: s._id,
      agentName: s.agentName || 'Non assigné (Public)',
      agentEmail: s.agentEmail || '',
      totalDeals: s.totalDeals,
      totalAmount: s.totalAmount,
      stages: {
        découverte: s.dealsByStage.filter(d => d.stage === 'découverte').length,
        proposition: s.dealsByStage.filter(d => d.stage === 'proposition').length,
        négociation: s.dealsByStage.filter(d => d.stage === 'négociation').length,
        gagné: s.dealsByStage.filter(d => d.stage === 'gagné').length,
        perdu: s.dealsByStage.filter(d => d.stage === 'perdu').length
      },
      deals: s.dealsByStage.map(d => ({
        id: d.id,
        title: d.title,
        amount: d.amount,
        stage: d.stage,
        probability: d.probability
      }))
    }));

    // Ajouter les deals non assignés
    const unassignedDeals = await Deal.find({ ownedBy: { $exists: false } })
      .populate('contact', 'firstName lastName company')
      .lean();
    
    if (unassignedDeals.length > 0) {
      result.push({
        agentId: null,
        agentName: 'Non assigné (Public)',
        agentEmail: '',
        totalDeals: unassignedDeals.length,
        totalAmount: unassignedDeals.reduce((sum, d) => sum + d.amount, 0),
        stages: {
          découverte: unassignedDeals.filter(d => d.stage === 'découverte').length,
          proposition: unassignedDeals.filter(d => d.stage === 'proposition').length,
          négociation: unassignedDeals.filter(d => d.stage === 'négociation').length,
          gagné: unassignedDeals.filter(d => d.stage === 'gagné').length,
          perdu: unassignedDeals.filter(d => d.stage === 'perdu').length
        },
        deals: unassignedDeals.map(d => ({
          id: d._id,
          title: d.title,
          amount: d.amount,
          stage: d.stage,
          probability: d.probability
        }))
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Erreur stats deals par agent :", err);
    res.status(500).json({ error: "Erreur lors du calcul des statistiques." });
  }
};

// === 14. HISTORIQUE DES OBJECTIFS (GET /goals/history) ===
exports.getGoalHistory = async (req, res) => {
  try {
    const GoalHistory = require('../models/GoalHistory');
    const { period } = req.query;
    const filter = {};
    if (period) filter.period = period;

    const history = await GoalHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(history);
  } catch (err) {
    console.error("Erreur récupération historique objectifs :", err);
    res.status(500).json({ error: "Erreur récupération historique." });
  }
};

// === 15. TOP PERFORMANCES DES AGENTS (GET /performances/top) — OPTIMISÉ AGRÉGATION ===
exports.getTopPerformers = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Agrégation unique : performances par agent
    const [dealStats, inactiveUsers, lateData] = await Promise.all([
      // 1. Stats des deals par agent (agrégation MongoDB pure)
      Deal.aggregate([
        { $match: { ownedBy: { $exists: true, $ne: null } } },
        {
          $lookup: {
            from: 'users',
            localField: 'ownedBy',
            foreignField: '_id',
            as: 'owner'
          }
        },
        { $unwind: { path: '$owner', preserveNullAndEmptyArrays: false } },
        { $match: { 'owner.role': { $ne: 'admin' }, 'owner.isActive': true } },
        {
          $group: {
            _id: '$owner._id',
            name: { $first: '$owner.name' },
            email: { $first: '$owner.email' },
            avatarUrl: { $first: '$owner.avatarUrl' },
            role: { $first: '$owner.role' },
            totalDeals: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
            wonDeals: { $sum: { $cond: [{ $eq: ['$stage', 'gagné'] }, 1, 0] } },
            lostDeals: { $sum: { $cond: [{ $eq: ['$stage', 'perdu'] }, 1, 0] } },
            activeDeals: { $sum: { $cond: [{ $in: ['$stage', ['gagné', 'perdu']] }, 0, 1] } },
            monthRevenue: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$createdAt', startOfMonth] }, { $eq: ['$stage', 'gagné'] }] },
                  { $ifNull: ['$amount', 0] },
                  0
                ]
              }
            },
            lastMonthRevenue: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$updatedAt', startOfLastMonth] }, { $lte: ['$updatedAt', endOfLastMonth] }, { $eq: ['$stage', 'gagné'] }] },
                  { $ifNull: ['$amount', 0] },
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            closedDeals: { $add: ['$wonDeals', '$lostDeals'] },
            winRate: {
              $cond: [
                { $gt: [{ $add: ['$wonDeals', '$lostDeals'] }, 0] },
                { $round: [{ $multiply: [{ $divide: ['$wonDeals', { $add: ['$wonDeals', '$lostDeals'] }] }, 100] }, 0] },
                0
              ]
            },
            avgDealAmount: {
              $cond: [{ $gt: ['$totalDeals', 0] }, { $round: [{ $divide: ['$totalAmount', '$totalDeals'] }, 0] }, 0]
            },
            progressPercent: {
              $cond: [
                { $gt: ['$lastMonthRevenue', 0] },
                { $round: [{ $multiply: [{ $divide: [{ $subtract: ['$monthRevenue', '$lastMonthRevenue'] }, '$lastMonthRevenue'] }, 100] }, 0] },
                { $cond: [{ $gt: ['$monthRevenue', 0] }, 100, 0] }
              ]
            },
            performanceScore: {
              $add: [
                { $multiply: ['$wonDeals', 10] },
                { $divide: ['$totalAmount', 100000] },
                {
                  $cond: [
                    { $gt: [{ $add: ['$wonDeals', '$lostDeals'] }, 0] },
                    { $round: [{ $multiply: [{ $divide: ['$wonDeals', { $add: ['$wonDeals', '$lostDeals'] }] }, 100] }, 0] },
                    0
                  ]
                }
              ]
            }
          }
        },
        { $sort: { performanceScore: -1 } },
        { $limit: 50 }
      ]).then(r => r || []).catch(() => []),

      // 2. Utilisateurs sans deals (inactifs)
      (async () => {
        const agentsWithDeals = await Deal.distinct('ownedBy', { ownedBy: { $exists: true, $ne: null } });
        return User.find({ 
          _id: { $nin: agentsWithDeals },
          role: { $ne: 'admin' },
          isActive: true
        }).select('name email avatarUrl role').lean();
      })(),

      // 3. Relances en retard (limitée)
      (async () => {
        const Interaction = require('../models/Interaction');
        return Interaction.find({ nextActionDate: { $lte: now, $ne: null } })
          .populate('createdBy', 'name email')
          .limit(200)
          .lean();
      })()
    ]);

    // Construire le résultat
    const top5 = dealStats.slice(0, 5).map(p => ({
      agentId: p._id,
      name: p.name,
      email: p.email,
      avatarUrl: p.avatarUrl,
      role: p.role,
      totalDeals: p.totalDeals,
      totalAmount: p.totalAmount,
      wonDeals: p.wonDeals,
      lostDeals: p.lostDeals,
      activeDeals: p.activeDeals,
      winRate: p.winRate,
      avgDealAmount: p.avgDealAmount,
      monthRevenue: p.monthRevenue,
      performanceScore: p.performanceScore,
      progressPercent: p.progressPercent
    }));

    const allPerformers = dealStats.map(p => ({
      agentId: p._id,
      name: p.name,
      email: p.email,
      avatarUrl: p.avatarUrl,
      role: p.role,
      totalDeals: p.totalDeals,
      totalAmount: p.totalAmount,
      wonDeals: p.wonDeals,
      lostDeals: p.lostDeals,
      activeDeals: p.activeDeals,
      winRate: p.winRate,
      avgDealAmount: p.avgDealAmount,
      monthRevenue: p.monthRevenue,
      performanceScore: p.performanceScore,
      progressPercent: p.progressPercent
    }));

    const inactiveAgents = inactiveUsers.map(u => ({
      agentId: u._id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      role: u.role,
      totalDeals: 0,
      totalAmount: 0,
      wonDeals: 0,
      lostDeals: 0,
      activeDeals: 0,
      winRate: 0,
      avgDealAmount: 0,
      monthRevenue: 0,
      performanceScore: 0,
      progressPercent: 0
    }));

    // Compter les relances en retard par agent
    const agentsMap = {};
    (lateData || []).forEach(interaction => {
      if (!interaction.createdBy) return;
      const agentId = interaction.createdBy._id.toString();
      if (!agentsMap[agentId]) {
        agentsMap[agentId] = { agentId, agentName: interaction.createdBy.name, agentEmail: interaction.createdBy.email, lateCount: 0 };
      }
      agentsMap[agentId].lateCount++;
    });
    const lateAgents = Object.values(agentsMap).sort((a, b) => b.lateCount - a.lateCount).slice(0, 10);

    // Inclure les inactifs dans allPerformers pour l'export CSV
    const allPerformersWithInactive = [...allPerformers, ...inactiveAgents];

    res.json({ top5, lateAgents, inactiveAgents, allPerformers: allPerformersWithInactive });
  } catch (err) {
    console.error("Erreur récupération performances :", err);
    res.status(500).json({ error: "Erreur lors du calcul des performances." });
  }
};

// === 16. AGENTS EN RETARD SUR LES RELANCES (GET /performances/late-followups) ===
exports.getLateFollowups = async (req, res) => {
  try {
    const Interaction = require('../models/Interaction');
    const now = new Date();
    
    const lateInteractions = await Interaction.find({
      nextActionDate: { $lte: now, $ne: null }
    })
    .populate('contact', 'firstName lastName company phone')
    .populate('createdBy', 'name email')
    .sort({ nextActionDate: 1 })
    .lean();

    const agentsMap = {};
    lateInteractions.forEach(interaction => {
      if (!interaction.createdBy) return;
      const agentId = interaction.createdBy._id.toString();
      if (!agentsMap[agentId]) {
        agentsMap[agentId] = { agentId, agentName: interaction.createdBy.name, agentEmail: interaction.createdBy.email, lateCount: 0, contacts: [] };
      }
      agentsMap[agentId].lateCount++;
      agentsMap[agentId].contacts.push({
        contactId: interaction.contact?._id,
        contactName: interaction.contact ? `${interaction.contact.firstName} ${interaction.contact.lastName}` : 'Inconnu',
        company: interaction.contact?.company || '',
        phone: interaction.contact?.phone || '',
        plannedDate: interaction.nextActionDate,
        daysLate: Math.floor((now - new Date(interaction.nextActionDate)) / (1000 * 60 * 60 * 24))
      });
    });

    res.json({
      totalLateFollowups: lateInteractions.length,
      agents: Object.values(agentsMap).sort((a, b) => b.lateCount - a.lateCount),
      lateInteractions: lateInteractions.slice(0, 20)
    });
  } catch (err) {
    console.error("Erreur relances en retard :", err);
    res.status(500).json({ error: "Erreur calcul relances." });
  }
};

