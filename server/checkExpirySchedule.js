/**
 * Check Subscription Expiry Schedule
 * Shows when each user will receive billing reminders
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function checkExpirySchedule() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        // Load all required models
        require('./models/User');
        require('./models/Plan');
        const Subscription = require('./models/Subscription');
        const subs = await Subscription.find({ status: 'active' })
            .populate('user', 'firstName lastName email')
            .populate('plan', 'name');

        console.log('========== SUBSCRIPTION EXPIRY SCHEDULE ==========\n');
        console.log(`Total active subscriptions: ${subs.length}\n`);

        const now = new Date();

        if (subs.length === 0) {
            console.log('No active subscriptions found.');
        }

        subs.forEach((sub, index) => {
            // Calculate end date - use endDate if set, otherwise startDate + 1 month
            let endDate;
            if (sub.endDate) {
                endDate = new Date(sub.endDate);
            } else if (sub.startDate) {
                endDate = new Date(sub.startDate);
                endDate.setDate(endDate.getDate() + 30); // 30-day billing period
            } else {
                endDate = new Date();
            }

            const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            const userName = sub.user ? `${sub.user.firstName} ${sub.user.lastName}` : 'Unknown';
            const userEmail = sub.user ? sub.user.email : 'N/A';
            const planName = sub.plan ? sub.plan.name : 'Unknown Plan';

            console.log(`${index + 1}. ${userName} (${userEmail})`);
            console.log(`   Plan: ${planName}`);
            console.log(`   Start: ${sub.startDate ? sub.startDate.toLocaleDateString('en-IN') : 'N/A'}`);
            console.log(`   Expires: ${endDate.toLocaleDateString('en-IN')}`);
            console.log(`   Days until expiry: ${daysUntilExpiry}`);

            // Determine reminder status
            let reminderStatus;
            if (daysUntilExpiry <= 0) {
                reminderStatus = '🔴 OVERDUE - Immediate notification';
            } else if (daysUntilExpiry <= 1) {
                reminderStatus = '🟠 TODAY/TOMORROW - Final reminder (Level 4)';
            } else if (daysUntilExpiry <= 3) {
                reminderStatus = '🟡 1-3 DAYS - Urgent reminder (Level 3)';
            } else if (daysUntilExpiry <= 7) {
                reminderStatus = '🟢 3-7 DAYS - Reminder scheduled (Level 2)';
            } else if (daysUntilExpiry <= 30) {
                reminderStatus = '🔵 7-30 DAYS - First reminder coming (Level 1)';
            } else {
                reminderStatus = '⚪ > 30 DAYS - No reminder yet';
            }

            console.log(`   Status: ${reminderStatus}`);
            console.log('');
        });

        console.log('==========================================');
        console.log('\nReminder Schedule:');
        console.log('  Level 1: 7 days before expiry');
        console.log('  Level 2: 3 days before expiry');
        console.log('  Level 3: 1 day before expiry');
        console.log('  Level 4: Same day as expiry');
        console.log('  Overdue: After expiry date');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

checkExpirySchedule();
