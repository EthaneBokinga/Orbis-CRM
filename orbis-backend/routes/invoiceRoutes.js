const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', invoiceController.createInvoice);
router.post('/from-deal', invoiceController.createFromDeal);
router.put('/:id', invoiceController.updateInvoice);
router.put('/:id/pay', invoiceController.markAsPaid);
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
