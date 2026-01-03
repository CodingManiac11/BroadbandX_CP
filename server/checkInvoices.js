const mongoose = require('mongoose');
const Payment = require('./models/Payment');
const Subscription = require('./models/Subscription');
require('dotenv').config({ path: '../.env' });

async function checkInvoices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const userId = '69267c32a923dd874b11c4f9'; // Divyaratnam Singh
    
    console.log('\n📋 Checking subscriptions for user:', userId);
    const subscriptions = await Subscription.find({ user: userId })
      .populate('plan')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${subscriptions.length} subscriptions:`);
    subscriptions.forEach((sub, i) => {
      console.log(`\n${i + 1}. Subscription:`, {
        id: sub._id.toString(),
        plan: sub.plan?.name,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        pricing: sub.pricing
      });
    });
    
    console.log('\n💳 Checking payments for user:', userId);
    const payments = await Payment.find({ user: userId })
      .populate('subscription')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${payments.length} payments:`);
    payments.forEach((payment, i) => {
      console.log(`\n${i + 1}. Payment:`, {
        id: payment._id.toString(),
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        createdAt: payment.createdAt
      });
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkInvoices();
