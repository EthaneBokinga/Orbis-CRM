const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');

// Appliquer requireRole('admin') pour toutes les routes d'administration
router.use(requireRole('admin'));

router.get('/stats', adminController.getAdminStats);
router.get('/commercials', adminController.getCommercials);
router.get('/deals/global', adminController.getAllDeals);
router.put('/deals/:id/reassign', adminController.reassignDeal);
router.post('/deals', adminController.createDeal);
router.post('/users', adminController.createUser);
router.put('/users/:id/toggle-status', adminController.toggleUserStatus);
router.put('/users/:id/role', adminController.changeUserRole);
router.delete('/deals/:id', adminController.deleteDeal);

// Journal d'audit & Configuration
router.get('/logs', adminController.getAuditLogs);
router.get('/settings', adminController.getSettings);
router.put('/settings/goal', adminController.updateGoal);

module.exports = router;

