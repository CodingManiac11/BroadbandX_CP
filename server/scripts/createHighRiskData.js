/**
 * Script to create high-risk test data for AI Pricing dashboard testing
 * Run with: node scripts/createHighRiskData.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const UsageAnalytics = require('../models/UsageAnalytics');
const SupportTicket = require('../models/SupportTicket');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/broadbandx';

// Function to create random high-risk factors
function generateRiskFactors(riskLevel) {
    const factors = {
        highRisk: {
            daysSinceLogin: Math.floor(Math.random() * 20) + 25, // 25-45 days
            paymentFailures: Math.floor(Math.random() * 2) + 2,  // 2-3 failures
            supportTickets: Math.floor(Math.random() * 3) + 4,   // 4-6 tickets
            usageChange: -(Math.floor(Math.random() * 30) + 30), // -30% to -60%
            npsScore: Math.floor(Math.random() * 3) + 1,         // 1-3 score
        },
        mediumRisk: {
            daysSinceLogin: Math.floor(Math.random() * 10) + 15, // 15-25 days
            paymentFailures: Math.floor(Math.random() * 2) + 1,  // 1-2 failures
            supportTickets: Math.floor(Math.random() * 2) + 2,   // 2-3 tickets
            usageChange: -(Math.floor(Math.random() * 20) + 10), // -10% to -30%
            npsScore: Math.floor(Math.random() * 2) + 4,         // 4-5 score
        },
        lowRisk: {
            daysSinceLogin: Math.floor(Math.random() * 7),       // 0-7 days
            paymentFailures: 0,
            supportTickets: Math.floor(Math.random() * 2),       // 0-1 tickets
            usageChange: Math.floor(Math.random() * 20),         // 0% to +20%
            npsScore: Math.floor(Math.random() * 3) + 7,         // 7-9 score
        }
    };
    return factors[riskLevel];
}

async function createHighRiskData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all subscriptions (regardless of status)
        let subscriptions = await Subscription.find({}).populate('user');
        console.log(`📊 Found ${subscriptions.length} total subscriptions`);

        if (subscriptions.length === 0) {
            // No subscriptions exist - let's find users and check
            const users = await User.find({});
            console.log(`👤 Found ${users.length} users`);

            if (users.length === 0) {
                console.log('❌ No users found. Please register some users first.');
                process.exit(1);
            }

            console.log('ℹ️  No subscriptions found, but users exist. Creating test subscriptions...');

            // Create a basic plan if it doesn't exist
            const Plan = require('../models/Plan');
            let basicPlan = await Plan.findOne({ name: 'Basic' });
            if (!basicPlan) {
                basicPlan = await Plan.create({
                    name: 'Basic',
                    price: 499,
                    speed: 50,
                    dataLimit: 100,
                    features: ['50 Mbps', '100 GB/month'],
                    isActive: true
                });
            }

            // Create subscriptions for users without them
            for (const user of users) {
                const existingSub = await Subscription.findOne({ user: user._id });
                if (!existingSub) {
                    await Subscription.create({
                        user: user._id,
                        plan: basicPlan._id,
                        status: 'active',
                        startDate: new Date(),
                        paymentFailures: 0
                    });
                    console.log(`   ✓ Created subscription for ${user.email}`);
                }
            }

            // Re-fetch subscriptions
            subscriptions = await Subscription.find({}).populate('user');
        }

        // Update all subscriptions to active status
        await Subscription.updateMany({}, { status: 'active' });
        subscriptions = await Subscription.find({ status: 'active' }).populate('user');
        console.log(`✅ Updated ${subscriptions.length} subscriptions to active status`);

        // Distribute risk: 20% high, 30% medium, 50% low
        const distribution = {
            highRisk: Math.ceil(subscriptions.length * 0.2),
            mediumRisk: Math.ceil(subscriptions.length * 0.3),
        };

        console.log(`\n🎯 Creating risk distribution:`);
        console.log(`   - High Risk: ${distribution.highRisk} customers`);
        console.log(`   - Medium Risk: ${distribution.mediumRisk} customers`);
        console.log(`   - Low Risk: ${subscriptions.length - distribution.highRisk - distribution.mediumRisk} customers`);

        let highCount = 0;
        let mediumCount = 0;

        for (const sub of subscriptions) {
            let riskLevel = 'lowRisk';

            if (highCount < distribution.highRisk) {
                riskLevel = 'highRisk';
                highCount++;
            } else if (mediumCount < distribution.mediumRisk) {
                riskLevel = 'mediumRisk';
                mediumCount++;
            }

            const factors = generateRiskFactors(riskLevel);

            // Update user's last login
            const lastLogin = new Date();
            lastLogin.setDate(lastLogin.getDate() - factors.daysSinceLogin);
            await User.findByIdAndUpdate(sub.user._id, {
                lastLogin: lastLogin,
                npsScore: factors.npsScore
            });

            // Create/update usage analytics with usage change
            const today = new Date();
            const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

            // Create last month usage (baseline)
            await UsageAnalytics.findOneAndUpdate(
                { user: sub.user._id, date: { $gte: lastMonth, $lt: currentMonth } },
                {
                    user: sub.user._id,
                    subscription: sub._id,
                    date: lastMonth,
                    metrics: {
                        dataUsed: 80 // 80 GB baseline
                    }
                },
                { upsert: true }
            );

            // Create current month usage (with change)
            const currentUsage = Math.max(5, 80 + (80 * factors.usageChange / 100));
            await UsageAnalytics.findOneAndUpdate(
                { user: sub.user._id, date: { $gte: currentMonth } },
                {
                    user: sub.user._id,
                    subscription: sub._id,
                    date: today,
                    metrics: {
                        dataUsed: currentUsage
                    }
                },
                { upsert: true }
            );

            // Create support tickets
            for (let i = 0; i < factors.supportTickets; i++) {
                const ticketDate = new Date();
                ticketDate.setDate(ticketDate.getDate() - Math.floor(Math.random() * 30));

                await SupportTicket.create({
                    customer: sub.user._id,
                    subject: `Issue ${i + 1} - ${riskLevel === 'highRisk' ? 'Connection Problems' : 'General Query'}`,
                    description: 'Auto-generated for testing',
                    status: riskLevel === 'highRisk' ? 'open' : 'resolved',
                    priority: riskLevel === 'highRisk' ? 'high' : 'medium',
                    createdAt: ticketDate
                }).catch(() => { }); // Ignore duplicates
            }

            // Update subscription with payment failures
            await Subscription.findByIdAndUpdate(sub._id, {
                paymentFailures: factors.paymentFailures
            });

            console.log(`   ✓ ${sub.user.email}: ${riskLevel.replace('Risk', ' Risk')} (Login: ${factors.daysSinceLogin}d ago, Payments: ${factors.paymentFailures}, Tickets: ${factors.supportTickets}, Usage: ${factors.usageChange}%)`);
        }

        console.log('\n✅ High-risk test data created successfully!');
        console.log('\n📋 Next Steps:');
        console.log('   1. Restart the server: node server.js');
        console.log('   2. Go to AI Pricing dashboard');
        console.log('   3. Click "Scan Now" to run a new churn analysis');
        console.log('   4. Check the charts - you should see High/Medium/Low risk distribution!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createHighRiskData();
