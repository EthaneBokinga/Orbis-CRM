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
router.delete('/deals/:id', adminController.deleteDeal);

module.exports = router;
