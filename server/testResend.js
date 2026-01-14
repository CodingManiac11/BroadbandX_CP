const { Resend } = require('resend');

const resend = new Resend('re_EKGmA1Tn_ALbQzFYvkGPUhJ71dYU5hwN7');

async function testEmail() {
  try {
    console.log('Testing Resend API...');
    const result = await resend.emails.send({
      from: 'BroadbandX <onboarding@resend.dev>',
      to: ['team.add22scse@gmail.com'],
      subject: 'Test Email from BroadbandX',
      html: '<h1>Test Email</h1><p>If you receive this, Resend is working!</p>',
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Error sending email:');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
