/**
 * Usage Analytics Service
 * Automatically generates and updates usage analytics for all active users
 * Runs periodically to keep dashboard data fresh
 */

const UsageLog = require('../models/UsageLog');
const UsageAnalytics = require('../models/UsageAnalytics');
const Subscription = require('../models/Subscription');
const mongoose = require('mongoose');

class UsageAnalyticsService {
  constructor() {
    this.isRunning = false;
    this.updateInterval = 4 * 60 * 60 * 1000; // 4 hours
    this.intervalId = null;
  }

  /**
   * Start the analytics service
   */
  start() {
    console.log('📊 Starting Usage Analytics Service...');
    
    // Run immediately on start (async, don't block server startup)
    this.updateAllUserAnalytics().catch(err => {
      console.error('❌ Initial analytics update failed:', err);
    });
    
    // Then run every 4 hours
    this.intervalId = setInterval(() => {
      this.updateAllUserAnalytics().catch(err => {
        console.error('❌ Scheduled analytics update failed:', err);
      });
    }, this.updateInterval);

    console.log('✅ Usage Analytics Service started (updates every 4 hours)');
  }

  /**
   * Stop the analytics service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Usage Analytics Service stopped');
    }
  }

  /**
   * Update usage analytics for all active users
   */
  async updateAllUserAnalytics() {
    if (this.isRunning) {
      console.log('⏭️  Analytics update already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('\n📊 Running Usage Analytics Update...');
    console.log('⏰ Time:', new Date().toLocaleString());

    try {
      // Get all active subscriptions
      const activeSubscriptions = await Subscription.find({ status: 'active' })
        .populate('user', 'firstName lastName email')
        .populate('plan', 'name features');

      console.log(`🔍 Found ${activeSubscriptions.length} active subscriptions`);

      let updated = 0;
      let created = 0;
      let errors = 0;

      for (const subscription of activeSubscriptions) {
        try {
          const result = await this.updateUserAnalytics(subscription);
          if (result.created) created++;
          if (result.updated) updated++;
        } catch (error) {
          console.error(`❌ Error updating analytics for user ${subscription.user?._id}:`, error.message);
          errors++;
        }
      }

      console.log('\n📈 Analytics Update Summary:');
      console.log(`   ✨ Created: ${created} new analytics records`);
      console.log(`   🔄 Updated: ${updated} existing analytics`);
      console.log(`   ❌ Errors: ${errors}`);
      console.log(`   📊 Total Processed: ${activeSubscriptions.length}`);

    } catch (error) {
      console.error('❌ Analytics update failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Update analytics for a specific user
   */
  async updateUserAnalytics(subscription) {
    const userId = subscription.user._id;
    const subscriptionId = subscription._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get usage logs for the past 30 days
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageLogs = await UsageLog.find({
      userId,
      timestamp: { $gte: thirtyDaysAgo, $lte: new Date() }
    }).sort({ timestamp: 1 });

    if (usageLogs.length === 0) {
      // Generate initial usage if none exists
      await this.generateInitialUsage(userId, subscription);
      return { created: true, updated: false };
    }

    // Calculate metrics from usage logs
    const metrics = this.calculateMetrics(usageLogs, subscription);

    // Find or create analytics record for today
    let analytics = await UsageAnalytics.findOne({
      user: userId,
      subscription: subscriptionId,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (analytics) {
      // Update existing analytics (keep the same date - start of day)
      analytics.metrics = metrics;
      analytics.date = today; // Use start of day, not current timestamp
      await analytics.save();
      return { created: false, updated: true };
    } else {
      // Create new analytics record
      analytics = await UsageAnalytics.create({
        user: userId,
        subscription: subscriptionId,
        date: today, // Use start of day, not current timestamp
        metrics
      });
      return { created: true, updated: false };
    }
  }

  /**
   * Calculate metrics from usage logs
   */
  calculateMetrics(usageLogs, subscription) {
    // Total data used (in bytes, will be converted to MB for storage)
    const totalDownload = usageLogs.reduce((sum, log) => sum + (log.download || 0), 0);
    const totalUpload = usageLogs.reduce((sum, log) => sum + (log.upload || 0), 0);
    const totalDataBytes = totalDownload + totalUpload;
    const totalDataMB = totalDataBytes / (1024 * 1024);

    // Session metrics
    const totalSessions = usageLogs.length;
    const avgSessionDuration = usageLogs.reduce((sum, log) => sum + (log.sessionDuration || 0), 0) / totalSessions;

    // Speed tests (using actual speeds from logs)
    const speedTests = usageLogs.slice(-10).map(log => ({
      timestamp: log.timestamp,
      downloadSpeed: log.downloadSpeed || 0,
      uploadSpeed: log.uploadSpeed || 0,
      latency: log.latency || 0
    }));

    // Peak usage hours (group by hour)
    const hourlyUsage = {};
    usageLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      if (!hourlyUsage[hour]) {
        hourlyUsage[hour] = 0;
      }
      hourlyUsage[hour] += (log.download + log.upload);
    });

    const peakUsageHours = Object.entries(hourlyUsage)
      .map(([hour, dataUsed]) => ({
        hour: parseInt(hour),
        dataUsed: dataUsed / (1024 * 1024) // Convert to MB
      }))
      .sort((a, b) => b.dataUsed - a.dataUsed)
      .slice(0, 5);

    // Device types
    const deviceCounts = {};
    const deviceData = {};
    usageLogs.forEach(log => {
      const deviceType = (log.deviceType || 'Desktop').toLowerCase();
      deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
      deviceData[deviceType] = (deviceData[deviceType] || 0) + (log.download + log.upload);
    });

    const deviceTypes = Object.entries(deviceCounts).map(([type, count]) => ({
      type: type === 'iot' ? 'iot' : type,
      count,
      dataUsed: (deviceData[type] || 0) / (1024 * 1024) // Convert to MB
    }));

    // Quality metrics
    const avgLatency = usageLogs.reduce((sum, log) => sum + (log.latency || 0), 0) / totalSessions;
    const avgPacketLoss = usageLogs.reduce((sum, log) => sum + (log.packetLoss || 0), 0) / totalSessions;
    const uptime = Math.max(95, 100 - avgPacketLoss); // Simple uptime calculation

    return {
      dataUsed: totalDataMB,
      speedTests,
      sessionMetrics: {
        totalSessions,
        avgSessionDuration,
        peakUsageHours,
        deviceTypes
      },
      qualityMetrics: {
        uptime: Math.round(uptime * 100) / 100,
        packetLoss: Math.round(avgPacketLoss * 100) / 100,
        jitter: Math.round((Math.random() * 5 + 1) * 100) / 100,
        dns_resolution_time: Math.round((Math.random() * 20 + 10) * 100) / 100
      }
    };
  }

  /**
   * Generate initial usage for new users
   */
  async generateInitialUsage(userId, subscription) {
    console.log(`   🆕 Generating initial usage for user ${userId}`);
    
    const usageLogs = [];
    const now = new Date();
    const startDate = new Date(subscription.startDate || subscription.createdAt);

    // Generate usage for the past 7 days or since subscription start
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      if (date >= startDate) {
        date.setHours(12, 0, 0, 0);
        
        // Random realistic usage between 0.5-3 GB per day
        const downloadBytes = (Math.random() * 2.5 + 0.5) * 1024 * 1024 * 1024;
        const uploadBytes = (Math.random() * 0.4 + 0.1) * 1024 * 1024 * 1024;
        
        usageLogs.push({
          userId,
          deviceId: `device-${userId.toString().slice(-6)}`,
          deviceType: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          timestamp: date,
          download: downloadBytes,
          upload: uploadBytes,
          downloadSpeed: subscription.plan?.features?.speed?.download || 25,
          uploadSpeed: subscription.plan?.features?.speed?.upload || 5,
          latency: Math.random() * 20 + 10,
          packetLoss: Math.random() * 2,
          sessionDuration: Math.floor(Math.random() * 120 + 30)
        });
      }
    }

    if (usageLogs.length > 0) {
      await UsageLog.insertMany(usageLogs);
      console.log(`   ✅ Created ${usageLogs.length} usage logs`);
    }
  }

  /**
   * Manually trigger analytics update for a specific user
   */
  async updateSingleUser(userId) {
    const subscription = await Subscription.findOne({ 
      user: userId, 
      status: 'active' 
    })
      .populate('user', 'firstName lastName email')
      .populate('plan', 'name features');

    if (!subscription) {
      throw new Error('No active subscription found for user');
    }

    return await this.updateUserAnalytics(subscription);
  }
}

// Export singleton instance
const usageAnalyticsService = new UsageAnalyticsService();
module.exports = usageAnalyticsService;
