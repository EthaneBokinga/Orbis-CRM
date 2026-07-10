const Contact = require('../models/Contact');
const Deal = require('../models/Deal');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Event = require('../models/Event');
const Message = require('../models/Message');
const Activity = require('../models/Activity');

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const query = q.trim();
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = userRole === 'admin';

    // Lancer toutes les recherches en parallèle
    const [
      contacts,
      deals,
      invoices,
      users,
      events,
      messages,
      activities
    ] = await Promise.all([
      // --- Contacts ---
      isAdmin
        ? Contact.find({
            $or: [
              { firstName: regex },
              { lastName: regex },
              { company: regex },
              { email: regex },
              { phone: regex }
            ]
          }).populate('assignedTo', 'name email').limit(10).lean()
        : Contact.find({
            assignedTo: userId,
            $or: [
              { firstName: regex },
              { lastName: regex },
              { company: regex },
              { email: regex },
              { phone: regex }
            ]
          }).limit(10).lean(),

      // --- Deals ---
      isAdmin
        ? Deal.find({
            $or: [
              { title: regex },
              { stage: regex }
            ]
          }).populate('contact', 'firstName lastName company').limit(10).lean()
        : Deal.find({
            ownedBy: userId,
            $or: [
              { title: regex },
              { stage: regex }
            ]
          }).populate('contact', 'firstName lastName company').limit(10).lean(),

      // --- Factures ---
      (isAdmin
        ? Invoice.find({
            $or: [
              { numero: regex },
              { clientName: regex },
              { clientCompany: regex },
              { status: regex }
            ]
          }).limit(10).lean()
        : Invoice.find({
            createdBy: userId,
            $or: [
              { numero: regex },
              { clientName: regex },
              { clientCompany: regex },
              { status: regex }
            ]
          }).limit(10).lean()
      ),

      // --- Utilisateurs (admin seulement) ---
      isAdmin
        ? User.find({
            $or: [
              { name: regex },
              { email: regex },
              { role: regex }
            ]
          }).select('name email role avatarUrl isActive').limit(10).lean()
        : Promise.resolve([]),

      // --- Événements ---
      isAdmin
        ? Event.find({
            $or: [
              { title: regex },
              { description: regex },
              { type: regex }
            ]
          }).populate('createdBy', 'name').limit(10).lean()
        : Event.find({
            $and: [
              { $or: [{ createdBy: userId }, { assignedTo: userId }] },
              { $or: [{ title: regex }, { description: regex }, { type: regex }] }
            ]
          }).populate('createdBy', 'name').limit(10).lean(),

      // --- Messages ---
      isAdmin
        ? Message.find({
            content: regex
          }).populate('sender', 'name email').populate('recipient', 'name email').limit(10).lean()
        : Message.find({
            $or: [
              { sender: userId },
              { recipient: userId }
            ],
            content: regex
          }).populate('sender', 'name email').populate('recipient', 'name email').limit(10).lean(),

      // --- Activités ---
      isAdmin
        ? Activity.find({
            $or: [
              { title: regex },
              { description: regex },
              { type: regex }
            ]
          }).populate('assignedTo', 'name').limit(10).lean()
        : Activity.find({
            assignedTo: userId,
            $or: [
              { title: regex },
              { description: regex },
              { type: regex }
            ]
          }).populate('assignedTo', 'name').limit(10).lean()
    ]);

    // Formater les résultats avec catégorie et description
    const results = [];

    contacts.forEach(c => {
      results.push({
        _id: c._id,
        category: 'contacts',
        label: `${c.firstName} ${c.lastName}`,
        subtitle: c.company || c.email || c.phone,
        icon: 'User',
        route: 'contact',
        data: c
      });
    });

    deals.forEach(d => {
      results.push({
        _id: d._id,
        category: 'deals',
        label: d.title,
        subtitle: `${(d.amount || 0).toLocaleString('fr-FR')} FCFA · ${d.stage}`,
        icon: 'Briefcase',
        route: 'deal',
        data: d
      });
    });

    invoices.forEach(inv => {
      results.push({
        _id: inv._id,
        category: 'invoices',
        label: `${inv.numero} · ${inv.clientName || inv.clientCompany}`,
        subtitle: `${(inv.total || 0).toLocaleString('fr-FR')} FCFA · ${inv.status}`,
        icon: 'FileText',
        route: 'invoice',
        data: inv
      });
    });

    users.forEach(u => {
      results.push({
        _id: u._id,
        category: 'users',
        label: u.name,
        subtitle: `${u.email} · ${u.role}${u.isActive ? '' : ' (inactif)'}`,
        icon: 'Users',
        route: 'user',
        data: u
      });
    });

    events.forEach(e => {
      results.push({
        _id: e._id,
        category: 'events',
        label: e.title,
        subtitle: `${e.type} · ${new Date(e.startDate).toLocaleDateString('fr-FR')}`,
        icon: 'Calendar',
        route: 'event',
        data: e
      });
    });

    messages.forEach(m => {
      results.push({
        _id: m._id,
        category: 'messages',
        label: `Message de ${m.sender?.name || 'Inconnu'}`,
        subtitle: m.content.substring(0, 80) + (m.content.length > 80 ? '...' : ''),
        icon: 'MessageSquare',
        route: 'message',
        data: m
      });
    });

    activities.forEach(a => {
      results.push({
        _id: a._id,
        category: 'activities',
        label: a.title,
        subtitle: `${a.type} · ${a.status}`,
        icon: 'Activity',
        route: 'activity',
        data: a
      });
    });

    // Trier par pertinence : correspondances exactes d'abord, puis par catégorie
    results.sort((a, b) => {
      const aExact = a.label.toLowerCase() === query.toLowerCase() ? 0 : 1;
      const bExact = b.label.toLowerCase() === query.toLowerCase() ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return 0;
    });

    res.json({ results: results.slice(0, 30) });
  } catch (err) {
    console.error('[Search] Erreur:', err);
    res.status(500).json({ error: 'Erreur lors de la recherche.' });
  }
};
