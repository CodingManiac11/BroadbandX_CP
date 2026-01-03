const mongoose = require('mongoose');
const User = require('./models/User');
const Subscription = require('./models/Subscription');
const UsageLog = require('./models/UsageLog');
const Plan = require('./models/Plan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function generateUsageForSpecificUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find specific users by name or email
    const targetNames = ['randeep', 'divyaratnam'];
    
    console.log('🔍 Searching for users matching:', targetNames.join(', '));
    
    const users = await User.find({
      $or: [
        { firstName: { $regex: new RegExp(targetNames.join('|'), 'i') } },
        { lastName: { $regex: new RegExp(targetNames.join('|'), 'i') } },
        { email: { $regex: new RegExp(targetNames.join('|'), 'i') } }
      ]
    });
    
    console.log(`\n📊 Found ${users.length} matching users:\n`);
    
    for (const user of users) {
      const userName = `${user.firstName} ${user.lastName}`;
      const userId = user._id;
      
      console.log(`👤 ${userName} (${user.email})`);
      console.log(`   User ID: ${userId}`);
      
      // Find their subscription
      const subscription = await Subscription.findOne({ 
        user: userId, 
        status: 'active' 
      }).populate('plan');
      
      if (!subscription) {
        console.log(`   ⚠️  No active subscription found - skipping\n`);
        continue;
      }
      
      console.log(`   📋 Plan: ${subscription.plan?.name}`);
      
      // Check existing usage
      const existingLogs = await UsageLog.countDocuments({ userId });
      console.log(`   📊 Current usage logs: ${existingLogs}`);
      
      if (existingLogs > 0) {
        // Delete existing logs to regenerate
        console.log(`   🗑️  Deleting ${existingLogs} existing logs...`);
        await UsageLog.deleteMany({ userId });
      }
      
      console.log(`   🔄 Generating new usage data...`);
      
      const sampleLogs = [];
      const now = new Date();
      const startDate = new Date(subscription.startDate || subscription.createdAt);
      
      // Generate usage for the past 7 days or since subscription start
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        if (date >= startDate) {
          date.setHours(12, 0, 0, 0);
          
          // Random realistic usage between 0.5-4 GB per day
          const downloadBytes = (Math.random() * 3.5 + 0.5) * 1024 * 1024 * 1024; // 0.5-4 GB
          const uploadBytes = (Math.random() * 0.5 + 0.1) * 1024 * 1024 * 1024; // 0.1-0.6 GB
          
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
        const totalDownload = sampleLogs.reduce((sum, log) => sum + log.download, 0);
        const totalUpload = sampleLogs.reduce((sum, log) => sum + log.upload, 0);
        const totalGB = (totalDownload + totalUpload) / (1024 * 1024 * 1024);
        console.log(`   ✅ Created ${sampleLogs.length} usage logs`);
        console.log(`   📈 Total Usage: ${totalGB.toFixed(2)} GB (${(totalDownload / (1024 * 1024 * 1024)).toFixed(2)} GB down, ${(totalUpload / (1024 * 1024 * 1024)).toFixed(2)} GB up)\n`);
      }
    }
    
    console.log('═══════════════════════════════════════');
    console.log('✅ Complete!');
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

generateUsageForSpecificUsers();
