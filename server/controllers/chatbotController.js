const User = require('../models/User');
const Subscription = require('../models/Subscription');
const UsageLog = require('../models/UsageLog');
const Billing = require('../models/Billing');
const Plan = require('../models/Plan');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * BroadbandX AI Chat Support Bot
 * Intent-based chatbot that analyzes user questions and fetches real data
 * to provide contextual, personalized responses.
 */

// ─── Intent Detection ────────────────────────────────────────────────
const INTENTS = {
    BILLING: {
        keywords: ['bill', 'billing', 'charge', 'payment', 'invoice', 'cost', 'price', 'expensive', 'high bill', 'pay', 'due', 'overdue', 'receipt', 'amount', 'fee', 'money', 'rupee', 'rupees', '₹'],
        patterns: [/why.*(bill|charge|cost).*(high|more|increase)/i, /how much.*(owe|pay|due)/i, /when.*(bill|payment|due)/i, /bill.*breakdown/i]
    },
    USAGE: {
        keywords: ['usage', 'data', 'download', 'upload', 'bandwidth', 'consumption', 'used', 'remaining', 'limit', 'throttle', 'speed', 'slow', 'fast', 'gb', 'mb'],
        patterns: [/how much.*(data|usage|bandwidth)/i, /data.*(left|remaining|used)/i, /why.*(slow|speed)/i, /usage.*(today|this month|daily)/i]
    },
    PLAN: {
        keywords: ['plan', 'upgrade', 'downgrade', 'switch', 'change plan', 'best plan', 'recommend', 'suggestion', 'which plan', 'compare', 'features', 'subscription'],
        patterns: [/which plan.*(best|right|good|suit)/i, /should i.*(upgrade|downgrade|switch)/i, /recommend.*(plan|package)/i, /compare.*(plan)/i, /what plan/i]
    },
    ACCOUNT: {
        keywords: ['account', 'profile', 'password', 'email', 'name', 'settings', 'login', 'logout', 'reset', 'update', 'change password', 'edit profile'],
        patterns: [/how.*(change|update|reset).*(password|email|profile)/i, /account.*(details|info|settings)/i]
    },
    SUPPORT: {
        keywords: ['support', 'help', 'issue', 'problem', 'complaint', 'ticket', 'contact', 'agent', 'human', 'escalate', 'not working', 'outage', 'down'],
        patterns: [/talk.*(human|agent|support)/i, /raise.*(ticket|complaint)/i, /internet.*(not working|down|issue)/i, /service.*(outage|down)/i]
    },
    GREETING: {
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon', 'howdy', 'greetings', 'yo', 'sup'],
        patterns: [/^(hi|hello|hey|howdy|greetings|yo)[\s!.?]*$/i]
    },
    THANKS: {
        keywords: ['thank', 'thanks', 'thank you', 'thx', 'appreciate', 'helpful', 'great'],
        patterns: [/thank/i, /appreciate/i]
    }
};

function detectIntent(message) {
    const lowerMsg = message.toLowerCase().trim();

    // Check pattern matches first (more specific)
    for (const [intent, config] of Object.entries(INTENTS)) {
        for (const pattern of config.patterns) {
            if (pattern.test(lowerMsg)) {
                return { intent, confidence: 0.95, method: 'pattern' };
            }
        }
    }

    // Then check keyword matches
    let bestIntent = 'GENERAL';
    let bestScore = 0;

    for (const [intent, config] of Object.entries(INTENTS)) {
        let score = 0;
        for (const keyword of config.keywords) {
            if (lowerMsg.includes(keyword)) {
                score += keyword.split(' ').length; // Multi-word keywords score higher
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestIntent = intent;
        }
    }

    return {
        intent: bestScore > 0 ? bestIntent : 'GENERAL',
        confidence: bestScore > 0 ? Math.min(0.9, 0.5 + bestScore * 0.15) : 0.3,
        method: 'keyword'
    };
}

// ─── Context Fetchers ────────────────────────────────────────────────
async function getUserContext(userId) {
    const [user, subscription, plans] = await Promise.all([
        User.findById(userId).select('firstName lastName email'),
        Subscription.findOne({ user: userId, status: 'active' }).populate('plan'),
        Plan.find({ status: 'active' }).sort({ 'pricing.monthly': 1 })
    ]);
    return { user, subscription, allPlans: plans };
}

async function getBillingContext(userId) {
    const invoices = await Billing.find({ user: userId })
        .sort('-createdAt')
        .limit(5);

    const subscription = await Subscription.findOne({ user: userId, status: 'active' }).populate('plan');

    let totalDue = 0;
    let overdueCount = 0;
    invoices.forEach(inv => {
        if (inv.status === 'pending' || inv.status === 'overdue') {
            totalDue += inv.amount || 0;
            if (inv.status === 'overdue') overdueCount++;
        }
    });

    return { invoices, subscription, totalDue, overdueCount };
}

async function getUsageContext(userId) {
    const subscription = await Subscription.findOne({ user: userId, status: 'active' }).populate('plan');
    if (!subscription) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayUsage, monthUsage] = await Promise.all([
        UsageLog.aggregate([
            { $match: { userId: subscription.user, timestamp: { $gte: today } } },
            { $group: { _id: null, totalDownload: { $sum: '$download' }, totalUpload: { $sum: '$upload' } } }
        ]),
        UsageLog.aggregate([
            { $match: { userId: subscription.user, timestamp: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) } } },
            { $group: { _id: null, totalDownload: { $sum: '$download' }, totalUpload: { $sum: '$upload' } } }
        ])
    ]);

    const todayData = todayUsage[0] || { totalDownload: 0, totalUpload: 0 };
    const monthData = monthUsage[0] || { totalDownload: 0, totalUpload: 0 };

    const todayGB = ((todayData.totalDownload + todayData.totalUpload) / (1024 * 1024 * 1024)).toFixed(2);
    const monthGB = ((monthData.totalDownload + monthData.totalUpload) / (1024 * 1024 * 1024)).toFixed(2);

    const dataLimit = subscription.plan?.features?.dataLimit;
    const limitGB = dataLimit?.unlimited ? 'Unlimited' : (dataLimit?.amount || 'N/A');
    const usagePercent = dataLimit?.unlimited ? 0 : ((parseFloat(monthGB) / (dataLimit?.amount || 100)) * 100).toFixed(1);

    return {
        todayGB,
        monthGB,
        limitGB,
        usagePercent,
        planName: subscription.plan?.name,
        speed: subscription.plan?.features?.speed
    };
}

// ─── Response Generators ─────────────────────────────────────────────
async function generateBillingResponse(userId, message) {
    const context = await getBillingContext(userId);
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('why') && (lowerMsg.includes('high') || lowerMsg.includes('more') || lowerMsg.includes('increase'))) {
        const planPrice = context.subscription?.plan?.pricing?.monthly || 0;
        return {
            message: `I can help you understand your billing! 💰\n\nHere's your billing breakdown:\n` +
                `• **Current Plan**: ${context.subscription?.plan?.name || 'No active plan'}\n` +
                `• **Monthly Price**: ₹${planPrice.toLocaleString()}\n` +
                `• **Outstanding Amount**: ₹${context.totalDue.toLocaleString()}\n` +
                (context.overdueCount > 0 ? `• ⚠️ **${context.overdueCount} overdue invoice(s)** — late fees may apply\n` : '') +
                `\nCommon reasons for higher bills:\n` +
                `1. Plan upgrade mid-cycle (prorated charges)\n` +
                `2. Overdue invoices accumulating\n` +
                `3. Add-on services or one-time charges\n` +
                `\nWould you like me to recommend a more suitable plan?`,
            suggestions: ['Show my invoices', 'Recommend a cheaper plan', 'Talk to support']
        };
    }

    if (lowerMsg.includes('when') && (lowerMsg.includes('due') || lowerMsg.includes('pay'))) {
        const nextBill = context.subscription?.endDate;
        return {
            message: `📅 Your billing information:\n\n` +
                `• **Next billing date**: ${nextBill ? new Date(nextBill).toLocaleDateString('en-IN') : 'N/A'}\n` +
                `• **Amount due**: ₹${context.totalDue.toLocaleString()}\n` +
                `• **Recent invoices**: ${context.invoices.length}\n` +
                (context.overdueCount > 0 ? `\n⚠️ You have ${context.overdueCount} overdue payment(s). Please clear them to avoid service interruption.` : '\n✅ All payments are up to date!'),
            suggestions: ['Pay now', 'View billing history', 'Download invoice']
        };
    }

    // Default billing response
    return {
        message: `💰 Here's your billing summary:\n\n` +
            `• **Plan**: ${context.subscription?.plan?.name || 'No active plan'}\n` +
            `• **Monthly cost**: ₹${(context.subscription?.plan?.pricing?.monthly || 0).toLocaleString()}\n` +
            `• **Outstanding**: ₹${context.totalDue.toLocaleString()}\n` +
            `• **Overdue invoices**: ${context.overdueCount}\n` +
            `\nNeed more details? Ask me about your invoices or payment schedule!`,
        suggestions: ['Why is my bill high?', 'When is my next payment?', 'Show invoice history']
    };
}

async function generateUsageResponse(userId, message) {
    const usage = await getUsageContext(userId);
    const lowerMsg = message.toLowerCase();

    if (!usage) {
        return {
            message: `📊 I couldn't find an active subscription on your account. Please subscribe to a plan to track your usage!\n\nWould you like me to recommend a plan for you?`,
            suggestions: ['Show available plans', 'Talk to support']
        };
    }

    if (lowerMsg.includes('today')) {
        return {
            message: `📊 **Today's Usage Report**\n\n` +
                `• **Data Used Today**: ${usage.todayGB} GB\n` +
                `• **Plan**: ${usage.planName}\n` +
                `• **Max Speed**: ${usage.speed?.download || 'N/A'} ${usage.speed?.unit || 'Mbps'}\n` +
                `\nYour connection is running smoothly! 🟢`,
            suggestions: ['Show monthly usage', 'Check data limit', 'Speed test info']
        };
    }

    if (lowerMsg.includes('slow') || lowerMsg.includes('speed')) {
        return {
            message: `🔍 **Speed Analysis**\n\n` +
                `• **Your Plan Speed**: ${usage.speed?.download || 'N/A'} ${usage.speed?.unit || 'Mbps'} download\n` +
                `• **Upload Speed**: ${usage.speed?.upload || 'N/A'} ${usage.speed?.unit || 'Mbps'}\n` +
                `• **Data Used This Month**: ${usage.monthGB} GB (${usage.usagePercent}% of limit)\n` +
                `\nPossible reasons for slow speed:\n` +
                `1. ${parseFloat(usage.usagePercent) > 80 ? '⚠️ **You\'re at ' + usage.usagePercent + '% of your data limit** — throttling may apply' : '✅ Data usage is within limits'}\n` +
                `2. Too many devices connected simultaneously\n` +
                `3. Peak hours (8-11 PM) may have slight congestion\n` +
                `4. Router needs a restart\n` +
                `\nTry restarting your router. If the issue persists, raise a support ticket!`,
            suggestions: ['Upgrade my plan', 'Raise support ticket', 'Show usage details']
        };
    }

    // Default usage response
    return {
        message: `📊 **Your Usage Summary**\n\n` +
            `• **Today**: ${usage.todayGB} GB\n` +
            `• **This Month**: ${usage.monthGB} GB / ${usage.limitGB} ${typeof usage.limitGB === 'number' ? 'GB' : ''}\n` +
            `• **Usage**: ${usage.usagePercent}% of your monthly limit\n` +
            `• **Plan**: ${usage.planName}\n` +
            `• **Speed**: ${usage.speed?.download || 'N/A'} ${usage.speed?.unit || 'Mbps'}\n` +
            (parseFloat(usage.usagePercent) > 80 ? `\n⚠️ You're approaching your data limit! Consider upgrading your plan.` : '\n✅ Your data usage looks healthy!'),
        suggestions: ['Today\'s usage', 'Why is my internet slow?', 'Upgrade plan']
    };
}

async function generatePlanResponse(userId, message) {
    const context = await getUserContext(userId);
    const lowerMsg = message.toLowerCase();

    const currentPlan = context.subscription?.plan;
    const plans = context.allPlans;

    if (lowerMsg.includes('upgrade') || lowerMsg.includes('best') || lowerMsg.includes('recommend') || lowerMsg.includes('suggest')) {
        // Find plans better than current
        const currentPrice = currentPlan?.pricing?.monthly || 0;
        const upgrades = plans.filter(p => p.pricing.monthly > currentPrice);
        const downgrades = plans.filter(p => p.pricing.monthly < currentPrice && p.pricing.monthly > 0);

        let recommendMsg = `🎯 **Plan Recommendations for You**\n\n`;
        recommendMsg += `📍 Your current plan: **${currentPlan?.name || 'None'}** (₹${currentPrice}/mo)\n\n`;

        if (upgrades.length > 0) {
            recommendMsg += `⬆️ **Upgrade Options:**\n`;
            upgrades.slice(0, 3).forEach(p => {
                recommendMsg += `• **${p.name}** — ₹${p.pricing.monthly}/mo | ${p.features?.speed?.download || '?'} ${p.features?.speed?.unit || 'Mbps'} | ${p.features?.dataLimit?.unlimited ? 'Unlimited' : p.features?.dataLimit?.amount + ' GB'}\n`;
            });
        }

        if (downgrades.length > 0) {
            recommendMsg += `\n⬇️ **Save Money Options:**\n`;
            downgrades.slice(0, 2).forEach(p => {
                recommendMsg += `• **${p.name}** — ₹${p.pricing.monthly}/mo (save ₹${currentPrice - p.pricing.monthly}/mo)\n`;
            });
        }

        recommendMsg += `\n💡 Based on your usage, I recommend checking the upgrade options for better speed and data limits!`;

        return {
            message: recommendMsg,
            suggestions: ['Compare top 2 plans', 'How to upgrade?', 'Show all plans']
        };
    }

    if (lowerMsg.includes('compare')) {
        let compareMsg = `📋 **Plan Comparison**\n\n`;
        compareMsg += `| Plan | Price | Speed | Data |\n|------|-------|-------|------|\n`;
        plans.slice(0, 5).forEach(p => {
            const isCurrentPlan = currentPlan && p._id.toString() === currentPlan._id.toString();
            compareMsg += `| ${p.name}${isCurrentPlan ? ' ⭐' : ''} | ₹${p.pricing.monthly} | ${p.features?.speed?.download || '?'} ${p.features?.speed?.unit || 'Mbps'} | ${p.features?.dataLimit?.unlimited ? '∞' : p.features?.dataLimit?.amount + ' GB'} |\n`;
        });
        compareMsg += `\n⭐ = Your current plan`;

        return {
            message: compareMsg,
            suggestions: ['Upgrade my plan', 'Which is best for streaming?', 'Best for work from home?']
        };
    }

    // Default plan response
    return {
        message: `📦 **Your Current Plan**\n\n` +
            `• **Plan**: ${currentPlan?.name || 'No active plan'}\n` +
            `• **Price**: ₹${(currentPlan?.pricing?.monthly || 0).toLocaleString()}/month\n` +
            `• **Speed**: ${currentPlan?.features?.speed?.download || 'N/A'} ${currentPlan?.features?.speed?.unit || 'Mbps'}\n` +
            `• **Data**: ${currentPlan?.features?.dataLimit?.unlimited ? 'Unlimited' : (currentPlan?.features?.dataLimit?.amount || 'N/A') + ' GB'}\n` +
            `\nWe have ${plans.length} plans available. Want me to recommend the best one for you?`,
        suggestions: ['Recommend a plan', 'Compare all plans', 'How to upgrade?']
    };
}

function generateAccountResponse(message) {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('password')) {
        return {
            message: `🔐 **Password Management**\n\n` +
                `To change your password:\n` +
                `1. Go to **Settings** → **Account Settings**\n` +
                `2. Click **"Change Password"**\n` +
                `3. Enter your current password and new password\n` +
                `4. New password must have: 8+ chars, uppercase, lowercase, number, special char\n` +
                `\n🔒 For security, changing your password logs you out of all other devices.`,
            suggestions: ['Go to settings', 'Forgot my password', 'Talk to support']
        };
    }

    return {
        message: `👤 **Account Help**\n\n` +
            `Here's what you can do:\n` +
            `• **Update profile** → Settings → Edit Profile\n` +
            `• **Change password** → Settings → Security\n` +
            `• **View billing** → Billing section\n` +
            `• **Manage subscription** → My Subscriptions\n` +
            `\nWhat would you like to update?`,
        suggestions: ['Change password', 'Update profile', 'View my subscription']
    };
}

function generateSupportResponse() {
    return {
        message: `🎧 **Support Options**\n\n` +
            `I'm here to help! Here's what I can do:\n\n` +
            `1. 📝 **Raise a support ticket** — Go to the Support section in your dashboard\n` +
            `2. 💬 **Ask me anything** — I can help with billing, usage, plans, and account questions\n` +
            `3. 📧 **Email support** — support@broadbandx.com\n` +
            `\nFor urgent issues like service outages, please raise a support ticket with "High" priority and our team will respond within 2 hours.`,
        suggestions: ['Raise a ticket', 'Internet not working', 'Check my bill']
    };
}

function generateGreetingResponse(userName) {
    const hour = new Date().getHours();
    let greeting = '👋';
    if (hour < 12) greeting = '☀️ Good morning';
    else if (hour < 17) greeting = '🌤️ Good afternoon';
    else greeting = '🌙 Good evening';

    return {
        message: `${greeting}, ${userName || 'there'}! I'm **BroadbandX AI Assistant** 🤖\n\n` +
            `I can help you with:\n` +
            `• 💰 **Billing** — Check bills, payment status, charges\n` +
            `• 📊 **Usage** — Data consumption, speed info\n` +
            `• 📦 **Plans** — Recommendations, comparisons, upgrades\n` +
            `• 👤 **Account** — Profile, password, settings\n` +
            `• 🎧 **Support** — Raise tickets, get help\n` +
            `\nWhat can I help you with today?`,
        suggestions: ['Check my usage', 'Why is my bill high?', 'Recommend a plan', 'Raise support ticket']
    };
}

function generateThanksResponse() {
    return {
        message: `You're welcome! 😊 I'm always here to help.\n\nIs there anything else you'd like to know?`,
        suggestions: ['Check my usage', 'View billing', 'Browse plans']
    };
}

function generateGeneralResponse() {
    return {
        message: `I'm not quite sure what you're asking about. 🤔\n\nI can help with:\n` +
            `• **"Why is my bill high?"** — Billing analysis\n` +
            `• **"How much data have I used?"** — Usage stats\n` +
            `• **"Which plan is best for me?"** — Plan recommendations\n` +
            `• **"Change my password"** — Account help\n` +
            `• **"Internet not working"** — Support\n` +
            `\nTry asking one of these, or type your question differently!`,
        suggestions: ['Check my bill', 'Show my usage', 'Recommend a plan', 'Get support']
    };
}

// ─── Controller ─────────────────────────────────────────────────────
const processMessage = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message || message.trim().length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Message is required'
        });
    }

    const { intent, confidence } = detectIntent(message);
    let response;

    try {
        switch (intent) {
            case 'BILLING':
                response = await generateBillingResponse(userId, message);
                break;
            case 'USAGE':
                response = await generateUsageResponse(userId, message);
                break;
            case 'PLAN':
                response = await generatePlanResponse(userId, message);
                break;
            case 'ACCOUNT':
                response = generateAccountResponse(message);
                break;
            case 'SUPPORT':
                response = generateSupportResponse();
                break;
            case 'GREETING':
                response = generateGreetingResponse(req.user.firstName);
                break;
            case 'THANKS':
                response = generateThanksResponse();
                break;
            default:
                response = generateGeneralResponse();
        }
    } catch (err) {
        console.error('Chatbot context fetch error:', err.message);
        response = {
            message: `I encountered an issue fetching your data. Please try again in a moment, or head to the **Support** section to raise a ticket.\n\nError: ${err.message}`,
            suggestions: ['Try again', 'Go to Support']
        };
    }

    res.status(200).json({
        status: 'success',
        data: {
            intent,
            confidence,
            response: response.message,
            suggestions: response.suggestions || [],
            timestamp: new Date().toISOString()
        }
    });
});

const getSuggestions = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Generate contextual suggestions based on user state
    const suggestions = [
        'What\'s my usage today?',
        'Why is my bill high?',
        'Which plan is best for me?',
        'When is my next payment?'
    ];

    // Check for overdue bills
    try {
        const overdueInvoices = await Billing.countDocuments({
            user: userId,
            status: 'overdue'
        });
        if (overdueInvoices > 0) {
            suggestions.unshift(`⚠️ I have ${overdueInvoices} overdue payment(s)`);
        }
    } catch (e) { /* non-critical */ }

    res.status(200).json({
        status: 'success',
        data: { suggestions }
    });
});

module.exports = { processMessage, getSuggestions };
