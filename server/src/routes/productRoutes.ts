import express from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getProductDetails } from '../controllers/productController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getProducts)
    .post(protect, createProduct);

router.route('/:id/details')
    .get(protect, getProductDetails);

router.route('/:id')
    .get(protect, getProduct)
    .put(protect, updateProduct)
    .delete(protect, deleteProduct);

export default router;
