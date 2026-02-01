/**
 * Detailed debug of risk data
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    const User = require('./models/User');
    const Subscription = require('./models/Subscription');
    const SupportTicket = require('./models/SupportTicket');
    const UsageAnalytics = require('./models/UsageAnalytics');

    // Get first 3 users with subscriptions
    const subs = await Subscription.find({ status: 'active' })
        .populate('user')
        .limit(3);

    for (const sub of subs) {
        const user = sub.user;
        console.log(`\n=== ${user.email} ===`);

        // Check raw user data
        const rawUser = await User.findById(user._id).lean();
        console.log('User.lastLogin:', rawUser.lastLogin);
        console.log('User.npsScore:', rawUser.npsScore);
        console.log('Subscription.paymentFailures:', sub.paymentFailures);

        // Check tickets
        const allTickets = await SupportTicket.find({ user: user._id });
        const openTickets = await SupportTicket.find({ user: user._id, status: 'open' });
        console.log(`Tickets: ${allTickets.length} total, ${openTickets.length} open`);

        // Check usage analytics
        const analytics = await UsageAnalytics.find({ user: user._id }).sort({ date: -1 }).limit(2);
        console.log('Usage Analytics:');
        analytics.forEach(a => {
            console.log(`  - Date: ${a.date?.toISOString().split('T')[0]}, DataUsed: ${a.dataUsed}`);
        });

        // Calculate what the risk should be
        const daysSinceLogin = rawUser.lastLogin
            ? Math.floor((Date.now() - new Date(rawUser.lastLogin)) / (1000 * 60 * 60 * 24))
            : 0;
        console.log(`Days since login: ${daysSinceLogin}`);
    }

    process.exit(0);
}

debug().catch(e => { console.error(e); process.exit(1); });
