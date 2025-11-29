const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'email']
}));

app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb+srv://adityautsav1901:aditya1@cluster0.glddswq.mongodb.net/broadband-subscription-db?retryWrites=true&w=majority');
        console.log('✅ Connected to MongoDB Atlas');
        console.log(`📍 Database: ${conn.connection.name}`);
        console.log(`🌐 Host: ${conn.connection.host}`);
        
        // Test connection by listing collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📁 Found ${collections.length} collections:`, collections.map(c => c.name));
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('🔍 Check your MongoDB URI in .env file');
        process.exit(1);
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running!',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Test endpoint to verify database
app.get('/api/test/db-status', async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        let collectionsInfo = [];
        if (dbState === 1) {
            const collections = await mongoose.connection.db.listCollections().toArray();
            collectionsInfo = collections.map(c => c.name);
        }
        
        res.json({
            success: true,
            database: {
                status: states[dbState],
                name: mongoose.connection.name || 'Not connected',
                host: mongoose.connection.host || 'Not connected',
                collections: collectionsInfo
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Customer subscriptions endpoint (matches frontend expectations)
app.get('/api/customer/subscriptions', async (req, res) => {
    try {
        const email = req.headers.email;
        console.log(`📧 Getting subscriptions for: ${email}`);
        
        // Define schemas
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const SubscriptionSchema = new mongoose.Schema({}, { strict: false });
        const PlanSchema = new mongoose.Schema({}, { strict: false });
        
        const User = mongoose.models.User || mongoose.model('User', UserSchema, 'Users');
        const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema, 'Subscriptions');
        const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema, 'Plans');
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({
                success: true,
                subscriptions: [],
                message: 'No user found with this email'
            });
        }
        
        // Find subscriptions for this user
        const subscriptions = await Subscription.find({ 
            customerEmail: email 
        }).populate('plan').exec();
        
        console.log(`📊 Found ${subscriptions.length} subscriptions for ${email}`);
        
        res.json({
            success: true,
            subscriptions: subscriptions || [],
            count: subscriptions.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching customer subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscriptions',
            error: error.message
        });
    }
});

// Admin endpoint to get all subscriptions (for admin dashboard)
app.get('/api/admin/subscriptions', async (req, res) => {
    try {
        console.log('🔍 Admin requesting all subscriptions');
        
        // Define schemas
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const SubscriptionSchema = new mongoose.Schema({}, { strict: false });
        const PlanSchema = new mongoose.Schema({}, { strict: false });
        
        const User = mongoose.models.User || mongoose.model('User', UserSchema, 'Users');
        const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema, 'Subscriptions');
        const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema, 'Plans');
        
        // Get all subscriptions
        const subscriptions = await Subscription.find({});
        
        // Manually populate user and plan data
        const enrichedSubscriptions = await Promise.all(
            subscriptions.map(async (sub) => {
                let user = null;
                let plan = null;
                
                try {
                    user = await User.findOne({ email: sub.customerEmail });
                    plan = await Plan.findById(sub.planId);
                } catch (err) {
                    console.warn(`⚠️ Failed to populate data for subscription ${sub._id}`);
                }
                
                return {
                    ...sub.toObject(),
                    user: user ? {
                        firstName: user.firstName || 'Unknown',
                        lastName: user.lastName || '',
                        email: user.email
                    } : null,
                    plan: plan ? {
                        name: plan.name || 'Unknown Plan',
                        category: plan.category || 'Unknown'
                    } : null
                };
            })
        );
        
        console.log(`📊 Returning ${enrichedSubscriptions.length} subscriptions`);
        
        res.json({
            success: true,
            data: enrichedSubscriptions,
            pagination: {
                page: 1,
                pages: 1,
                total: enrichedSubscriptions.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching admin subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscriptions',
            error: error.message
        });
    }
});

// Start server
const startServer = async () => {
    try {
        await connectDB();
        
        app.listen(PORT, () => {
            console.log('🚀 SERVER STARTED SUCCESSFULLY!');
            console.log('=================================');
            console.log(`🌐 Server running on: http://localhost:${PORT}`);
            console.log(`💾 Database: MongoDB Atlas`);
            console.log(`📡 Health check: http://localhost:${PORT}/health`);
            console.log(`🔍 DB status: http://localhost:${PORT}/api/test/db-status`);
            console.log('=================================');
            console.log('✅ Ready for frontend connections!');
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    mongoose.connection.close();
    process.exit(0);
});

startServer();