const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const { requireAuth } = require('../middleware/auth');
const { validateContact, validateDeal, validateInteraction } = require('../middleware/validate');

// Application globale du middleware d'authentification sur toutes les routes CRM
router.use(requireAuth);

// Routes Contacts
router.get('/contacts', crmController.getContacts);
router.post('/contacts', validateContact, crmController.createContact);
router.put('/contacts/:id', validateContact, crmController.updateContact);

// Routes Interactions
router.get('/interactions/:contactId', crmController.getInteractionsByContact);
router.post('/interactions', validateInteraction, crmController.createInteraction);

// Routes Deals (Pipeline Kanban)
router.get('/deals', crmController.getDeals);
router.post('/deals', validateDeal, crmController.createDeal);
router.put('/deals/:id', validateDeal, crmController.updateDeal);
router.put('/deals/:id/stage', crmController.updateDealStage);

// Route Dashboard Analytique
router.get('/dashboard/stats', crmController.getDashboardStats);

// Routes Administration (Supervision)
const adminRoutes = require('./adminRoutes');
router.use('/admin', adminRoutes);

module.exports = router;
