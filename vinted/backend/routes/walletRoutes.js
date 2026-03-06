import express from 'express';
import { getMyWallet } from '../controllers/walletController.js';
import { requestWithdrawal, getMyWithdrawals } from '../controllers/withdrawalController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/me', protect, getMyWallet);
router.post('/withdraw', protect, requestWithdrawal);
router.get('/withdrawals', protect, getMyWithdrawals);

export default router;
