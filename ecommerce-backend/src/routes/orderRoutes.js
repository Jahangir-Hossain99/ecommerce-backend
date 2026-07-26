import express from 'express';
const router = express.Router();

import orderController from '../controllers/orderController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

router.post('/', authenticateToken, orderController.createOrder);
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), orderController.stripeWebhook);
router.get('/bkash-callback', orderController.bkashCallback);

export default  router;