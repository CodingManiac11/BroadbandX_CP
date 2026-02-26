const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const emailService = require('./emailService');

/**
 * SubscriptionExpiryService
 * 
 * Handles the subscription lifecycle:
 * - Detects expired subscriptions (endDate < now)
 * - If autoRenewal enabled: extends endDate by 30 days
 * - If autoRenewal disabled: moves to grace_period (3-day window)
 * - After grace period: moves to suspended
 */
class SubscriptionExpiryService {
    constructor() {
        this.jobs = [];
        this.GRACE_PERIOD_DAYS = 3;
        this.start();
    }

    start() {
        console.log('⏰ Starting Subscription Expiry Service...');

        // Run daily at 12:01 AM
        this.jobs.push(
            cron.schedule('1 0 * * *', async () => {
                console.log('🔄 [ExpiryService] Running daily expiry check...');
                await this.processExpiredSubscriptions();
                await this.processGracePeriodEnd();
            })
        );

        // Also run immediately on startup to catch any missed expirations
        setTimeout(async () => {
            console.log('🔄 [ExpiryService] Running startup expiry check...');
            await this.processExpiredSubscriptions();
            await this.processGracePeriodEnd();
        }, 5000); // 5 second delay to let DB connect

        console.log('✅ Subscription Expiry Service started');
    }

    stop() {
        this.jobs.forEach(job => job.stop());
        console.log('🛑 Subscription Expiry Service stopped');
    }

    /**
     * Process subscriptions that have passed their endDate.
     * - If autoRenewal enabled: extend by 30 days
     * - Otherwise: move to grace_period with 3-day window
     */
    async processExpiredSubscriptions() {
        try {
            const now = new Date();

            // Find active subscriptions that have passed their endDate
            const expiredSubs = await Subscription.find({
                status: 'active',
                endDate: { $lt: now }
            })
                .populate('user', 'firstName lastName email')
                .populate('plan', 'name pricing');

            if (expiredSubs.length === 0) {
                console.log('✅ [ExpiryService] No expired subscriptions found');
                return;
            }

            console.log(`📋 [ExpiryService] Found ${expiredSubs.length} expired subscription(s)`);

            let renewed = 0;
            let graced = 0;

            for (const sub of expiredSubs) {
                try {
                    if (sub.autoRenewal && sub.autoRenewal.enabled) {
                        // Auto-renew: extend endDate by 30 days
                        const newEndDate = new Date(sub.endDate);
                        newEndDate.setDate(newEndDate.getDate() + 30);

                        sub.endDate = newEndDate;
                        sub.autoRenewal.nextRenewalDate = newEndDate;

                        // Add payment record
                        sub.paymentHistory.push({
                            date: new Date(),
                            amount: sub.pricing.totalAmount || sub.pricing.basePrice,
                            paymentMethod: 'auto-renewal',
                            status: 'completed',
                            invoiceNumber: `INV-AR-${Date.now()}`
                        });

                        await sub.save();

                        // Add service history
                        try {
                            await sub.addServiceHistory(
                                'renewed',
                                'Subscription auto-renewed',
                                sub.user._id,
                                { newEndDate: newEndDate.toISOString() }
                            );
                        } catch (histErr) {
                            console.log('  ⚠️ Could not add service history:', histErr.message);
                        }

                        renewed++;
                        console.log(`  ✅ Auto-renewed: ${sub.user?.firstName} ${sub.user?.lastName} → ${newEndDate.toDateString()}`);
                    } else {
                        // Move to grace period
                        const gracePeriodEnd = new Date(sub.endDate);
                        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);

                        sub.status = 'grace_period';
                        sub.gracePeriodEnd = gracePeriodEnd;
                        await sub.save();

                        // Send expiry email
                        try {
                            if (sub.user?.email) {
                                await emailService.sendEmail(sub.user.email, 'SUBSCRIPTION_EXPIRED', {
                                    firstName: sub.user.firstName,
                                    planName: sub.plan?.name || sub.planName || 'your plan',
                                    gracePeriodDays: this.GRACE_PERIOD_DAYS,
                                    gracePeriodEnd: gracePeriodEnd.toLocaleDateString()
                                });
                            }
                        } catch (emailErr) {
                            console.log('  ⚠️ Could not send expiry email:', emailErr.message);
                        }

                        graced++;
                        console.log(`  ⚠️ Grace period started: ${sub.user?.firstName} ${sub.user?.lastName} → ends ${gracePeriodEnd.toDateString()}`);
                    }
                } catch (subErr) {
                    console.error(`  ❌ Error processing subscription ${sub._id}:`, subErr.message);
                }
            }

            console.log(`📊 [ExpiryService] Summary: ${renewed} renewed, ${graced} in grace period`);
        } catch (error) {
            console.error('❌ [ExpiryService] Error processing expired subscriptions:', error.message);
        }
    }

    /**
     * Process subscriptions whose grace period has ended.
     * Moves them to suspended status.
     */
    async processGracePeriodEnd() {
        try {
            const now = new Date();

            const gracedSubs = await Subscription.find({
                status: 'grace_period',
                gracePeriodEnd: { $lt: now }
            })
                .populate('user', 'firstName lastName email')
                .populate('plan', 'name');

            if (gracedSubs.length === 0) {
                console.log('✅ [ExpiryService] No grace periods ended');
                return;
            }

            console.log(`📋 [ExpiryService] Found ${gracedSubs.length} grace period(s) ended`);

            for (const sub of gracedSubs) {
                try {
                    sub.status = 'suspended';
                    await sub.save();

                    // Send suspension email
                    try {
                        if (sub.user?.email) {
                            await emailService.sendEmail(sub.user.email, 'SUBSCRIPTION_SUSPENDED', {
                                firstName: sub.user.firstName,
                                planName: sub.plan?.name || sub.planName || 'your plan'
                            });
                        }
                    } catch (emailErr) {
                        console.log('  ⚠️ Could not send suspension email:', emailErr.message);
                    }

                    console.log(`  🚫 Suspended: ${sub.user?.firstName} ${sub.user?.lastName}`);
                } catch (subErr) {
                    console.error(`  ❌ Error suspending subscription ${sub._id}:`, subErr.message);
                }
            }
        } catch (error) {
            console.error('❌ [ExpiryService] Error processing grace period end:', error.message);
        }
    }
}

// Export singleton instance
const subscriptionExpiryService = new SubscriptionExpiryService();
module.exports = subscriptionExpiryService;
