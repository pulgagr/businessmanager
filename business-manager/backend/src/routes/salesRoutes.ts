import express from 'express';
import {
  getMonthlySales,
  updateOrder,
  getMonthlySummary
} from '../controllers/salesController';

const router = express.Router();

router.get('/', getMonthlySales);
router.get('/summary', getMonthlySummary);
router.put('/:id', updateOrder);

export default router; 