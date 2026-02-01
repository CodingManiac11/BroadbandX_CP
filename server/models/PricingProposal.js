/**
 * PricingProposal Model
 * Stores ML-generated pricing proposals for admin review and approval
 */

const mongoose = require('mongoose');

const pricingChangeSchema = new mongoose.Schema({
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    planName: {
        type: String,
        required: true
    },
    currentPrice: {
        type: Number,
        required: true
    },
    proposedPrice: {
        type: Number,
        required: true
    },
    changePercent: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    }
});

const pricingProposalSchema = new mongoose.Schema({
    // Proposal details
    title: {
        type: String,
        required: true,
        default: 'ML Pricing Proposal'
    },
    description: {
        type: String
    },

    // ML Model info
    model: {
        name: { type: String, default: 'Dynamic Pricing Engine' },
        version: { type: String, default: '1.0' },
        formula: { type: String, default: 'P_dynamic = P_base × (1 + α·D_t + β·E_c + γ·R_c)' },
        weights: {
            alpha: { type: Number, default: 0.15 },
            beta: { type: Number, default: 0.10 },
            gamma: { type: Number, default: 0.20 }
        }
    },

    // Proposed price changes
    changes: [pricingChangeSchema],

    // Status workflow
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'applied', 'expired'],
        default: 'pending'
    },

    // Audit trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    appliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Timestamps
    reviewedAt: Date,
    appliedAt: Date,
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },

    // Review notes
    reviewNotes: String,
    rejectionReason: String,

    // Impact analysis
    projectedImpact: {
        revenueChange: Number,
        churnReduction: Number,
        customersSaved: Number
    }
}, {
    timestamps: true
});

// Indexes
pricingProposalSchema.index({ status: 1, createdAt: -1 });
pricingProposalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired proposals

// Virtual for age
pricingProposalSchema.virtual('age').get(function () {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60)); // hours
});

// Check if proposal is still valid
pricingProposalSchema.methods.isValid = function () {
    return this.status === 'pending' && new Date() < this.expiresAt;
};

// Static method to get active proposals
pricingProposalSchema.statics.getActivePending = function () {
    return this.find({
        status: 'pending',
        expiresAt: { $gt: new Date() }
    }).populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });
};

module.exports = mongoose.model('PricingProposal', pricingProposalSchema);
