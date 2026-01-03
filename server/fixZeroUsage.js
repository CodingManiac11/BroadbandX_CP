const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');
const UsageLog = require('./models/UsageLog');
const Plan = require('./models/Plan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixZeroUsage() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all active subscriptions
    const activeSubscriptions = await Subscription.find({ status: 'active' }).populate('plan');
    console.log(`📊 Found ${activeSubscriptions.length} active subscriptions\n`);
    
    let generated = 0;
    let skipped = 0;
    
    for (const subscription of activeSubscriptions) {
      const userId = subscription.user;
      const userName = `User ${userId.toString().slice(-6)}`;
      
      // Check if user already has usage data
      const existingLogs = await UsageLog.countDocuments({ userId });
      
      if (existingLogs > 0) {
        console.log(`⏭️  ${userName}: Already has ${existingLogs} usage logs - skipping`);
        skipped++;
        continue;
      }
      
      console.log(`👤 ${userName}: Generating usage data...`);
      
      const sampleLogs = [];
      const now = new Date();
      const startDate = new Date(subscription.startDate || subscription.createdAt);
      
      // Generate usage for the past 7 days or since subscription start
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        if (date >= startDate) {
          date.setHours(12, 0, 0, 0);
          
          // Random realistic usage between 0.5-3 GB per day
          const downloadBytes = (Math.random() * 2.5 + 0.5) * 1024 * 1024 * 1024; // 0.5-3 GB
          const uploadBytes = (Math.random() * 0.4 + 0.1) * 1024 * 1024 * 1024; // 0.1-0.5 GB
          
          sampleLogs.push({
            userId,
            deviceId: `device-${userId.toString().slice(-6)}`,
            deviceType: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            timestamp: date,
            download: downloadBytes,
            upload: uploadBytes,
            downloadSpeed: subscription.plan?.features?.speed?.download || 25,
            uploadSpeed: subscription.plan?.features?.speed?.upload || 5,
            latency: Math.random() * 20 + 10, // 10-30ms
            packetLoss: Math.random() * 2, // 0-2%
            sessionDuration: Math.floor(Math.random() * 120 + 30) // 30-150 minutes
          });
        }
      }
      
      if (sampleLogs.length > 0) {
        await UsageLog.insertMany(sampleLogs);
        const totalGB = sampleLogs.reduce((sum, log) => sum + log.download + log.upload, 0) / (1024 * 1024 * 1024);
        console.log(`   ✅ Created ${sampleLogs.length} usage logs (${totalGB.toFixed(2)} GB total)\n`);
        generated++;
      }
    }
    
    console.log('═══════════════════════════════════════');
    console.log(`✅ Complete!`);
    console.log(`   Generated usage for: ${generated} users`);
    console.log(`   Skipped (has data):  ${skipped} users`);
    console.log('═══════════════════════════════════════\n');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixZeroUsage();
