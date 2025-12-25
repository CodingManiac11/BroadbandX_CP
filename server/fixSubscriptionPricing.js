const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://aditya:12345@cluster0.uxadd.mongodb.net/questdb');
    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Define the subscription schema (simplified)
const subscriptionSchema = new mongoose.Schema({}, { strict: false });
const Subscription = mongoose.model('Subscription', subscriptionSchema, 'subscriptions');

const fixPricing = async () => {
  try {
    console.log('🔍 Finding Basic Plan29 subscriptions to fix...');
    
    // Find all subscriptions for Basic Plan29
    const subscriptions = await Subscription.find({});
    console.log(`📊 Found ${subscriptions.length} total subscriptions`);
    
    for (const sub of subscriptions) {
      if (sub.planName === 'Basic Plan29' || (sub.plan && sub.plan.name === 'Basic Plan29')) {
        console.log(`🔧 Fixing subscription ${sub._id}:`);
        console.log('  Current pricing:', sub.pricing);
        
        // Update pricing to use ₹32.18 as final amount (no additional tax)
        sub.pricing = {
          basePrice: 32.18,
          discountApplied: 0,
          finalPrice: 32.18,
          totalAmount: 32.18, // This is the key fix!
          taxAmount: 0, // Tax already included in ₹32.18
          currency: 'INR'
        };
        
        await sub.save();
        console.log('  ✅ Updated pricing:', sub.pricing);
      }
    }
    
    console.log('✅ All Basic Plan29 subscriptions updated!');
    
  } catch (error) {
    console.error('❌ Error fixing pricing:', error);
  } finally {
    mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
};

const run = async () => {
  const connected = await connectDB();
  if (connected) {
    await fixPricing();
  }
  process.exit(0);
};

run();