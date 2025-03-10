import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';

const router = express.Router();

router.get('/', getSettings);
router.put('/', updateSettings);

export default router; 