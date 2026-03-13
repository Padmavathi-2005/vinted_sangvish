import express from 'express';
import { getItems, getItemById, getSimilarItems, getMyItems, setItem, updateItem, deleteItem, applyDiscount, removeDiscount } from '../controllers/itemController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
const router = express.Router();

router.route('/').get(getItems).post(protect, upload.array('images', 20), setItem);

router.get('/myitems', protect, getMyItems);
router.get('/:id/similar', getSimilarItems);

router.route('/:id').get(getItemById).put(protect, upload.array('images', 20), updateItem).delete(protect, deleteItem);

// Discount routes
router.put('/:id/discount', protect, applyDiscount);
router.delete('/:id/discount', protect, removeDiscount);

export default router;

