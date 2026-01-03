const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');
const Plan = require('./models/Plan');
require('dotenv').config({ path: '../.env' });

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the user's subscription
    const subscription = await Subscription.findOne({
      user: '694ceb639d075759fba7c2ce',
      status: 'active'
    }).populate('plan');
    
    if (subscription) {
      console.log('\n📋 SUBSCRIPTION DATA:');
      console.log('ID:', subscription._id);
      console.log('Start Date:', subscription.startDate);
      console.log('End Date:', subscription.endDate);
      console.log('nextBillingDate:', subscription.nextBillingDate);
      console.log('Status:', subscription.status);
      console.log('Billing Cycle:', subscription.billingCycle);
      
      console.log('\n💰 PRICING:');
      console.log(JSON.stringify(subscription.pricing, null, 2));
      
      if (subscription.plan) {
        console.log('\n📦 PLAN DATA:');
        console.log('Name:', subscription.plan.name);
        console.log('Category:', subscription.plan.category);
        console.log('\n🚀 SPEED:');
        console.log(JSON.stringify(subscription.plan.features.speed, null, 2));
        console.log('\n📊 DATA LIMIT:');
        console.log(JSON.stringify(subscription.plan.features.dataLimit, null, 2));
      }
    } else {
      console.log('❌ No active subscription found');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkData();
