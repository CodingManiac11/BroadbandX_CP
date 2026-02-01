/**
 * Reset test data created by createHighRiskData.js
 * Restores database to show real customer activity
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function resetTestData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const User = require('../models/User');
        const Subscription = require('../models/Subscription');
        const SupportTicket = require('../models/SupportTicket');
        const UsageAnalytics = require('../models/UsageAnalytics');

        console.log('\n🔄 Resetting test data...\n');

        // 1. Reset User fields that were modified
        const userResult = await User.updateMany(
            {},
            {
                $unset: { npsScore: 1 },  // Remove test npsScore
                $set: { lastLogin: null } // Reset lastLogin to null (will use createdAt as fallback)
            }
        );
        console.log(`✅ Reset ${userResult.modifiedCount} user records (npsScore removed, lastLogin reset)`);

        // 2. Reset Subscription paymentFailures
        const subResult = await Subscription.updateMany(
            {},
            { $set: { paymentFailures: 0 } }
        );
        console.log(`✅ Reset ${subResult.modifiedCount} subscription paymentFailures to 0`);

        // 3. Delete test support tickets (those with "Auto-generated for testing" description)
        const ticketResult = await SupportTicket.deleteMany({
            description: 'Auto-generated for testing'
        });
        console.log(`✅ Deleted ${ticketResult.deletedCount} test support tickets`);

        // 4. Delete test UsageAnalytics records created in past 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const analyticsResult = await UsageAnalytics.deleteMany({
            createdAt: { $gte: sevenDaysAgo }
        });
        console.log(`✅ Deleted ${analyticsResult.deletedCount} recent test analytics records`);

        console.log('\n✨ Test data reset complete!');
        console.log('\n📋 What the charts will now show:');
        console.log('   - Risk based on REAL customer login activity');
        console.log('   - Real support tickets (not test ones)');
        console.log('   - Real payment history');
        console.log('\n⚠️  Note: Most customers may show "Low Risk" since:');
        console.log('   - lastLogin is null → uses createdAt (account age)');
        console.log('   - npsScore not set → defaults to 7 (neutral)');
        console.log('   - No recent payment failures');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetTestData();
