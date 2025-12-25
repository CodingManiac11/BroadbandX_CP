require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://aditya:12345@cluster0.uxadd.mongodb.net/questdb');
    
    const subscription = await Subscription.findOne({status: 'active'}).populate('plan');
    
    console.log('Active subscription found:');
    console.log('ID:', subscription._id);
    console.log('Plan:', subscription.plan?.name);
    console.log('Pricing:', JSON.stringify(subscription.pricing, null, 2));
    console.log('Base Price:', subscription.pricing?.basePrice);
    console.log('Final Price:', subscription.pricing?.finalPrice);
    console.log('Total Amount:', subscription.pricing?.totalAmount);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();