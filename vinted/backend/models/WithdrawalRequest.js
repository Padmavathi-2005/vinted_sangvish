import mongoose from 'mongoose';

const withdrawalRequestSchema = mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        amount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed'],
            default: 'pending',
        },
        payment_method: {
            type: String, // Bank Transfer, PayPal, etc.
        },
        payment_details: {
            type: String, // Account number, etc.
        },
        admin_note: {
            type: String,
        },
        processed_at: {
            type: Date,
        },
        processed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
