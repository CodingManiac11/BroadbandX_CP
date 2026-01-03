require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/broadbandx';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Database: ${mongoose.connection.name}\n`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const cleanEmptyCollections = async () => {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log(`📊 Found ${collections.length} collections in database\n`);

    let emptyCount = 0;
    let deletedCount = 0;
    let nonEmptyCount = 0;

    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();

      if (count === 0) {
        console.log(`🗑️  Deleting empty collection: ${collectionName}`);
        await db.collection(collectionName).drop();
        deletedCount++;
        emptyCount++;
      } else {
        console.log(`✅ ${collectionName}: ${count} documents`);
        nonEmptyCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   🗑️  Deleted: ${deletedCount} empty collections`);
    console.log(`   ✅ Kept: ${nonEmptyCount} collections with data`);
    console.log(`   📋 Total: ${collections.length} collections`);

  } catch (error) {
    console.error('❌ Error cleaning collections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  cleanEmptyCollections();
}

module.exports = { cleanEmptyCollections };
