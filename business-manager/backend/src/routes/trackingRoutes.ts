import express from 'express';
import { getAllTrackings, getTrackingById, createTracking, updateTracking, updateTrackingStatus, updateTrackingPayment, deleteTracking } from '../controllers/trackingController';

const router = express.Router();

// Routes
router.get('/', getAllTrackings);
router.get('/:id', getTrackingById);
router.post('/', createTracking);
router.put('/:id', updateTracking);
router.patch('/:id/status', updateTrackingStatus);
router.patch('/:id/payment', updateTrackingPayment);
router.delete('/:id', deleteTracking);

export default router; 