const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Ensure MONGO_URI exists
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not found in environment variables');
    }
    
    // Only connect to MongoDB Atlas - no local fallback
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true,
    });

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📍 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Atlas connection failed: ${error.message}`);
    console.error('⚠️  Application requires MongoDB Atlas - no local database allowed');
    process.exit(1);
  }
};

module.exports = connectDB;