const Invoice = require('../models/Invoice');
const Deal = require('../models/Deal');
const Contact = require('../models/Contact');
const AuditLog = require('../models/AuditLog');

const logAudit = (actorId, actorName, action, severity = 'info') => {
  AuditLog.create({ actorId, actorName, actionDescription: action, severity }).catch(() => {});
};

// === GET : Liste des factures ===
exports.getInvoices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    
    // RBAC : admin voit tout, les autres voient leurs factures
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user.id;
    }

    const invoices = await Invoice.find(filter)
      .populate('createdBy', 'name email')
      .populate('dealId', 'title amount')
      .populate('contactId', 'firstName lastName company')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Invoice.countDocuments(filter);

    res.json({ invoices, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Erreur récupération factures :", err);
    res.status(500).json({ error: "Erreur lors du chargement des factures." });
  }
};

// === GET : Une facture par ID ===
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('dealId', 'title amount stage')
      .populate('contactId', 'firstName lastName company email phone');

    if (!invoice) return res.status(404).json({ error: "Facture introuvable." });

    // RBAC
    if (req.user.role !== 'admin' && invoice.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération facture." });
  }
};

// === POST : Créer une facture ===
exports.createInvoice = async (req, res) => {
  try {
    const {
      clientName, clientCompany, clientEmail, clientPhone, clientAddress,
      items, subTotal, tvaTotal, discount, total,
      issueDate, dueDate, dealId, contactId, notes, status
    } = req.body;

    if (!clientName || !dueDate || !items || items.length === 0 || !total) {
      return res.status(400).json({ error: "Client, date d'échéance, articles et montant requis." });
    }

    const numero = await Invoice.generateNumero();

    const invoice = await Invoice.create({
      numero,
      clientName: clientName.trim(),
      clientCompany: clientCompany?.trim() || '',
      clientEmail: clientEmail?.trim() || '',
      clientPhone: clientPhone?.trim() || '',
      clientAddress: clientAddress?.trim() || '',
      items,
      subTotal: subTotal || total,
      tvaTotal: tvaTotal || 0,
      discount: discount || 0,
      total,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: new Date(dueDate),
      dealId: dealId || undefined,
      contactId: contactId || undefined,
      createdBy: req.user.id,
      notes: notes?.trim() || '',
      status: status || 'brouillon'
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('createdBy', 'name email')
      .populate('dealId', 'title amount')
      .populate('contactId', 'firstName lastName company');

    logAudit(req.user.id, req.user.name, `Facture ${numero} créée pour ${clientName} — ${total.toLocaleString('fr-FR')} FCFA.`, 'info');

    res.status(201).json(populated);
  } catch (err) {
    console.error("Erreur création facture :", err);
    res.status(500).json({ error: "Erreur lors de la création de la facture." });
  }
};

// === POST : Générer une facture depuis un deal gagné ===
exports.createFromDeal = async (req, res) => {
  try {
    const { dealId, dueDate } = req.body;
    if (!dealId) return res.status(400).json({ error: "ID du deal requis." });

    const deal = await Deal.findById(dealId).populate('contact');
    if (!deal) return res.status(404).json({ error: "Deal introuvable." });
    if (deal.stage !== 'gagné') return res.status(400).json({ error: "Le deal doit être au stade 'Gagné'." });

    const contact = deal.contact;
    const clientName = contact ? `${contact.firstName} ${contact.lastName}` : 'Client inconnu';
    const numero = await Invoice.generateNumero();

    const invoice = await Invoice.create({
      numero,
      clientName,
      clientCompany: contact?.company || '',
      clientEmail: contact?.email || '',
      clientPhone: contact?.phone || '',
      clientAddress: contact?.address || '',
      items: [{
        description: deal.title,
        quantity: 1,
        unitPrice: deal.amount,
        tva: 18
      }],
      subTotal: deal.amount,
      tvaTotal: Math.round(deal.amount * 0.18),
      total: deal.amount + Math.round(deal.amount * 0.18),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dealId: deal._id,
      contactId: contact?._id,
      createdBy: req.user.id,
      status: 'brouillon'
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('createdBy', 'name email')
      .populate('dealId', 'title amount')
      .populate('contactId', 'firstName lastName company');

    logAudit(req.user.id, req.user.name, `Facture ${numero} générée depuis le deal \"${deal.title}\".`, 'info');

    res.status(201).json(populated);
  } catch (err) {
    console.error("Erreur génération facture depuis deal :", err);
    res.status(500).json({ error: "Erreur lors de la génération de la facture." });
  }
};

// === PUT : Mettre à jour une facture ===
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Facture introuvable." });

    if (req.user.role !== 'admin' && invoice.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Modification non autorisée." });
    }

    // Empêcher la modification des factures payées
    if (invoice.status === 'payé') {
      return res.status(400).json({ error: "Une facture payée ne peut pas être modifiée." });
    }

    const allowedFields = [
      'clientName', 'clientCompany', 'clientEmail', 'clientPhone', 'clientAddress',
      'items', 'subTotal', 'tvaTotal', 'discount', 'total',
      'issueDate', 'dueDate', 'notes', 'status'
    ];

    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const updated = await Invoice.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('createdBy', 'name email')
      .populate('dealId', 'title amount');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erreur modification facture." });
  }
};

// === PUT : Marquer comme payée ===
exports.markAsPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Facture introuvable." });

    if (req.user.role !== 'admin' && invoice.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Action non autorisée." });
    }

    const { paidAmount } = req.body;

    if (paidAmount && paidAmount < invoice.total) {
      invoice.status = 'partiel';
      invoice.paidAmount = (invoice.paidAmount || 0) + Number(paidAmount);
    } else {
      invoice.status = 'payé';
      invoice.paidAt = new Date();
      invoice.paidAmount = invoice.total;
    }

    await invoice.save();

    logAudit(req.user.id, req.user.name, `Facture ${invoice.numero} marquée comme ${invoice.status}.`, 'info');
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour paiement." });
  }
};

// === DELETE : Supprimer une facture ===
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Facture introuvable." });

    if (req.user.role !== 'admin' && invoice.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Suppression non autorisée." });
    }

    if (invoice.status === 'payé') {
      return res.status(400).json({ error: "Une facture payée ne peut pas être supprimée." });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    logAudit(req.user.id, req.user.name, `Facture ${invoice.numero} supprimée.`, 'warning');
    res.json({ message: "Facture supprimée avec succès." });
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression facture." });
  }
};
