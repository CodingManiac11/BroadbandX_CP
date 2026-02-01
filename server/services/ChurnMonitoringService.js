/**
 * Churn Monitoring Service
 * Automatically scans all customers, calculates churn risk using ML model weights,
 * and generates notifications for high-risk customers.
 * Runs every 6 hours to keep admin informed about at-risk customers.
 */

const Subscription = require('../models/Subscription');
const User = require('../models/User');
const UsageAnalytics = require('../models/UsageAnalytics');
const ChurnScanHistory = require('../models/ChurnScanHistory');
// Notification model is optional - will log to console if not available

class ChurnMonitoringService {
    constructor() {
        this.isRunning = false;
        this.updateInterval = 6 * 60 * 60 * 1000; // 6 hours
        this.intervalId = null;

        // Email alert configuration (enabled by default if ADMIN_EMAIL is set)
        this.emailAlertsEnabled = process.env.ENABLE_CHURN_ALERTS !== 'false';
        this.lastScanResult = null;

        // Feature weights from trained XGBoost model
        this.featureWeights = {
            usageChange: 0.173,
            paymentFailures: 0.160,
            supportTickets: 0.107,
            npsScore: 0.091,
            daysSinceLogin: 0.089,
            contractAge: 0.083
        };
    }

    /**
     * Start the churn monitoring service
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Churn Monitoring Service already running');
            return;
        }

        console.log('🔍 Starting Churn Monitoring Service...');
        this.isRunning = true;

        // Run immediately on start
        this.scanAllCustomers();

        // Schedule periodic updates
        this.intervalId = setInterval(() => {
            this.scanAllCustomers();
        }, this.updateInterval);

        console.log('✅ Churn Monitoring Service started - will scan every 6 hours');
    }

    /**
     * Stop the churn monitoring service
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 Churn Monitoring Service stopped');
    }

    /**
     * Calculate churn probability for a customer
     * @param {Object} customerData - Customer data including usage, payments, etc.
     * @returns {Object} - Churn prediction result
     */
    calculateChurnRisk(customerData) {
        const {
            usageChange = 0,
            daysSinceLogin = 0,
            paymentFailures = 0,
            supportTickets = 0,
            npsScore = 7,
            contractAge = 12
        } = customerData;

        // Normalize and calculate risk score
        const usageRisk = usageChange < 0 ? Math.min(1, Math.abs(usageChange) / 50) : 0;
        const loginRisk = Math.min(1, daysSinceLogin / 30);
        const paymentRisk = Math.min(1, paymentFailures / 3);
        const ticketRisk = Math.min(1, supportTickets / 5);
        const npsRisk = Math.min(1, (10 - npsScore) / 10);
        const contractRisk = contractAge < 6 ? 0.5 : 0;

        // Weighted sum
        const rawScore =
            usageRisk * this.featureWeights.usageChange +
            loginRisk * this.featureWeights.daysSinceLogin +
            paymentRisk * this.featureWeights.paymentFailures +
            ticketRisk * this.featureWeights.supportTickets +
            npsRisk * this.featureWeights.npsScore +
            contractRisk * this.featureWeights.contractAge;

        // Sigmoid to get probability
        const probability = 1 / (1 + Math.exp(-((rawScore * 10) - 3)));
        const probPercent = Math.round(probability * 100);

        let riskLevel = 'Low';
        let recommendation = 'Customer is stable. Continue standard engagement.';

        if (probPercent >= 60) {
            riskLevel = 'High';
            recommendation = 'URGENT: Immediate intervention required. Offer retention discount.';
        } else if (probPercent >= 30) {
            riskLevel = 'Medium';
            recommendation = 'Monitor closely. Consider proactive outreach.';
        }

        return {
            probability: probPercent,
            riskLevel,
            recommendation,
            factors: {
                usageRisk: Math.round(usageRisk * 100),
                loginRisk: Math.round(loginRisk * 100),
                paymentRisk: Math.round(paymentRisk * 100),
                ticketRisk: Math.round(ticketRisk * 100),
                npsRisk: Math.round(npsRisk * 100)
            }
        };
    }

    /**
     * Scan all customers and generate alerts for high-risk ones
     */
    async scanAllCustomers() {
        console.log('\n📊 Running Churn Risk Scan...');
        console.log(`⏰ Time: ${new Date().toLocaleString()}`);

        try {
            // Get all active subscriptions with user data
            const subscriptions = await Subscription.find({
                status: { $in: ['active', 'trialing'] }
            }).populate('user', 'firstName lastName email lastLogin createdAt');

            if (!subscriptions || subscriptions.length === 0) {
                console.log('⚠️ No active subscriptions found');
                return { highRisk: 0, mediumRisk: 0, lowRisk: 0, total: 0 };
            }

            let highRiskCount = 0;
            let mediumRiskCount = 0;
            let lowRiskCount = 0;
            const atRiskCustomers = [];

            for (const subscription of subscriptions) {
                const user = subscription.user;
                if (!user) continue;

                // Calculate days since last login
                const lastLogin = user.lastLogin || user.createdAt;
                const daysSinceLogin = Math.floor((Date.now() - new Date(lastLogin)) / (1000 * 60 * 60 * 24));

                // Calculate contract age in months
                const contractStart = subscription.startDate || subscription.createdAt;
                const contractAge = Math.floor((Date.now() - new Date(contractStart)) / (1000 * 60 * 60 * 24 * 30));

                // Get usage analytics if available
                let usageChange = 0;
                let supportTickets = 0;
                let npsScore = 7;

                try {
                    const analytics = await UsageAnalytics.findOne({ user: user._id }).sort({ updatedAt: -1 });
                    if (analytics) {
                        usageChange = analytics.usageChange30d || 0;
                        supportTickets = analytics.supportTickets || 0;
                        npsScore = analytics.npsScore || 7;
                    }
                } catch (err) {
                    // Use defaults if analytics not available
                }

                // Get payment failures (simplified - check subscription status)
                const paymentFailures = subscription.paymentFailures || 0;

                // Calculate churn risk
                const churnResult = this.calculateChurnRisk({
                    usageChange,
                    daysSinceLogin,
                    paymentFailures,
                    supportTickets,
                    npsScore,
                    contractAge
                });

                // Track risk levels
                if (churnResult.riskLevel === 'High') {
                    highRiskCount++;
                    atRiskCustomers.push({
                        userId: user._id,
                        userName: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        ...churnResult
                    });
                } else if (churnResult.riskLevel === 'Medium') {
                    mediumRiskCount++;
                    atRiskCustomers.push({
                        userId: user._id,
                        userName: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        ...churnResult
                    });
                } else {
                    lowRiskCount++;
                }
            }

            // Store summary for dashboard
            this.lastScanResult = {
                timestamp: new Date(),
                total: subscriptions.length,
                highRisk: highRiskCount,
                mediumRisk: mediumRiskCount,
                lowRisk: lowRiskCount,
                atRiskCustomers: atRiskCustomers.sort((a, b) => b.probability - a.probability)
            };

            // Save to history for trend visualization
            try {
                await ChurnScanHistory.recordScan({
                    totalCustomers: subscriptions.length,
                    atRiskCustomers: atRiskCustomers.map(c => ({
                        userId: c.userId,
                        probability: c.probability,
                        riskLevel: c.riskLevel
                    }))
                }, {
                    scanType: 'automatic'
                });
                console.log('   💾 Scan result saved to history');
            } catch (historyError) {
                console.error('   ⚠️ Failed to save scan history:', historyError.message);
            }

            console.log('\n📈 Churn Risk Scan Summary:');
            console.log(`   Total customers scanned: ${subscriptions.length}`);
            console.log(`   🔴 High Risk: ${highRiskCount}`);
            console.log(`   🟡 Medium Risk: ${mediumRiskCount}`);
            console.log(`   🟢 Low Risk: ${lowRiskCount}`);

            // Generate notifications for high-risk customers
            if (highRiskCount > 0 || mediumRiskCount > 0) {
                await this.generateAdminNotification(atRiskCustomers);
            }

            return this.lastScanResult;

        } catch (error) {
            console.error('❌ Error in churn scan:', error.message);
            return null;
        }
    }

    /**
     * Generate notification for admin about at-risk customers
     */
    async generateAdminNotification(atRiskCustomers) {
        const highRiskCustomers = atRiskCustomers.filter(c => c.riskLevel === 'High');
        const mediumRiskCustomers = atRiskCustomers.filter(c => c.riskLevel === 'Medium');
        const lowRiskCount = this.lastScanResult?.lowRisk || 0;

        if (highRiskCustomers.length > 0) {
            console.log(`\n🚨 ALERT: ${highRiskCustomers.length} customers at HIGH churn risk!`);
            highRiskCustomers.forEach(c => {
                console.log(`   - ${c.userName} (${c.email}): ${c.probability}% risk`);
            });

            // Send email alert to admin if enabled
            if (this.emailAlertsEnabled && process.env.ADMIN_EMAIL) {
                try {
                    const { sendHighRiskAlert } = require('./emailService');
                    await sendHighRiskAlert(process.env.ADMIN_EMAIL, {
                        highRiskCount: highRiskCustomers.length,
                        mediumRiskCount: mediumRiskCustomers.length,
                        lowRiskCount: lowRiskCount,
                        total: this.lastScanResult?.total || 0,
                        topAtRisk: highRiskCustomers.slice(0, 5).map(c => ({
                            name: c.userName,
                            email: c.email,
                            riskLevel: c.riskLevel,
                            probability: c.probability
                        }))
                    });
                    console.log('📧 Email alert sent to admin');
                } catch (emailError) {
                    console.log('⚠️ Email alert failed:', emailError.message);
                }
            }
        }

        if (mediumRiskCustomers.length > 0) {
            console.log(`\n⚡ WARNING: ${mediumRiskCustomers.length} customers at MEDIUM churn risk`);
        }

        console.log('📝 Churn alerts logged to console');
    }

    /**
     * Enable/disable email alerts
     */
    setEmailAlerts(enabled) {
        this.emailAlertsEnabled = enabled;
        console.log(`📧 Email alerts ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if email alerts are enabled
     */
    isEmailAlertsEnabled() {
        return this.emailAlertsEnabled;
    }

    /**
     * Get the last scan results
     */
    getLastScanResult() {
        return this.lastScanResult || null;
    }

    /**
     * Manually trigger a scan
     */
    async triggerScan() {
        return await this.scanAllCustomers();
    }
}

// Export singleton instance
const churnMonitoringService = new ChurnMonitoringService();
module.exports = churnMonitoringService;
