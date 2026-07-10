const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const searchController = require('../controllers/searchController');

router.get('/', requireAuth, searchController.globalSearch);

module.exports = router;
