import { Router } from 'express';
import {
  getInvoices, getInvoiceById,
  createFromEstimate, updateInvoice, updatePaymentStatus,
} from '../controllers/invoiceController.js';

const router = Router();

router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.post('/', createFromEstimate);
router.put('/:id', updateInvoice);
router.patch('/:id/payment-status', updatePaymentStatus);

export default router;
