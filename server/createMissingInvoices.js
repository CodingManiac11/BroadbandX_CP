/**
 * Check payments and create missing billing records
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Payment = require('./models/Payment');
const Billing = require('./models/Billing');
const User = require('./models/User');
const Subscription = require('./models/Subscription');

async function createMissingInvoices() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all paid payments without billing records
    const payments = await Payment.find({ status: 'captured' })
      .populate('user', 'firstName lastName email')
      .populate('subscription')
      .lean();

    console.log(`📊 Found ${payments.length} captured payments\n`);

    let created = 0;

    for (const payment of payments) {
      // Check if billing record already exists
      const existingBilling = await Billing.findOne({
        transactionId: payment.razorpayPaymentId
      });

      if (existingBilling) {
        console.log(`✓ Invoice exists for payment ${payment.razorpayOrderId}`);
        continue;
      }

      // Create missing billing record
      const billingStart = new Date(payment.capturedAt || payment.createdAt);
      const billingEnd = new Date(billingStart);
      billingEnd.setDate(billingEnd.getDate() + 30); // 30-day billing period

      // Generate invoice number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const sequence = Math.floor(Math.random() * 9999) + 1;
      const invoiceNumber = `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;

      const billingRecord = new Billing({
        invoiceNumber,
        user: payment.user._id,
        subscription: payment.subscription,
        amount: payment.amount,
        status: 'paid',
        dueDate: billingStart,
        billingPeriod: {
          start: billingStart,
          end: billingEnd
        },
        items: [{
          description: payment.notes?.description || 'Subscription Payment',
          amount: payment.amount,
          quantity: 1,
          total: payment.amount
        }],
        subtotal: payment.amount,
        tax: 0,
        discount: 0,
        total: payment.amount,
        paymentMethod: {
          type: payment.method === 'card' ? 'credit_card' : 'other',
          last4: payment.cardLast4,
          cardBrand: payment.cardNetwork
        },
        paymentDate: payment.capturedAt,
        transactionId: payment.razorpayPaymentId
      });

      await billingRecord.save();
      console.log(`✅ Created invoice ${billingRecord.invoiceNumber} for user ${payment.user.email}`);
      created++;
    }

    console.log(`\n✨ Created ${created} missing invoices`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

createMissingInvoices();
