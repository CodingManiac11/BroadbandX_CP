/**
 * Usage Simulator Service
 * 
 * Automatically generates realistic usage data for all active subscribers.
 * Runs hourly to simulate ongoing data consumption.
 */

const UsageLog = require('../models/UsageLog');
const Subscription = require('../models/Subscription');

class UsageSimulatorService {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.lastRun = null;

        // Configuration
        this.config = {
            // Run interval (1 hour in milliseconds)
            interval: 60 * 60 * 1000,

            // Usage intensity (what % of plan limit to use monthly)
            usageIntensity: 0.6,

            // Daily variance
            dailyVariance: 0.3,

            // Download:Upload ratio
            downloadRatio: 0.8,

            // Device types
            deviceTypes: ['Desktop', 'Mobile', 'Tablet', 'IoT', 'Other'],

            // Hourly usage weights (0-23)
            hourlyPattern: [
                0.02, 0.01, 0.01, 0.01, 0.01, 0.02,
                0.03, 0.04, 0.05, 0.05, 0.04, 0.04,
                0.05, 0.04, 0.04, 0.04, 0.05, 0.06,
                0.08, 0.09, 0.10, 0.08, 0.06, 0.04
            ],

            weekendBoost: 1.2
        };

        this.GB_TO_BYTES = 1024 * 1024 * 1024;
    }

    // Utility functions
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    randomInt(min, max) {
        return Math.floor(this.randomFloat(min, max + 1));
    }

    getRandomDeviceType() {
        return this.config.deviceTypes[this.randomInt(0, this.config.deviceTypes.length - 1)];
    }

    generateIP() {
        return `192.168.${this.randomInt(1, 254)}.${this.randomInt(1, 254)}`;
    }

    // Calculate hourly target based on plan
    calculateHourlyTarget(plan) {
        const dataLimitGB = plan.features?.dataLimit?.unlimited
            ? 1000
            : (plan.features?.dataLimit?.amount || 500);

        const monthlyTargetBytes = dataLimitGB * this.GB_TO_BYTES * this.config.usageIntensity;
        const dailyTarget = monthlyTargetBytes / 30;

        const hour = new Date().getHours();
        const hourlyWeight = this.config.hourlyPattern[hour];

        // Weekend boost
        const dayOfWeek = new Date().getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const weekendMultiplier = isWeekend ? this.config.weekendBoost : 1;

        // Add variance
        const variance = 1 + this.randomFloat(-this.config.dailyVariance, this.config.dailyVariance);

        return dailyTarget * hourlyWeight * weekendMultiplier * variance;
    }

    // Generate a single usage record
    generateUsageRecord(userId, plan) {
        const hourlyTarget = this.calculateHourlyTarget(plan);

        const download = Math.floor(hourlyTarget * this.config.downloadRatio);
        const upload = Math.floor(hourlyTarget * (1 - this.config.downloadRatio));

        const downloadSpeedMax = plan.features?.speed?.download || 100;
        const uploadSpeedMax = plan.features?.speed?.upload || 50;

        return {
            userId,
            deviceId: `DEV-${userId.toString().slice(-6)}-${this.randomInt(1, 5)}`,
            deviceType: this.getRandomDeviceType(),
            timestamp: new Date(),
            download,
            upload,
            downloadSpeed: Math.round(downloadSpeedMax * this.randomFloat(0.6, 0.9) * 100) / 100,
            uploadSpeed: Math.round(uploadSpeedMax * this.randomFloat(0.6, 0.9) * 100) / 100,
            latency: this.randomInt(5, 45),
            packetLoss: Math.round(this.randomFloat(0, 0.5) * 100) / 100,
            ipAddress: this.generateIP(),
            sessionDuration: this.randomInt(15, 60)
        };
    }

    // Main simulation run
    async runSimulation() {
        if (this.isRunning) {
            console.log('⏳ Usage simulation already in progress, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            // Get all active subscriptions
            const subscriptions = await Subscription.find({
                status: { $in: ['active', 'trial'] }
            }).populate('plan');

            if (subscriptions.length === 0) {
                console.log('⚠️ No active subscriptions found for simulation');
                return;
            }

            const usageLogs = [];

            for (const subscription of subscriptions) {
                // Skip if no valid plan
                if (!subscription.plan) continue;

                const userId = subscription.user._id || subscription.user;

                // Generate 1-3 usage records per hour (simulating multiple sessions)
                const recordCount = this.randomInt(1, 3);

                for (let i = 0; i < recordCount; i++) {
                    usageLogs.push(this.generateUsageRecord(userId, subscription.plan));
                }
            }

            // Bulk insert
            if (usageLogs.length > 0) {
                await UsageLog.insertMany(usageLogs);
            }

            const duration = Date.now() - startTime;
            this.lastRun = new Date();

            console.log(`📊 Usage simulation complete: ${usageLogs.length} records for ${subscriptions.length} subscribers (${duration}ms)`);

        } catch (error) {
            console.error('❌ Usage simulation error:', error);
        } finally {
            this.isRunning = false;
        }
    }

    // Start the service
    start() {
        if (this.intervalId) {
            console.log('⚠️ Usage Simulator Service already running');
            return;
        }

        console.log('📈 Usage Simulator Service started - will generate usage every hour');

        // Run immediately on start
        this.runSimulation();

        // Schedule hourly runs
        this.intervalId = setInterval(() => {
            this.runSimulation();
        }, this.config.interval);
    }

    // Stop the service
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 Usage Simulator Service stopped');
        }
    }

    // Get service status
    getStatus() {
        return {
            running: !!this.intervalId,
            lastRun: this.lastRun,
            nextRun: this.intervalId ? new Date(Date.now() + this.config.interval) : null,
            interval: `${this.config.interval / 60000} minutes`
        };
    }
}

// Export singleton
module.exports = new UsageSimulatorService();
