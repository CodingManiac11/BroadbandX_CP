/**
 * ChurnScanHistory Model
 * Stores historical churn scan results for trend visualization
 */

const mongoose = require('mongoose');

const churnScanHistorySchema = new mongoose.Schema({
    // Scan metadata
    scanDate: {
        type: Date,
        required: true,
        index: true
    },
    scanType: {
        type: String,
        enum: ['scheduled', 'manual', 'automatic'],
        default: 'automatic'
    },

    // Summary counts
    totalCustomers: {
        type: Number,
        required: true,
        default: 0
    },
    highRisk: {
        type: Number,
        required: true,
        default: 0
    },
    mediumRisk: {
        type: Number,
        required: true,
        default: 0
    },
    lowRisk: {
        type: Number,
        required: true,
        default: 0
    },

    // Aggregate metrics
    averageRiskScore: {
        type: Number,
        default: 0
    },
    highestRiskScore: {
        type: Number,
        default: 0
    },

    // Top at-risk customer IDs (for quick reference)
    topAtRiskCustomers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        probability: Number,
        riskLevel: String
    }],

    // Triggered by (if manual scan)
    triggeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Duration of scan in ms
    scanDuration: {
        type: Number
    },

    // Notes or errors
    notes: String,
    status: {
        type: String,
        enum: ['completed', 'failed', 'partial'],
        default: 'completed'
    }
}, {
    timestamps: true
});

// Index for efficient date-range queries
churnScanHistorySchema.index({ scanDate: -1 });
churnScanHistorySchema.index({ createdAt: -1 });

// Static method to get recent scan history
churnScanHistorySchema.statics.getRecentHistory = async function (days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return this.find({
        scanDate: { $gte: startDate },
        status: 'completed'
    })
        .sort({ scanDate: 1 })
        .lean();
};

// Static method to get daily aggregates (for trend chart)
churnScanHistorySchema.statics.getDailyTrends = async function (days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get the latest scan for each day
    const results = await this.aggregate([
        {
            $match: {
                scanDate: { $gte: startDate },
                status: 'completed'
            }
        },
        {
            $project: {
                dateOnly: { $dateToString: { format: "%Y-%m-%d", date: "$scanDate" } },
                highRisk: 1,
                mediumRisk: 1,
                lowRisk: 1,
                totalCustomers: 1,
                scanDate: 1
            }
        },
        {
            $sort: { scanDate: -1 }
        },
        {
            $group: {
                _id: "$dateOnly",
                highRisk: { $first: "$highRisk" },
                mediumRisk: { $first: "$mediumRisk" },
                lowRisk: { $first: "$lowRisk" },
                total: { $first: "$totalCustomers" },
                lastScanDate: { $first: "$scanDate" }
            }
        },
        {
            $sort: { _id: 1 }
        },
        {
            $project: {
                _id: 0,
                date: "$_id",
                highRisk: 1,
                mediumRisk: 1,
                lowRisk: 1,
                total: 1
            }
        }
    ]);

    return results;
};

// Static method to save a scan result
churnScanHistorySchema.statics.recordScan = async function (scanResult, options = {}) {
    const { scanType = 'automatic', triggeredBy = null, scanDuration = null } = options;

    // Calculate risk counts
    const atRiskCustomers = scanResult.atRiskCustomers || [];
    const highRisk = atRiskCustomers.filter(c => c.riskLevel === 'High').length;
    const mediumRisk = atRiskCustomers.filter(c => c.riskLevel === 'Medium').length;
    const lowRisk = atRiskCustomers.filter(c => c.riskLevel === 'Low').length;

    // Calculate average risk score
    const avgScore = atRiskCustomers.length > 0
        ? atRiskCustomers.reduce((sum, c) => sum + c.probability, 0) / atRiskCustomers.length
        : 0;

    // Get highest risk score
    const maxScore = atRiskCustomers.length > 0
        ? Math.max(...atRiskCustomers.map(c => c.probability))
        : 0;

    // Get top 10 at-risk customers
    const topAtRisk = atRiskCustomers
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 10)
        .map(c => ({
            userId: c.userId,
            probability: c.probability,
            riskLevel: c.riskLevel
        }));

    const record = new this({
        scanDate: new Date(),
        scanType,
        totalCustomers: scanResult.totalCustomers || atRiskCustomers.length,
        highRisk,
        mediumRisk,
        lowRisk,
        averageRiskScore: Math.round(avgScore),
        highestRiskScore: maxScore,
        topAtRiskCustomers: topAtRisk,
        triggeredBy,
        scanDuration,
        status: 'completed'
    });

    await record.save();
    return record;
};

module.exports = mongoose.model('ChurnScanHistory', churnScanHistorySchema);
