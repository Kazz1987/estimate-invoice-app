import { Router } from 'express';
import {
  getEstimates, getEstimateById,
  createEstimate, updateEstimate, updateStatus,
} from '../controllers/estimateController.js';

const router = Router();

router.get('/', getEstimates);
router.get('/:id', getEstimateById);
router.post('/', createEstimate);
router.put('/:id', updateEstimate);
router.patch('/:id/status', updateStatus);

export default router;
