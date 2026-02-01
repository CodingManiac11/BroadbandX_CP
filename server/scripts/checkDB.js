/**
 * Check database state
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function checkDB() {
    console.log('Connecting to:', process.env.MONGODB_URI?.substring(0, 30) + '...');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    const User = require('./models/User');
    const Subscription = require('./models/Subscription');
    const Plan = require('./models/Plan');

    const users = await User.find({});
    const subs = await Subscription.find({});
    const plans = await Plan.find({});

    console.log('\n📊 Database State:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Subscriptions: ${subs.length}`);
    console.log(`   Plans: ${plans.length}`);

    if (users.length > 0) {
        console.log('\n👤 Users:');
        users.forEach(u => console.log(`   - ${u.email} (${u.role})`));
    }

    if (subs.length > 0) {
        console.log('\n📋 Subscriptions:');
        subs.forEach(s => console.log(`   - Status: ${s.status}, Plan: ${s.plan}`));
    }

    if (plans.length > 0) {
        console.log('\n💰 Plans:');
        plans.forEach(p => console.log(`   - ${p.name}: ₹${p.price}`));
    }

    process.exit(0);
}

checkDB().catch(e => { console.error('Error:', e.message); process.exit(1); });
