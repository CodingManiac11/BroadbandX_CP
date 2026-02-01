require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Plan = require('./models/Plan');

/**
 * Update Plans Script
 * Updates existing plans in MongoDB with new realistic pricing.
 * Safe for existing subscriptions - they store their own pricing.
 */

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/broadbandx';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// 8 Realistic Indian Broadband Plans
const newPlans = [
    {
        name: 'Starter',
        description: 'Perfect for light users and students. Get started with reliable internet.',
        pricing: { monthly: 399, currency: 'INR', setupFee: 500 },
        features: {
            speed: { download: 40, upload: 40, unit: 'Mbps' },
            dataLimit: { amount: 200, unit: 'GB', unlimited: false },
            features: [
                { name: 'Basic Support', description: 'Email support', included: true },
                { name: 'Router', description: 'Bring your own router', included: false }
            ]
        },
        category: 'residential',
        status: 'active',
        targetAudience: 'light-users',
        technicalSpecs: { technology: 'fiber', latency: 20, reliability: 99 },
        availability: { regions: ['Maharashtra', 'Delhi', 'Karnataka'], cities: ['Mumbai', 'Delhi', 'Bangalore'] }
    },
    {
        name: 'Basic',
        description: 'Ideal for small households. Enjoy smooth browsing and streaming.',
        pricing: { monthly: 499, currency: 'INR', setupFee: 0 },
        features: {
            speed: { download: 60, upload: 60, unit: 'Mbps' },
            dataLimit: { amount: 500, unit: 'GB', unlimited: false },
            features: [
                { name: 'Priority Support', description: 'Phone & email support', included: true },
                { name: 'Free Router', description: 'Dual-band Wi-Fi router included', included: true }
            ]
        },
        category: 'residential',
        status: 'active',
        targetAudience: 'moderate-users',
        technicalSpecs: { technology: 'fiber', latency: 15, reliability: 99.5 },
        availability: { regions: ['Maharashtra', 'Delhi', 'Karnataka'], cities: ['Mumbai', 'Delhi', 'Bangalore'] }
    },
    {
        name: 'Standard',
        description: 'Best for families and work from home. Stream, game, and video call without lag.',
        pricing: { monthly: 799, currency: 'INR', setupFee: 0 },
        features: {
            speed: { download: 100, upload: 100, unit: 'Mbps' },
            dataLimit: { amount: 1000, unit: 'GB', unlimited: false },
            features: [
                { name: '24/7 Support', description: 'Round-the-clock assistance', included: true },
                { name: 'Free Router', description: 'Dual-band Wi-Fi 5 router', included: true },
                { name: 'Free Installation', description: 'Professional installation', included: true }
            ]
        },
        category: 'residential',
        status: 'active',
        targetAudience: 'families',
        technicalSpecs: { technology: 'fiber', latency: 10, reliability: 99.9 },
        availability: { regions: ['Maharashtra', 'Delhi', 'Karnataka'], cities: ['Mumbai', 'Delhi', 'Bangalore'] }
    },
    {
        name: 'Premium',
        description: 'For gamers and streamers. Ultra-low latency with unlimited data.',
        pricing: { monthly: 1199, currency: 'INR', setupFee: 0 },
        features: {
            speed: { download: 200, upload: 200, unit: 'Mbps' },
            dataLimit: { unlimited: true },
            features: [
                { name: 'Priority Support', description: 'VIP customer service', included: true },
                { name: 'Wi-Fi 6 Router', description: 'Latest Wi-Fi 6 router included', included: true },
                { name: 'Static IP', description: 'Optional static IP available', included: true }
            ]
        },
        category: 'residential',
        status: 'active',
        targetAudience: 'gamers',
        technicalSpecs: { technology: 'fiber', latency: 8, reliability: 99.9 },
        availability: { regions: ['Maharashtra', 'Delhi', 'Karnataka'], cities: ['Mumbai', 'Delhi', 'Bangalore'] }
    },
    {
        name: 'Ultra',
        description: 'Maximum speed for power users. 4K streaming on multiple devices.',
        pricing: { monthly: 1499, currency: 'INR', setupFee: 0 },
        features: {
            speed: { download: 300, upload: 300, unit: 'Mbps' },
            dataLimit: { unlimited: true },
            features: [
                { name: 'Dedicated Support', description: 'Personal account manager', included: true },
                { name: 'Wi-Fi 6 Router', description: 'Premium Wi-Fi 6 mesh system', included: true },
                { name: 'Static IP', description: 'Free static IP included', included: true }
            ]
        },
        category: 'residential',
        status: 'active',
        targetAudience: 'heavy-users',
        technicalSpecs: { technology: 'fiber', latency: 5, reliability: 99.95 },
        availability: { regions: ['Maharashtra', 'Delhi', 'Karnataka'], cities: ['Mumbai', 'Delhi', 'Bangalore'] }
    },
    {
        name: 'Business Basic',
        description: 'Reliable connectivity for small offices and startups.',
        pricing: { monthly: 999, currency: 'INR', setupFee: 0 },
        features: {
            speed: { download: 100, upload: 100, unit: 'Mbps' },
            dataLimit: { amount: 1000, unit: 'GB', unlimited: false },
            features: [
                { name: 'Business Support', description: '24/7 business helpline', included: true },
                { name: 'SLA Guarantee', description: '99% uptime SLA', included: true }
            ]
        },
        category: 'business',
        status: 'active',
        targetAudience: 'businesses',
        technicalSpecs: { technology: 'fiber', latency: 10, reliability: 99.5 },
        availability: { regions: ['Maharashtra', 'Delhi', 'Karnataka'], cities: ['Mumbai', 'Delhi', 'Bangalore'] }
    },
    {
        name: 'Business Pro',
        description: 'High-performance internet for growing businesses.',
        pricing: { monthly: 1999, currency: 'INR', setupFee: 0 },
        features: {
            speed: { download: 300, upload: 300, unit: 'Mbps' },
            dataLimit: { unlimited: true },
            features: [
                { name: 'Priority Business Support', description: 'Dedicated support line', included: true },
                { name: 'SLA Guarantee', description: '99.5% uptime SLA', included: true },
                { name: 'Static IP', description: 'Multiple static IPs available', included: true }
            ]
        },
        category: 'business',
        status: 'active',
        targetAudience: 'businesses',
        technicalSpecs: { technology: 'fiber', latency: 8, reliability: 99.9 },
        availability: { regions: ['Maharashtra', 'Delhi', 'Karnataka'], cities: ['Mumbai', 'Delhi', 'Bangalore'] }
    },
    {
        name: 'Enterprise',
        description: 'Enterprise-grade connectivity with dedicated bandwidth and SLA.',
        pricing: { monthly: 3999, currency: 'INR', setupFee: 0 },
        features: {
            speed: { download: 500, upload: 500, unit: 'Mbps' },
            dataLimit: { unlimited: true },
            features: [
                { name: 'Enterprise Support', description: 'Dedicated account manager', included: true },
                { name: 'Premium SLA', description: '99.95% uptime guarantee', included: true },
                { name: 'Dedicated Line', description: 'Dedicated fiber connection', included: true },
                { name: 'Multiple Static IPs', description: 'Up to 8 static IPs', included: true }
            ]
        },
        category: 'business',
        status: 'active',
        targetAudience: 'businesses',
        technicalSpecs: { technology: 'fiber', latency: 5, reliability: 99.95 },
        availability: { regions: ['Maharashtra', 'Delhi', 'Karnataka'], cities: ['Mumbai', 'Delhi', 'Bangalore'] }
    }
];

const updatePlans = async () => {
    try {
        await connectDB();

        console.log('\n🚀 Starting plan update...');
        console.log('='.repeat(60));

        // Get existing plans count
        const existingCount = await Plan.countDocuments();
        console.log(`📊 Existing plans in database: ${existingCount}`);

        // Delete old plans (subscriptions keep their own pricing)
        const deleteResult = await Plan.deleteMany({});
        console.log(`🗑️  Deleted ${deleteResult.deletedCount} old plans`);

        // Get admin user for createdBy field (fallback to a dummy ObjectId if none exists)
        const User = require('./models/User');
        let adminUser = await User.findOne({ role: 'admin' });

        if (!adminUser) {
            console.log('⚠️  No admin user found, creating placeholder...');
            // Create a placeholder ObjectId if no admin exists
            const adminId = new mongoose.Types.ObjectId();
            for (const plan of newPlans) {
                plan.createdBy = adminId;
            }
        } else {
            for (const plan of newPlans) {
                plan.createdBy = adminUser._id;
            }
        }

        // Insert new plans
        const insertedPlans = await Plan.insertMany(newPlans);
        console.log(`✅ Inserted ${insertedPlans.length} new plans`);

        // Display summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 NEW PLANS SUMMARY');
        console.log('='.repeat(60));

        for (const plan of insertedPlans) {
            const dataLimit = plan.features.dataLimit.unlimited
                ? 'Unlimited'
                : `${plan.features.dataLimit.amount} GB`;
            console.log(`  ${plan.name.padEnd(15)} | ₹${plan.pricing.monthly.toString().padStart(4)} | ${plan.features.speed.download} Mbps | ${dataLimit}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Plan update completed successfully!');
        console.log('ℹ️  Existing subscriptions are unaffected (they store their own prices)');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error updating plans:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Run the update
if (require.main === module) {
    updatePlans();
}

module.exports = { updatePlans };
