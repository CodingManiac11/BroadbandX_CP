const mongoose = require('mongoose');
require('dotenv').config();

async function checkPlansAndSubs() {
  try {
    await mongoose.connect('mongodb+srv://adityautsav1901:aditya1@cluster0.glddswq.mongodb.net/broadband-subscription-db?retryWrites=true&w=majority');
    console.log('✅ Connected to database');
    
    // Check plans
    const Plan = mongoose.model('Plan', new mongoose.Schema({}, { strict: false }), 'plans');
    const plans = await Plan.find();
    console.log(`\n📋 Found ${plans.length} plans:`);
    plans.forEach((plan, i) => {
      console.log(`   ${i+1}. ID: ${plan._id}, Name: ${plan.name || 'No name'}, Status: ${plan.status || 'No status'}`);
    });
    
    // Check subscriptions
    const Subscription = mongoose.model('Subscription', new mongoose.Schema({}, { strict: false }), 'subscriptions');
    const subs = await Subscription.find({ user: new mongoose.Types.ObjectId('69244ffd700ddcc802fbc33e') });
    console.log(`\n🔖 Found ${subs.length} subscriptions for user:`);
    subs.forEach((sub, i) => {
      console.log(`   ${i+1}. Sub ID: ${sub._id}, Plan ID: ${sub.plan}, Status: ${sub.status}`);
    });
    
    // Check if plan IDs match
    console.log('\n🔍 Checking plan matches:');
    for (const sub of subs) {
      const plan = await Plan.findById(sub.plan);
      if (plan) {
        console.log(`   ✅ Sub ${sub._id} -> Plan ${plan.name}`);
      } else {
        console.log(`   ❌ Sub ${sub._id} -> Plan ${sub.plan} NOT FOUND!`);
      }
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPlansAndSubs();