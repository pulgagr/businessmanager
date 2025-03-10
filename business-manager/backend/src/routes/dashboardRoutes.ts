import express from 'express';
import {
  getMetrics,
  getRevenueData,
  getQuoteStatusDistribution,
  getQuotesComparison,
  getRecentActivity
} from '../controllers/dashboardController';

const router = express.Router();

// Dashboard routes
router.get('/metrics', getMetrics);
router.get('/revenue', getRevenueData);
router.get('/quote-status', getQuoteStatusDistribution);
router.get('/quotes-comparison', getQuotesComparison);
router.get('/recent-activity', getRecentActivity);

export default router; 