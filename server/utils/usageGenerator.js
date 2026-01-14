const mongoose = require('mongoose');
const UsageLog = require('../models/UsageLog');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

/**
 * Generate realistic usage data for a specific user based on their plan
 * Each user gets unique consumption patterns
 */
async function generateUserUsage(userId, subscriptionId, daysBack = 30) {
  try {
    const subscription = await Subscription.findById(subscriptionId).populate('plan');
    const user = await User.findById(userId);
    
    if (!subscription || !user) {
      throw new Error('User or subscription not found');
    }

    // Get plan details
    const plan = subscription.plan;
    const downloadSpeed = plan.features?.speed?.download || 25; // Mbps
    const uploadSpeed = plan.features?.speed?.upload || 5; // Mbps
    const dataLimit = plan.features?.dataLimit?.amount || 100; // GB

    // Create unique user characteristics based on user ID
    const userSeed = parseInt(userId.toString().slice(-8), 16);
    const random = (seed) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // User-specific usage patterns
    const usageProfile = {
      heavyUser: random(userSeed) > 0.6, // 40% heavy users
      peakHours: Math.floor(random(userSeed + 1) * 5) + 18, // Peak time 18-22
      avgDailyHours: random(userSeed + 2) * 6 + 4, // 4-10 hours/day
      weekendMultiplier: random(userSeed + 3) * 0.5 + 1.2, // 1.2-1.7x on weekends
      streamingUser: random(userSeed + 4) > 0.5, // 50% streaming users
      downloadBias: random(userSeed + 5) * 0.2 + 0.75 // 75-95% download ratio (5-25% upload)
    };

    // Calculate daily data target (use 70-90% of limit over billing cycle)
    const targetUsagePercent = random(userSeed + 6) * 0.2 + 0.7; // 70-90%
    const totalTargetGB = dataLimit * targetUsagePercent;
    const avgDailyGB = totalTargetGB / 30;

    // Adjust for heavy vs light users
    const baseDaily = usageProfile.heavyUser 
      ? avgDailyGB * 1.3 
      : avgDailyGB * 0.7;

    console.log(`📊 Generating usage for ${user.firstName}: ${baseDaily.toFixed(2)} GB/day avg (${usageProfile.heavyUser ? 'Heavy' : 'Light'} user)`);

    const usageLogs = [];
    const startDate = new Date(subscription.startDate || subscription.createdAt);
    const now = new Date();

    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Skip if before subscription start
      if (date < startDate) continue;

      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Daily variance
      const dayMultiplier = isWeekend 
        ? usageProfile.weekendMultiplier 
        : 1.0;
      
      // Random daily variation (-20% to +20%)
      const dailyVariation = (random(userSeed + i) - 0.5) * 0.4 + 1.0;
      
      // Calculate day's total data
      const dailyGB = baseDaily * dayMultiplier * dailyVariation;
      const dailyBytes = dailyGB * 1024 * 1024 * 1024;
      
      // Split into download/upload based on user profile
      const downloadBytes = dailyBytes * usageProfile.downloadBias;
      const uploadBytes = dailyBytes * (1 - usageProfile.downloadBias);

      // Generate multiple sessions per day (2-6 sessions)
      const sessionsToday = Math.floor(random(userSeed + i + 100) * 4) + 2;
      
      for (let session = 0; session < sessionsToday; session++) {
        const sessionTime = new Date(date);
        
        // Distribute sessions throughout the day with bias toward peak hours
        let hour;
        if (random(userSeed + i + session) > 0.5) {
          // Peak hours
          hour = usageProfile.peakHours + Math.floor(random(userSeed + i + session + 200) * 4);
        } else {
          // Off-peak
          hour = Math.floor(random(userSeed + i + session + 300) * 24);
        }
        hour = hour % 24;
        
        const minute = Math.floor(random(userSeed + i + session + 400) * 60);
        sessionTime.setHours(hour, minute, 0, 0);

        // Session duration (30 min to 4 hours)
        const sessionDuration = Math.floor(random(userSeed + i + session + 500) * 210) + 30;
        
        // Distribute data across sessions (with variation)
        const sessionDataRatio = (1 + random(userSeed + i + session + 600)) / sessionsToday;
        const sessionDownload = (downloadBytes / sessionsToday) * sessionDataRatio;
        const sessionUpload = (uploadBytes / sessionsToday) * sessionDataRatio;

        // Speed varies slightly from plan speed (-20% to +10%)
        const speedVariation = random(userSeed + i + session + 700) * 0.3 - 0.2 + 1.0;
        const actualDownloadSpeed = downloadSpeed * speedVariation;
        const actualUploadSpeed = uploadSpeed * speedVariation;

        // Latency: better at night, worse during peak
        const baseLatency = (hour >= 18 && hour <= 22) ? 35 : 20;
        const latency = baseLatency + random(userSeed + i + session + 800) * 15;

        // Packet loss: usually low
        const packetLoss = random(userSeed + i + session + 900) * 1.5;

        // Device type based on time and user profile
        let deviceType;
        if (hour >= 9 && hour <= 17 && !isWeekend) {
          // Work hours: more desktop
          deviceType = random(userSeed + i + session + 1000) > 0.3 ? 'Desktop' : 'Mobile';
        } else if (usageProfile.streamingUser && (hour < 9 || hour > 22)) {
          // Early/late: streaming on TV/tablet
          deviceType = random(userSeed + i + session + 1100) > 0.5 ? 'Tablet' : 'Mobile';
        } else {
          // Default distribution
          const deviceRand = random(userSeed + i + session + 1200);
          if (deviceRand > 0.6) deviceType = 'Mobile';
          else if (deviceRand > 0.3) deviceType = 'Desktop';
          else deviceType = 'Tablet';
        }

        usageLogs.push({
          userId: new mongoose.Types.ObjectId(userId),
          deviceId: `${deviceType.toLowerCase()}-${user.firstName.toLowerCase()}-${Math.floor(random(userSeed + session) * 100)}`,
          deviceType,
          timestamp: sessionTime,
          download: sessionDownload,
          upload: sessionUpload,
          downloadSpeed: Math.max(1, actualDownloadSpeed),
          uploadSpeed: Math.max(1, actualUploadSpeed),
          latency: Math.max(5, latency),
          packetLoss: Math.max(0, Math.min(5, packetLoss)),
          sessionDuration,
          ipAddress: `${Math.floor(random(userSeed + i) * 255)}.${Math.floor(random(userSeed + i + 1) * 255)}.${Math.floor(random(userSeed + i + 2) * 255)}.${Math.floor(random(userSeed + session) * 255)}`
        });
      }
    }

    // Insert all usage logs
    if (usageLogs.length > 0) {
      await UsageLog.insertMany(usageLogs);
      
      const totalUsageBytes = usageLogs.reduce((sum, log) => sum + log.download + log.upload, 0);
      const totalUsageGB = totalUsageBytes / (1024 * 1024 * 1024);
      
      console.log(`✅ Generated ${usageLogs.length} usage logs for ${user.firstName}`);
      console.log(`   Total usage: ${totalUsageGB.toFixed(2)} GB (${((totalUsageGB/dataLimit)*100).toFixed(1)}% of ${dataLimit}GB limit)`);
      
      return {
        success: true,
        user: user.firstName,
        logsCreated: usageLogs.length,
        totalUsageGB: totalUsageGB.toFixed(2),
        usagePercentage: ((totalUsageGB/dataLimit)*100).toFixed(1),
        dataLimit: dataLimit
      };
    }

    return { success: false, message: 'No logs generated' };

  } catch (error) {
    console.error(`❌ Error generating usage for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Generate usage for all users with active subscriptions
 */
async function generateUsageForAllUsers(daysBack = 30) {
  try {
    const activeSubscriptions = await Subscription.find({ status: 'active' })
      .populate('user')
      .populate('plan');
    
    console.log(`🚀 Found ${activeSubscriptions.length} active subscriptions`);
    
    const results = [];
    let generated = 0;
    let skipped = 0;

    for (const subscription of activeSubscriptions) {
      try {
        const userId = subscription.user._id;
        const userName = subscription.user.firstName;

        // Check if user already has recent usage data
        const recentLogs = await UsageLog.countDocuments({
          userId,
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        if (recentLogs > 5) {
          console.log(`⏭️  Skipping ${userName} - already has recent usage data`);
          skipped++;
          continue;
        }

        // Delete old usage logs for clean regeneration
        await UsageLog.deleteMany({ userId });
        console.log(`🗑️  Cleared old usage data for ${userName}`);

        // Generate new usage
        const result = await generateUserUsage(userId, subscription._id, daysBack);
        results.push(result);
        generated++;

      } catch (error) {
        console.error(`Error processing subscription ${subscription._id}:`, error);
        results.push({
          success: false,
          user: subscription.user?.firstName || 'Unknown',
          error: error.message
        });
      }
    }

    return {
      success: true,
      generated,
      skipped,
      total: activeSubscriptions.length,
      results
    };

  } catch (error) {
    console.error('Error in generateUsageForAllUsers:', error);
    throw error;
  }
}

module.exports = {
  generateUserUsage,
  generateUsageForAllUsers
};
