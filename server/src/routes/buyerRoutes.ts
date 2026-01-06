import express from 'express';
import { getBuyers, getBuyer, createBuyer, updateBuyer, deleteBuyer } from '../controllers/buyerController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getBuyers)
    .post(protect, createBuyer);

router.route('/:id')
    .get(protect, getBuyer)
    .put(protect, updateBuyer)
    .delete(protect, deleteBuyer);

export default router;
