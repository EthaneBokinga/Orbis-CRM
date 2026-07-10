const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const activityController = require('../controllers/activityController');
const { requireAuth } = require('../middleware/auth');
const { validateContact, validateDeal, validateInteraction } = require('../middleware/validate');

// Application globale du middleware d'authentification sur toutes les routes CRM
router.use(requireAuth);

// Routes Contacts
router.get('/contacts', crmController.getContacts);
router.post('/contacts', validateContact, crmController.createContact);
router.put('/contacts/:id', validateContact, crmController.updateContact);

// Routes Interactions (historique simple par contact)
router.get('/interactions/:contactId', crmController.getInteractionsByContact);
router.post('/interactions', validateInteraction, crmController.createInteraction);

// Routes Activités — Timeline Salesforce par deal (appel, email, réunion, tâche)
router.get('/activities/:dealId', activityController.getActivitiesByDeal);
router.post('/activities', activityController.createActivity);

// Routes Deals (Pipeline Kanban)
router.get('/deals/public', crmController.getPublicDeals);
router.get('/deals', crmController.getDeals);
router.post('/deals', validateDeal, crmController.createDeal);
router.put('/deals/:id/claim', crmController.claimDeal);
router.put('/deals/:id', validateDeal, crmController.updateDeal);
router.put('/deals/:id/stage', crmController.updateDealStage);

// Route Dashboard Analytique
router.get('/dashboard/stats', crmController.getDashboardStats);

// Progression des objectifs (accessible à tous les utilisateurs authentifiés)
const adminController = require('../controllers/adminController');
router.get('/goals/progress', adminController.getGoalsProgress);
router.get('/goals/history', adminController.getGoalHistory);

// Routes Administration (Supervision) — nécessite le rôle admin
const adminRoutes = require('./adminRoutes');
router.use('/admin', adminRoutes);

module.exports = router;
