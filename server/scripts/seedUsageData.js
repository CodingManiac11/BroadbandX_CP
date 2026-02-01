/**
 * Usage Data Seeding Script
 * 
 * Generates historical usage data for all active subscribers.
 * Run this once to populate usage analytics dashboards.
 * 
 * Usage: node scripts/seedUsageData.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const UsageLog = require('../models/UsageLog');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const User = require('../models/User');

// Configuration
const CONFIG = {
    // Usage intensity (what % of plan limit to use monthly)
    usageIntensity: 0.6, // 60% of plan limit

    // Daily variance (randomness in daily usage)
    dailyVariance: 0.3, // ±30%

    // Download:Upload ratio
    downloadRatio: 0.8, // 80% downloads, 20% uploads

    // Device types and their weights
    deviceTypes: [
        { type: 'Desktop', weight: 0.35 },
        { type: 'Mobile', weight: 0.35 },
        { type: 'Tablet', weight: 0.15 },
        { type: 'IoT', weight: 0.10 },
        { type: 'Other', weight: 0.05 }
    ],

    // Time of day usage patterns (24 hours, relative weights)
    hourlyPattern: [
        0.02, 0.01, 0.01, 0.01, 0.01, 0.02, // 0-5 (night, minimal)
        0.03, 0.04, 0.05, 0.05, 0.04, 0.04, // 6-11 (morning)
        0.05, 0.04, 0.04, 0.04, 0.05, 0.06, // 12-17 (afternoon)
        0.08, 0.09, 0.10, 0.08, 0.06, 0.04  // 18-23 (evening peak)
    ],

    // Weekend boost
    weekendBoost: 1.2 // 20% more usage on weekends
};

// Utility functions
const randomFloat = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(randomFloat(min, max + 1));
const GB_TO_BYTES = 1024 * 1024 * 1024;

// Select random device type based on weights
function getRandomDeviceType() {
    const rand = Math.random();
    let cumulative = 0;
    for (const device of CONFIG.deviceTypes) {
        cumulative += device.weight;
        if (rand <= cumulative) return device.type;
    }
    return 'Other';
}

// Generate random IP address
function generateIP() {
    return `192.168.${randomInt(1, 254)}.${randomInt(1, 254)}`;
}

// Calculate daily target based on plan
function calculateDailyTarget(plan) {
    const dataLimitGB = plan.features?.dataLimit?.unlimited
        ? 1000 // If unlimited, assume 1TB/month target
        : (plan.features?.dataLimit?.amount || 500);

    // Convert to bytes and divide by ~30 days
    const monthlyTargetBytes = dataLimitGB * GB_TO_BYTES * CONFIG.usageIntensity;
    return monthlyTargetBytes / 30;
}

// Generate usage record for a specific hour
function generateHourlyUsage(userId, plan, date, hour) {
    const dailyTarget = calculateDailyTarget(plan);
    const hourlyWeight = CONFIG.hourlyPattern[hour];

    // Apply weekend boost
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendMultiplier = isWeekend ? CONFIG.weekendBoost : 1;

    // Calculate base hourly usage with variance
    const variance = 1 + randomFloat(-CONFIG.dailyVariance, CONFIG.dailyVariance);
    const hourlyTarget = dailyTarget * hourlyWeight * weekendMultiplier * variance;

    // Split into download/upload
    const download = Math.floor(hourlyTarget * CONFIG.downloadRatio);
    const upload = Math.floor(hourlyTarget * (1 - CONFIG.downloadRatio));

    // Get plan speeds (with defaults)
    const downloadSpeedMax = plan.features?.speed?.download || 100;
    const uploadSpeedMax = plan.features?.speed?.upload || 50;

    // Generate realistic speed (60-90% of max)
    const downloadSpeed = downloadSpeedMax * randomFloat(0.6, 0.9);
    const uploadSpeed = uploadSpeedMax * randomFloat(0.6, 0.9);

    const timestamp = new Date(date);
    timestamp.setHours(hour, randomInt(0, 59), randomInt(0, 59));

    return {
        userId,
        deviceId: `DEV-${userId.toString().slice(-6)}-${randomInt(1, 5)}`,
        deviceType: getRandomDeviceType(),
        timestamp,
        download,
        upload,
        downloadSpeed: Math.round(downloadSpeed * 100) / 100,
        uploadSpeed: Math.round(uploadSpeed * 100) / 100,
        latency: randomInt(5, 45), // 5-45ms
        packetLoss: randomFloat(0, 0.5), // 0-0.5%
        ipAddress: generateIP(),
        sessionDuration: randomInt(15, 180) // 15-180 minutes
    };
}

// Generate all usage records for a subscription
async function generateUsageForSubscription(subscription, daysToGenerate = null) {
    const plan = subscription.plan;
    const userId = subscription.user._id || subscription.user;

    // Calculate date range
    const startDate = new Date(subscription.startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Limit how far back we go (default: subscription start or 30 days)
    const maxDaysBack = daysToGenerate || 30;
    const earliestDate = new Date(today);
    earliestDate.setDate(earliestDate.getDate() - maxDaysBack);

    const effectiveStart = startDate > earliestDate ? startDate : earliestDate;

    const usageLogs = [];
    const currentDate = new Date(effectiveStart);
    currentDate.setHours(0, 0, 0, 0);

    // Generate hourly records for each day
    while (currentDate <= today) {
        // Generate a few records per day (not all 24 hours for performance)
        const hoursToGenerate = [8, 12, 14, 18, 20, 22]; // Key hours

        for (const hour of hoursToGenerate) {
            // Skip future hours on today
            const now = new Date();
            if (currentDate.toDateString() === now.toDateString() && hour > now.getHours()) {
                continue;
            }

            usageLogs.push(generateHourlyUsage(userId, plan, currentDate, hour));
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return usageLogs;
}

// Main seeding function
async function seedUsageData() {
    console.log('🌱 Starting Usage Data Seeding...\n');

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all active subscriptions with their plans
        const subscriptions = await Subscription.find({
            status: { $in: ['active', 'trial'] }
        }).populate('plan').populate('user', 'firstName lastName email');

        console.log(`📋 Found ${subscriptions.length} active subscriptions\n`);

        if (subscriptions.length === 0) {
            console.log('⚠️ No active subscriptions found. Nothing to seed.');
            return;
        }

        let totalRecords = 0;

        for (const subscription of subscriptions) {
            const userName = subscription.user?.firstName
                ? `${subscription.user.firstName} ${subscription.user.lastName}`
                : 'Unknown';
            const planName = subscription.plan?.name || 'Unknown Plan';

            console.log(`👤 Processing: ${userName} (${planName})`);

            // Check existing usage count
            const existingCount = await UsageLog.countDocuments({
                userId: subscription.user._id || subscription.user
            });

            if (existingCount > 100) {
                console.log(`   ⏭️ Skipping - already has ${existingCount} records\n`);
                continue;
            }

            // Generate usage data
            const usageLogs = await generateUsageForSubscription(subscription);

            if (usageLogs.length > 0) {
                // Bulk insert for performance
                await UsageLog.insertMany(usageLogs);
                totalRecords += usageLogs.length;
                console.log(`   ✅ Created ${usageLogs.length} usage records\n`);
            }
        }

        console.log('═'.repeat(50));
        console.log(`\n🎉 Seeding Complete!`);
        console.log(`   Total records created: ${totalRecords}`);
        console.log(`   Subscriptions processed: ${subscriptions.length}\n`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('📡 Database connection closed');
    }
}

// Run if called directly
if (require.main === module) {
    seedUsageData();
}

module.exports = { seedUsageData, generateUsageForSubscription, CONFIG };
