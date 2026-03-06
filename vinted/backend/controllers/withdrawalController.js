import asyncHandler from 'express-async-handler';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { getOrCreateWallet } from './walletController.js';

// @desc    Create a withdrawal request
// @route   POST /api/wallet/withdraw
// @access  Private
const requestWithdrawal = asyncHandler(async (req, res) => {
    const { amount, payment_method, payment_details } = req.body;

    if (!amount || amount <= 0) {
        res.status(400);
        throw new Error('Invalid amount');
    }

    const wallet = await getOrCreateWallet(req.user._id, 'User');

    if (wallet.balance < amount) {
        res.status(400);
        throw new Error('Insufficient balance');
    }

    // Deduct from wallet immediately (mark as pending transaction)
    wallet.balance -= amount;
    await wallet.save();

    const request = await WithdrawalRequest.create({
        user_id: req.user._id,
        amount,
        payment_method,
        payment_details,
        status: 'pending'
    });

    await Transaction.create({
        user_id: req.user._id,
        user_type: 'User',
        wallet_id: wallet._id,
        amount,
        type: 'debit',
        purpose: 'withdrawal',
        reference_id: request._id,
        reference_model: 'WithdrawalRequest',
        status: 'pending',
        description: `Withdrawal request for ${amount}`
    });

    res.status(201).json(request);
});

// @desc    Get my withdrawal requests
// @route   GET /api/wallet/withdrawals
// @access  Private
const getMyWithdrawals = asyncHandler(async (req, res) => {
    const withdrawals = await WithdrawalRequest.find({ user_id: req.user._id }).sort({ created_at: -1 });
    res.json(withdrawals);
});

export {
    requestWithdrawal,
    getMyWithdrawals
};
