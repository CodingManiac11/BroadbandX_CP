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

// Sample data
const samplePlans = [
  {
    name: 'Basic Plan',
    description: 'Affordable broadband for basic usage',
    pricing: { monthly: 29.99, currency: 'INR' },
    features: {
      speed: { download: 50, upload: 10, unit: 'Mbps' },
      dataLimit: { amount: 100, unit: 'GB', unlimited: false }
    },
    category: 'basic',
    status: 'active'
  },
  {
    name: 'Standard Plan',
    description: 'Perfect for families and small businesses',
    pricing: { monthly: 49.99, currency: 'INR' },
    features: {
      speed: { download: 100, upload: 20, unit: 'Mbps' },
      dataLimit: { amount: 500, unit: 'GB', unlimited: false }
    },
    category: 'standard',
    status: 'active'
  },
  {
    name: 'Enterprise Plan52',
    description: 'High-speed plan for enterprises',
    pricing: { monthly: 61.25, currency: 'INR' },
    features: {
      speed: { download: 200, upload: 50, unit: 'Mbps' },
      dataLimit: { unlimited: true }
    },
    category: 'enterprise',
    status: 'active'
  },
  {
    name: 'Enterprise Plan8',
    description: 'Premium enterprise plan with unlimited features',
    pricing: { monthly: 86.42, currency: 'INR' },
    features: {
      speed: { download: 500, upload: 100, unit: 'Mbps' },
      dataLimit: { unlimited: true }
    },
    category: 'enterprise',
    status: 'active'
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