/**
 * Scheduled Report Service
 * Automatically generates and emails weekly/monthly AI pricing reports to admins
 */

const cron = require('node-cron');

class ScheduledReportService {
    constructor() {
        this.isRunning = false;
        this.weeklyJob = null;
        this.monthlyJob = null;

        // Configuration (can be updated via API)
        this.config = {
            weeklyEnabled: process.env.WEEKLY_REPORTS_ENABLED !== 'false',
            monthlyEnabled: process.env.MONTHLY_REPORTS_ENABLED !== 'false',
            adminEmail: process.env.ADMIN_EMAIL || null,
            weeklyDay: 1, // Monday (0=Sunday, 1=Monday, etc.)
            weeklyHour: 9, // 9 AM
            monthlyDay: 1, // 1st of month
            monthlyHour: 9 // 9 AM
        };
    }

    /**
     * Start the scheduled report service
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Scheduled Report Service already running');
            return;
        }

        console.log('📅 Starting Scheduled Report Service...');
        this.isRunning = true;

        // Weekly report: Every Monday at 9 AM
        if (this.config.weeklyEnabled) {
            const weeklySchedule = `0 ${this.config.weeklyHour} * * ${this.config.weeklyDay}`;
            this.weeklyJob = cron.schedule(weeklySchedule, () => {
                this.generateReport('Weekly');
            });
            console.log(`   📊 Weekly reports enabled (Every Monday at ${this.config.weeklyHour}:00)`);
        }

        // Monthly report: 1st of each month at 9 AM
        if (this.config.monthlyEnabled) {
            const monthlySchedule = `0 ${this.config.monthlyHour} ${this.config.monthlyDay} * *`;
            this.monthlyJob = cron.schedule(monthlySchedule, () => {
                this.generateReport('Monthly');
            });
            console.log(`   📈 Monthly reports enabled (1st of month at ${this.config.monthlyHour}:00)`);
        }

        console.log('✅ Scheduled Report Service started');
    }

    /**
     * Stop the scheduled report service
     */
    stop() {
        if (this.weeklyJob) {
            this.weeklyJob.stop();
            this.weeklyJob = null;
        }
        if (this.monthlyJob) {
            this.monthlyJob.stop();
            this.monthlyJob = null;
        }
        this.isRunning = false;
        console.log('🛑 Scheduled Report Service stopped');
    }

    /**
     * Generate and send a report
     * @param {string} period - 'Weekly' or 'Monthly'
     */
    async generateReport(period) {
        console.log(`\n📊 Generating ${period} AI Pricing Report...`);

        if (!this.config.adminEmail) {
            console.log('⚠️ No ADMIN_EMAIL configured, skipping report');
            return;
        }

        try {
            // Get current risk data
            const churnMonitoringService = require('./churnMonitoringService');
            let scanResult = churnMonitoringService.getLastScanResult();

            // If no recent scan, trigger one
            if (!scanResult) {
                console.log('   Running fresh scan for report...');
                scanResult = await churnMonitoringService.triggerScan();
            }

            if (!scanResult) {
                console.log('⚠️ No scan data available for report');
                return;
            }

            // Calculate average probability
            const atRiskCustomers = scanResult.atRiskCustomers || [];
            const avgProbability = atRiskCustomers.length > 0
                ? Math.round(atRiskCustomers.reduce((sum, c) => sum + c.probability, 0) / atRiskCustomers.length)
                : 0;

            // Generate trend analysis text
            let trends = '';
            if (scanResult.highRisk > 0) {
                trends = `There are ${scanResult.highRisk} high-risk customers requiring immediate attention. `;
            }
            if (scanResult.mediumRisk > 0) {
                trends += `${scanResult.mediumRisk} customers are showing early warning signs and should be monitored closely.`;
            }
            if (scanResult.highRisk === 0 && scanResult.mediumRisk === 0) {
                trends = 'All customers are currently in good standing with low churn risk.';
            }

            // Send the report email
            const { sendScheduledReport } = require('./emailService');
            await sendScheduledReport(this.config.adminEmail, {
                period: period,
                generatedAt: new Date().toLocaleString(),
                highRiskCount: scanResult.highRisk || 0,
                mediumRiskCount: scanResult.mediumRisk || 0,
                lowRiskCount: scanResult.lowRisk || 0,
                total: scanResult.total || 0,
                avgProbability: avgProbability,
                trends: trends
            });

            console.log(`✅ ${period} report sent to ${this.config.adminEmail}`);

        } catch (error) {
            console.error(`❌ Error generating ${period} report:`, error.message);
        }
    }

    /**
     * Update report configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('📅 Report configuration updated:', this.config);

        // Restart jobs with new configuration
        this.stop();
        this.start();
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return {
            ...this.config,
            isRunning: this.isRunning
        };
    }

    /**
     * Manually trigger a report
     */
    async triggerReport(period = 'Manual') {
        return await this.generateReport(period);
    }
}

// Export singleton instance
const scheduledReportService = new ScheduledReportService();
module.exports = scheduledReportService;
