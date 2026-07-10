const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', reminderController.getReminders);
router.post('/', reminderController.createReminder);
router.put('/:id', reminderController.updateReminder);
router.put('/:id/complete', reminderController.completeReminder);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;
