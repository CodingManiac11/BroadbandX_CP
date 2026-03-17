require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
require('../models/Plan');
require('../models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await Subscription.updateMany({}, { 'autoRenewal.enabled': false });
  console.log('Disabled auto-renewal for', result.modifiedCount, 'subscriptions');
  await mongoose.disconnect();
}).catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
