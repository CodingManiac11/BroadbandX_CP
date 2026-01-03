const mongoose = require('mongoose');
const UsageLog = require('./models/UsageLog');
require('dotenv').config({ path: '../.env' });

async function addSampleUsage() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const userId = '694ceb639d075759fba7c2ce';
    const deviceId = 'device-001';
    
    // Generate usage data for the past 7 days
    const sampleLogs = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(12, 0, 0, 0); // Noon each day
      
      // Random usage between 1-5 GB per day
      const downloadBytes = (Math.random() * 4 + 1) * 1024 * 1024 * 1024; // 1-5 GB
      const uploadBytes = (Math.random() * 0.5 + 0.2) * 1024 * 1024 * 1024; // 0.2-0.7 GB
      
      sampleLogs.push({
        userId,
        deviceId,
        deviceType: 'Desktop',
        ipAddress: '192.168.1.100',
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
    
    // Delete existing logs for this user (for testing)
    await UsageLog.deleteMany({ userId });
    console.log('🗑️  Deleted existing usage logs');
    
    // Insert sample logs
    await UsageLog.insertMany(sampleLogs);
    console.log(`✅ Added ${sampleLogs.length} sample usage logs`);
    
    // Calculate totals
    const totalDownload = sampleLogs.reduce((sum, log) => sum + log.download, 0);
    const totalUpload = sampleLogs.reduce((sum, log) => sum + log.upload, 0);
    const totalGB = (totalDownload + totalUpload) / (1024 * 1024 * 1024);
    
    console.log(`\n📊 USAGE SUMMARY:`);
    console.log(`Total Download: ${(totalDownload / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`Total Upload: ${(totalUpload / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`Total Usage: ${totalGB.toFixed(2)} GB`);
    console.log(`Data Limit: 100 GB`);
    console.log(`Usage Percentage: ${(totalGB / 100 * 100).toFixed(1)}%`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addSampleUsage();
