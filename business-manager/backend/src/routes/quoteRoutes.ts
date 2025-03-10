import express from 'express';
import {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  getMissingQuotes
} from '../controllers/quoteController';

const router = express.Router();

router.get('/', getQuotes);
router.get('/missing', getMissingQuotes);
router.get('/:id', getQuoteById);
router.post('/', createQuote);
router.put('/:id', updateQuote);
router.delete('/:id', deleteQuote);

export default router; 