const mongoose = require('mongoose');
const User = require('./models/User');
const Subscription = require('./models/Subscription');
const UsageLog = require('./models/UsageLog');
require('dotenv').config({ path: '../.env' });

async function addUsageForAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all users with active subscriptions
    const activeSubscriptions = await Subscription.find({ 
      status: 'active' 
    }).populate('user');
    
    console.log(`\n📊 Found ${activeSubscriptions.length} active subscriptions`);
    
    for (const subscription of activeSubscriptions) {
      const userId = subscription.user._id;
      const userName = `${subscription.user.firstName} ${subscription.user.lastName}`;
      
      console.log(`\n👤 Processing: ${userName} (${userId})`);
      
      // Check if user already has usage data
      const existingLogs = await UsageLog.countDocuments({ userId });
      if (existingLogs > 0) {
        console.log(`   ℹ️  Already has ${existingLogs} usage logs - skipping`);
        continue;
      }
      
      // Generate usage data for the past 7 days
      const sampleLogs = [];
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(12, 0, 0, 0);
        
        // Random usage between 1-5 GB per day
        const downloadBytes = (Math.random() * 4 + 1) * 1024 * 1024 * 1024; // 1-5 GB
        const uploadBytes = (Math.random() * 0.5 + 0.2) * 1024 * 1024 * 1024; // 0.2-0.7 GB
        
        sampleLogs.push({
          userId,
          deviceId: `device-${userId.toString().slice(-6)}`,
          deviceType: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          timestamp: date,
          download: downloadBytes,
          upload: uploadBytes,
          downloadSpeed: 25, // Mbps
          uploadSpeed: 5, // Mbps
          latency: Math.random() * 20 + 10, // 10-30ms
          packetLoss: Math.random() * 2, // 0-2%
          sessionDuration: 60 // 60 minutes
        });
      }
      
      // Insert sample logs
      await UsageLog.insertMany(sampleLogs);
      
      // Calculate totals
      const totalDownload = sampleLogs.reduce((sum, log) => sum + log.download, 0);
      const totalUpload = sampleLogs.reduce((sum, log) => sum + log.upload, 0);
      const totalGB = (totalDownload + totalUpload) / (1024 * 1024 * 1024);
      
      console.log(`   ✅ Added ${sampleLogs.length} usage logs`);
      console.log(`   📊 Total Usage: ${totalGB.toFixed(2)} GB`);
    }
    
    console.log('\n✅ All done!');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addUsageForAllUsers();
