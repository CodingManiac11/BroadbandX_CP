const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');
require('dotenv').config({ path: '../.env' });

async function checkPlanData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const userId = '69160f2b00c2500b54f4a7b2'; // Divyanshu
    
    const subscription = await Subscription.findOne({ 
      user: userId, 
      status: 'active' 
    }).populate('plan');
    
    if (subscription) {
      console.log('\n📋 SUBSCRIPTION:');
      console.log('Plan Name:', subscription.plan?.name);
      console.log('Plan ID:', subscription.plan?._id);
      console.log('\n📊 PLAN FEATURES:');
      console.log('Full features object:', JSON.stringify(subscription.plan?.features, null, 2));
      console.log('\nData Limit:', subscription.plan?.features?.dataLimit);
      console.log('Data Limit Amount:', subscription.plan?.features?.dataLimit?.amount);
    } else {
      console.log('❌ No subscription found');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPlanData();
