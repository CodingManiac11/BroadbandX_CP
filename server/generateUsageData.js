require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { generateUsageForAllUsers } = require('./utils/usageGenerator');

// Load models
require('./models/User');
require('./models/Subscription');
require('./models/Plan');
require('./models/UsageLog');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const main = async () => {
  await connectDB();
  
  console.log('🚀 Starting usage generation for all users...\n');
  
  try {
    // Generate usage for last 30 days
    const result = await generateUsageForAllUsers(30);
    
    console.log('\n📊 === GENERATION SUMMARY ===');
    console.log(`✅ Successfully generated: ${result.generated} users`);
    console.log(`⏭️  Skipped (already had data): ${result.skipped} users`);
    console.log(`📈 Total subscriptions: ${result.total}`);
    
    if (result.results.length > 0) {
      console.log('\n📋 Detailed Results:');
      result.results.forEach((r, index) => {
        if (r.success) {
          console.log(`${index + 1}. ${r.user}: ${r.totalUsageGB} GB (${r.usagePercentage}% of ${r.dataLimit}GB)`);
        } else {
          console.log(`${index + 1}. ${r.user}: ❌ ${r.error}`);
        }
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  console.log('\n✅ Done! Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
};

main();
