const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const planRoutes = require('./routes/plans');
const subscriptionRoutes = require('./routes/subscriptions');
const adminRoutes = require('./routes/admin');
// const analyticsRoutes = require('./routes/analytics');
const recommendationRoutes = require('./routes/recommendations');
const pricingRoutes = require('./routes/pricing');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const RealTimeEvents = require('./utils/realTimeEvents');

const app = express();
const server = createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting - More lenient in development
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : (process.env.RATE_LIMIT_MAX_REQUESTS || 100), // Higher limit for development
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api/', limiter);

// CORS configuration - More permissive for development
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  preflightContinue: false
};

// Apply CORS before any routes
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// MongoDB connection with improved error handling and retry logic
const connectDB = async () => {
  try {
    // Check if MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      // Increased timeout settings for better reliability
      serverSelectionTimeoutMS: 30000, // Increased from 5000
      socketTimeoutMS: 60000,          // Increased from 45000
      connectTimeoutMS: 30000,         // Increased from 10000
      // Retry settings
      retryWrites: true,
      retryReads: true,
      // Heartbeat settings
      heartbeatFrequencyMS: 10000,
    });

    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
    return conn;
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    
    // Fallback to local MongoDB for development
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🔄 Attempting fallback to local MongoDB...');
        const localConn = await mongoose.connect('mongodb://localhost:27017/broadband-subscription-db');
        console.log('✅ Connected to local MongoDB for development');
        return localConn;
      } catch (localError) {
        console.error('❌ Local MongoDB connection also failed:', localError.message);
      }
    }
    
    console.error('❌ All database connections failed. Server will continue without database.');
    // Don't exit, let server run for demo purposes
  }
};

// Initialize database connection
connectDB();

// Socket.io connection handling
const realTimeEvents = new RealTimeEvents(io);

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Handle user authentication and join personal room
  socket.on('authenticate', (userId) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} authenticated and joined personal room`);
    
    // Send confirmation
    socket.emit('authenticated', { userId, socketId: socket.id });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });

  // Handle subscription events
  socket.on('subscribe_to_updates', (data) => {
    console.log('📡 User subscribed to updates:', data);
  });
});

// Make realTimeEvents available globally
global.realTimeEvents = realTimeEvents;

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Lumen Quest API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', authenticateToken, subscriptionRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/customer', require('./routes/customer'));
// app.use('/api/payments', require('./routes/payments')); // Disabled - using UPI payments via customer routes
// app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/recommendations', authenticateToken, recommendationRoutes);
app.use('/api/admin/pricing', authenticateToken, pricingRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close();
  console.log('MongoDB connection closed.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close();
  console.log('MongoDB connection closed.');
  process.exit(0);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = { app, server, io };