const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard - Get all dashboard statistics
router.get('/', dashboardController.getDashboardData);

module.exports = router;