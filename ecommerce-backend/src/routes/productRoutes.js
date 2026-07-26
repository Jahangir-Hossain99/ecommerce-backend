import express from 'express';
const router = express.Router();

import productController from '../controllers/productController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

router.get('/', productController.getProducts);
router.get('/recommendations/:categoryId', productController.getRecommendations);
router.post('/', authenticateToken, requireAdmin, productController.createProduct);

export default router;