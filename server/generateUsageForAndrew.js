require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const UsageLog = require('./models/UsageLog');

async function generateUsageForAndrew() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://adityautsav1901:aditya1@cluster0.glddswq.mongodb.net/broadband-subscription-db?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find Andrew user
    const user = await User.findOne({ email: 'andrew@gmail.com' });
    
    if (!user) {
      console.log('❌ User andrew@gmail.com not found');
      process.exit(1);
    }

    console.log(`\n📝 Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`🆔 User ID: ${user._id}`);

    // Delete existing logs for this user
    const deleteResult = await UsageLog.deleteMany({ userId: user._id });
    console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} existing usage logs`);

    // Generate 7 days of usage data
    const usageLogs = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(Math.floor(Math.random() * 24));
      date.setMinutes(Math.floor(Math.random() * 60));

      // Random usage between 0.5 GB to 3 GB download per day
      const downloadGB = (Math.random() * 2.5 + 0.5).toFixed(2);
      const downloadBytes = parseFloat(downloadGB) * 1024 * 1024 * 1024;
      
      // Upload is typically 10-20% of download
      const uploadGB = (parseFloat(downloadGB) * (0.1 + Math.random() * 0.1)).toFixed(2);
      const uploadBytes = parseFloat(uploadGB) * 1024 * 1024 * 1024;

      usageLogs.push({
        userId: user._id,
        deviceId: `device-${Math.random().toString(36).substr(2, 9)}`,
        deviceType: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
        timestamp: date,
        download: downloadBytes,
        upload: uploadBytes,
        downloadSpeed: Math.floor(Math.random() * 50 + 50), // 50-100 Mbps
        uploadSpeed: Math.floor(Math.random() * 20 + 10),   // 10-30 Mbps
        latency: Math.floor(Math.random() * 30 + 10),       // 10-40 ms
        packetLoss: Math.random() * 2,                       // 0-2%
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        sessionDuration: Math.floor(Math.random() * 120 + 30), // 30-150 minutes
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139] // New Delhi coordinates
        }
      });
    }

    // Insert all logs
    const inserted = await UsageLog.insertMany(usageLogs);
    console.log(`\n✅ Generated ${inserted.length} usage logs for ${user.firstName}`);

    // Calculate totals
    const totalDownload = usageLogs.reduce((sum, log) => sum + log.download, 0) / (1024 * 1024 * 1024);
    const totalUpload = usageLogs.reduce((sum, log) => sum + log.upload, 0) / (1024 * 1024 * 1024);
    const totalUsage = totalDownload + totalUpload;

    console.log(`\n📊 Usage Summary:`);
    console.log(`   Download: ${totalDownload.toFixed(2)} GB`);
    console.log(`   Upload: ${totalUpload.toFixed(2)} GB`);
    console.log(`   Total: ${totalUsage.toFixed(2)} GB`);
    console.log(`   Logs Created: ${inserted.length}`);

    mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateUsageForAndrew();
