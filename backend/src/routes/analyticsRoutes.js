const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const authenticate = require('../middleware/auth');

// All analytics routes require authentication
router.use(authenticate);

// Endpoint 1: Dashboard statistics (5 stat cards)
router.get('/dashboard-stats', AnalyticsController.getDashboardStats);

// Endpoint 2: Monthly summary (donut chart and trend data)
router.get('/monthly-summary', AnalyticsController.getMonthlySummary);

// Endpoint 3: Top wasted ingredients (pie chart)
router.get('/top-wasted', AnalyticsController.getTopWasted);

// Endpoint 4: Recent activity feed
router.get('/recent-activity', AnalyticsController.getRecentActivity);

// Endpoint 5: Nearing expiry list
router.get('/nearing-expiry-list', AnalyticsController.getNearingExpiryList);

module.exports = router;
