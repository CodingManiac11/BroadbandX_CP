require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');

// Connect to MongoDB
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

// 8 Realistic Indian Broadband Plans
const samplePlans = [
  // Residential Plans
  {
    name: 'Starter',
    description: 'Perfect for light users and students. Get started with reliable internet.',
    pricing: { monthly: 399, currency: 'INR', setupFee: 500 },
    features: {
      speed: { download: 40, upload: 40, unit: 'Mbps' },
      dataLimit: { amount: 200, unit: 'GB', unlimited: false },
      features: [
        { name: 'Basic Support', description: 'Email support', included: true },
        { name: 'Router', description: 'Bring your own router', included: false }
      ]
    },
    category: 'residential',
    status: 'active',
    targetAudience: 'light-users',
    technicalSpecs: { technology: 'fiber', latency: 20, reliability: 99 }
  },
  {
    name: 'Basic',
    description: 'Ideal for small households. Enjoy smooth browsing and streaming.',
    pricing: { monthly: 499, currency: 'INR', setupFee: 0 },
    features: {
      speed: { download: 60, upload: 60, unit: 'Mbps' },
      dataLimit: { amount: 500, unit: 'GB', unlimited: false },
      features: [
        { name: 'Priority Support', description: 'Phone & email support', included: true },
        { name: 'Free Router', description: 'Dual-band Wi-Fi router included', included: true }
      ]
    },
    category: 'residential',
    status: 'active',
    targetAudience: 'moderate-users',
    technicalSpecs: { technology: 'fiber', latency: 15, reliability: 99.5 }
  },
  {
    name: 'Standard',
    description: 'Best for families and work from home. Stream, game, and video call without lag.',
    pricing: { monthly: 799, currency: 'INR', setupFee: 0 },
    features: {
      speed: { download: 100, upload: 100, unit: 'Mbps' },
      dataLimit: { amount: 1000, unit: 'GB', unlimited: false },
      features: [
        { name: '24/7 Support', description: 'Round-the-clock assistance', included: true },
        { name: 'Free Router', description: 'Dual-band Wi-Fi 5 router', included: true },
        { name: 'Free Installation', description: 'Professional installation', included: true }
      ]
    },
    category: 'residential',
    status: 'active',
    targetAudience: 'families',
    technicalSpecs: { technology: 'fiber', latency: 10, reliability: 99.9 }
  },
  {
    name: 'Premium',
    description: 'For gamers and streamers. Ultra-low latency with unlimited data.',
    pricing: { monthly: 1199, currency: 'INR', setupFee: 0 },
    features: {
      speed: { download: 200, upload: 200, unit: 'Mbps' },
      dataLimit: { unlimited: true },
      features: [
        { name: 'Priority Support', description: 'VIP customer service', included: true },
        { name: 'Wi-Fi 6 Router', description: 'Latest Wi-Fi 6 router included', included: true },
        { name: 'Static IP', description: 'Optional static IP available', included: true }
      ]
    },
    category: 'residential',
    status: 'active',
    targetAudience: 'gamers',
    technicalSpecs: { technology: 'fiber', latency: 8, reliability: 99.9 }
  },
  {
    name: 'Ultra',
    description: 'Maximum speed for power users. 4K streaming on multiple devices.',
    pricing: { monthly: 1499, currency: 'INR', setupFee: 0 },
    features: {
      speed: { download: 300, upload: 300, unit: 'Mbps' },
      dataLimit: { unlimited: true },
      features: [
        { name: 'Dedicated Support', description: 'Personal account manager', included: true },
        { name: 'Wi-Fi 6 Router', description: 'Premium Wi-Fi 6 mesh system', included: true },
        { name: 'Static IP', description: 'Free static IP included', included: true }
      ]
    },
    category: 'residential',
    status: 'active',
    targetAudience: 'heavy-users',
    technicalSpecs: { technology: 'fiber', latency: 5, reliability: 99.95 }
  },
  // Business Plans
  {
    name: 'Business Basic',
    description: 'Reliable connectivity for small offices and startups.',
    pricing: { monthly: 999, currency: 'INR', setupFee: 0 },
    features: {
      speed: { download: 100, upload: 100, unit: 'Mbps' },
      dataLimit: { amount: 1000, unit: 'GB', unlimited: false },
      features: [
        { name: 'Business Support', description: '24/7 business helpline', included: true },
        { name: 'SLA Guarantee', description: '99% uptime SLA', included: true }
      ]
    },
    category: 'business',
    status: 'active',
    targetAudience: 'businesses',
    technicalSpecs: { technology: 'fiber', latency: 10, reliability: 99.5 }
  },
  {
    name: 'Business Pro',
    description: 'High-performance internet for growing businesses.',
    pricing: { monthly: 1999, currency: 'INR', setupFee: 0 },
    features: {
      speed: { download: 300, upload: 300, unit: 'Mbps' },
      dataLimit: { unlimited: true },
      features: [
        { name: 'Priority Business Support', description: 'Dedicated support line', included: true },
        { name: 'SLA Guarantee', description: '99.5% uptime SLA', included: true },
        { name: 'Static IP', description: 'Multiple static IPs available', included: true }
      ]
    },
    category: 'business',
    status: 'active',
    targetAudience: 'businesses',
    technicalSpecs: { technology: 'fiber', latency: 8, reliability: 99.9 }
  },
  {
    name: 'Enterprise',
    description: 'Enterprise-grade connectivity with dedicated bandwidth and SLA.',
    pricing: { monthly: 3999, currency: 'INR', setupFee: 0 },
    features: {
      speed: { download: 500, upload: 500, unit: 'Mbps' },
      dataLimit: { unlimited: true },
      features: [
        { name: 'Enterprise Support', description: 'Dedicated account manager', included: true },
        { name: 'Premium SLA', description: '99.95% uptime guarantee', included: true },
        { name: 'Dedicated Line', description: 'Dedicated fiber connection', included: true },
        { name: 'Multiple Static IPs', description: 'Up to 8 static IPs', included: true }
      ]
    },
    category: 'business',
    status: 'active',
    targetAudience: 'businesses',
    technicalSpecs: { technology: 'fiber', latency: 5, reliability: 99.95 }
  }
];

const createUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('🧹 Cleared existing users');

    const hashedPassword = await bcrypt.hash('password123', 12);
    const adminPassword = await bcrypt.hash('Admin@123', 12);

    const users = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@broadbandx.com',
        password: adminPassword,
        phone: '+1234567890',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        address: {
          street: '123 Admin Street',
          city: 'Tech City',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        }
      },
      {
        firstName: 'Divyaratnam',
        lastName: 'Singh',
        email: 'divyaratnam@gmail.com',
        password: hashedPassword,
        phone: '9572345612',
        role: 'customer',
        status: 'active',
        emailVerified: true,
        address: {
          street: 'Lakhimpur',
          city: 'Noida',
          state: 'Uttar Pradesh',
          zipCode: '200123',
          country: 'India'
        }
      },
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'customer@example.com',
        password: hashedPassword,
        phone: '+1987654321',
        role: 'customer',
        status: 'active',
        emailVerified: true,
        address: {
          street: '456 Customer Lane',
          city: 'User City',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users`);
    return createdUsers;
  } catch (error) {
    console.error('❌ Error creating users:', error);
    throw error;
  }
};

const createPlans = async () => {
  try {
    // Clear existing plans
    await Plan.deleteMany({});
    console.log('🧹 Cleared existing plans');

    const createdPlans = await Plan.insertMany(samplePlans);
    console.log(`✅ Created ${createdPlans.length} plans`);
    return createdPlans;
  } catch (error) {
    console.error('❌ Error creating plans:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('🚀 Starting database seeding...');

    const users = await createUsers();
    const plans = await createPlans();

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   👤 Users created: ${users.length}`);
    console.log(`   📋 Plans created: ${plans.length}`);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Admin: admin@broadbandx.com / Admin@123');
    console.log('   Customer: divyaratnam@gmail.com / password123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };