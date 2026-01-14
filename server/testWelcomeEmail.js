require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const emailService = require('./services/emailService');

console.log('🔍 Testing Welcome Email Service...\n');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ Configured' : '✗ NOT SET');
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('\n📧 Attempting to send welcome email...\n');

// Test with sample subscription data (matching razorpayController format)
emailService.sendWelcomeEmail('team.add22scse@gmail.com', {
  customerName: 'Test Customer',
  planName: 'Premium Plan',
  speed: '100 Mbps Download / 50 Mbps Upload',
  data: 'Unlimited',
  price: 999,
  installationDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
})
.then(() => {
  console.log('✅ Welcome email sent successfully!');
  process.exit(0);
})
.catch((error) => {
  console.error('❌ Failed to send welcome email:', error);
  console.error('Error details:', error.message);
  process.exit(1);
});
