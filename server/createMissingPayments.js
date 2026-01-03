require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');
const Payment = require('./models/Payment');
const User = require('./models/User');

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

const createMissingPayments = async () => {
  try {
    await connectDB();

    console.log('🔍 Finding subscriptions without payment records...\n');

    // Get all active subscriptions
    const subscriptions = await Subscription.find({ status: 'active' })
      .populate('user')
      .populate('plan');

    console.log(`📊 Found ${subscriptions.length} active subscriptions\n`);

    let created = 0;
    let skipped = 0;

    for (const subscription of subscriptions) {
      // Check if payment already exists for this subscription
      const existingPayment = await Payment.findOne({ subscription: subscription._id });

      if (existingPayment) {
        console.log(`⏭️  Skipping ${subscription.user.firstName} ${subscription.user.lastName} - payment already exists`);
        skipped++;
        continue;
      }

      // Create payment record
      const paymentAmount = subscription.plan?.pricing?.monthly || subscription.pricing?.totalAmount || 0;
      
      const payment = new Payment({
        user: subscription.user._id,
        subscription: subscription._id,
        amount: paymentAmount,
        currency: 'INR',
        method: 'razorpay',
        status: 'captured',
        razorpayOrderId: `order_${subscription._id.toString().slice(-10)}`,
        razorpayPaymentId: `pay_${subscription._id.toString().slice(-10)}`,
        razorpaySignature: 'generated_signature',
        capturedAt: subscription.startDate || subscription.createdAt,
        metadata: {
          planName: subscription.plan?.name || subscription.planName,
          billingCycle: subscription.billingCycle,
          generatedBy: 'createMissingPayments script'
        }
      });

      await payment.save();
      console.log(`✅ Created payment for ${subscription.user.firstName} ${subscription.user.lastName} - ₹${paymentAmount}`);
      created++;
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created} payment records`);
    console.log(`   ⏭️  Skipped: ${skipped} (already had payments)`);
    console.log(`   📋 Total subscriptions: ${subscriptions.length}`);

  } catch (error) {
    console.error('❌ Error creating payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  createMissingPayments();
}

module.exports = { createMissingPayments };
