const mongoose = require('mongoose');
const UsageLog = require('./models/UsageLog');
require('dotenv').config({ path: '../.env' });

async function checkUsageLogs() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const userId = '694ceb639d075759fba7c2ce';
    
    // Check logs with string userId
    const logsAsString = await UsageLog.find({ userId: userId }).limit(2);
    console.log('\n📋 Logs found with string userId:', logsAsString.length);
    if (logsAsString.length > 0) {
      console.log('Sample log userId type:', typeof logsAsString[0].userId);
      console.log('Sample log userId value:', logsAsString[0].userId);
    }
    
    // Check logs with ObjectId
    const logsAsObjectId = await UsageLog.find({ userId: new mongoose.Types.ObjectId(userId) }).limit(2);
    console.log('\n📋 Logs found with ObjectId:', logsAsObjectId.length);
    if (logsAsObjectId.length > 0) {
      console.log('Sample log userId type:', typeof logsAsObjectId[0].userId);
      console.log('Sample log userId value:', logsAsObjectId[0].userId);
    }
    
    // Test aggregation with string
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    console.log('\n🔍 Testing aggregation with string userId...');
    const aggString = await UsageLog.aggregate([
      { $match: { userId: userId, timestamp: { $gte: startOfMonth } } },
      { $group: {
          _id: null,
          totalDownload: { $sum: '$download' },
          totalUpload: { $sum: '$upload' }
        }
      }
    ]);
    console.log('Result:', aggString);
    
    console.log('\n🔍 Testing aggregation with ObjectId...');
    const aggObjectId = await UsageLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), timestamp: { $gte: startOfMonth } } },
      { $group: {
          _id: null,
          totalDownload: { $sum: '$download' },
          totalUpload: { $sum: '$upload' }
        }
      }
    ]);
    console.log('Result:', aggObjectId);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsageLogs();
