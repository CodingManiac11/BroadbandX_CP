require('dotenv').config({ path: __dirname + '/../.env' });
const emailService = require('./services/emailService');

async function testEmailSending() {
  console.log('📧 Testing Gmail SMTP...');
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Pass:', process.env.EMAIL_PASS ? '✓ Configured' : '✗ Missing');
  
  try {
    await emailService.sendPasswordResetEmail('team.add22scse@gmail.com', {
      name: 'Test User',
      resetURL: 'http://localhost:3000/reset-password?token=test123',
      expiresIn: '1 hour'
    });
    console.log('✅ Test email sent successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test email failed:', error);
    process.exit(1);
  }
}

testEmailSending();
