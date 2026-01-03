const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Load environment variables from root directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const planRoutes = require('./routes/plans');
const subscriptionRoutes = require('./routes/subscriptions');
const adminRoutes = require('./routes/admin');
const planRequestRoutes = require('./routes/planRequests');
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
  max: process.env.NODE_ENV === 'development' ? 10000 : (process.env.RATE_LIMIT_MAX_REQUESTS || 100), // Much higher limit for development
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
// Temporarily disable rate limiting for debugging
// app.use('/api/', limiter);

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
    // Check if MONGO_URI exists
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
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
    console.error('🔍 Please check your MONGO_URI in .env file');
    console.error('⚠️  Application requires MongoDB Atlas - no local fallback available');
    process.exit(1);
  }
};

// Initialize database connection
connectDB();

// Initialize Reminder Scheduler
const reminderScheduler = require('./services/ReminderSchedulerService');
reminderScheduler.start();

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

  // Handle joining user room
  socket.on('join_user_room', (userId) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined personal room`);
  });

  // Handle admin room joining
  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    console.log(`👑 Admin user joined admin room: ${socket.id}`);
  });

  // Handle admin room leaving
  socket.on('leave_admin_room', () => {
    socket.leave('admin_room');
    console.log(`👋 User left admin room: ${socket.id}`);
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
app.use('/api/plan-requests', authenticateToken, planRequestRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/customer', require('./routes/customer'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/pdf', require('./routes/pdf')); // Add PDF routes
app.use('/api/feedback', require('./routes/feedback')); // Add feedback/support routes
app.use('/api/razorpay', require('./routes/razorpay')); // Razorpay payment gateway
app.use('/api/usage', authenticateToken, require('./routes/usage')); // Usage tracking
app.use('/api/notifications', authenticateToken, require('./routes/notificationRoutes')); // Notifications
// app.use('/api/payments', require('./routes/payments')); // Disabled - using UPI payments via customer routes
// app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/recommendations', authenticateToken, recommendationRoutes);
app.use('/api/admin/pricing', authenticateToken, pricingRoutes);

// Payment completion endpoint
app.post('/api/billing/complete-payment', (req, res) => {
  try {
    const { invoiceId, transactionId } = req.body;
    console.log(`💳 Processing payment completion for invoice ${invoiceId}`);
    
    // Here you would normally update the database
    // For now, we'll return success to update the frontend
    
    const updatedInvoice = {
      id: invoiceId,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      transactionId: transactionId || `TXN${Date.now()}`
    };
    
    console.log('✅ Payment completed successfully:', updatedInvoice);
    
    res.json({
      success: true,
      message: 'Payment completed successfully',
      invoice: updatedInvoice
    });
    
  } catch (error) {
    console.error('❌ Payment completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment completion failed'
    });
  }
});

// Enhanced customer billing endpoint with payment processing
app.get('/api/customer/subscriptions', (req, res) => {
  try {
    // Mock user ID for testing
    const userId = '1';
    console.log(`📧 Getting billing data for user: ${userId}`);
    
    // Mock data with December 3, 2025 timestamps
    const mockData = {
      subscription: {
        id: '1',
        planName: 'Enterprise Plan8',
        status: 'active',
        price: 86.42,
        nextBilling: new Date('2026-01-03')
      },
      invoices: [
        {
          id: '1',
          invoiceNumber: 'INV-001',
          amount: 32.18,
          status: 'Paid',
          date: '2025-11-26',
          dueDate: '2025-12-10',
          description: 'Basic Plan29 - Monthly',
          items: [{ description: 'Basic Plan29 Monthly Subscription (All taxes included)', amount: 32.18, quantity: 1 }],
          paymentDate: '2025-11-26',
          transactionId: 'TXN123456789',
          subtotal: 32.18,
          tax: 0,
          total: 32.18
        },
        {
          id: '2',
          invoiceNumber: 'INV-002',
          amount: 25.17,
          status: 'Pending',
          date: '2025-12-03',
          dueDate: '2025-12-17',
          description: 'Upgrade Payment',
          items: [{ description: 'Plan Upgrade Fee', amount: 25.17, quantity: 1 }],
          subtotal: 25.17,
          tax: 0,
          total: 25.17
        }
      ],
      planHistory: [
        {
          id: '1',
          date: '26/11/2025, 09:28 am',
          changeType: 'Activated',
          fromPlan: '-',
          toPlan: 'Enterprise Plan52',
          priceChange: '₹0',
          finalAmount: '₹61.25/month',
          status: 'Paid'
        },
        {
          id: '2',
          date: '26/11/2025, 09:53 am',
          changeType: 'Upgraded', 
          fromPlan: 'Enterprise Plan52',
          toPlan: 'Enterprise Plan8',
          priceChange: '+₹25.17',
          finalAmount: '₹86.42/month',
          status: 'Payment Due'
        }
      ]
    };
    
    res.json({
      success: true,
      subscription: mockData.subscription,
      invoices: mockData.invoices,
      planHistory: mockData.planHistory
    });
    
  } catch (error) {
    console.error('❌ Error fetching billing data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing data',
      error: error.message
    });
  }
});

// Payment processing endpoint
app.post('/api/billing/process-payment/:invoiceId', (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;
    const { transactionId, paymentMethod } = req.body;
    
    console.log(`💳 Processing payment for invoice ${invoiceId}`);
    
    // Simulate successful payment processing
    const paymentResult = {
      id: invoiceId,
      status: 'Paid',
      paymentDate: new Date('2025-12-03T' + new Date().toTimeString().split(' ')[0]).toISOString(),
      transactionId: transactionId,
      paymentMethod: { type: paymentMethod || 'UPI' }
    };
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      invoice: paymentResult
    });
    
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
});

// Enhanced PDF invoice generation endpoint (NO AUTHENTICATION REQUIRED)
app.get('/api/pdf/invoice/:invoiceId', (req, res) => {
  // Set CORS headers for direct access
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    const invoiceId = req.params.invoiceId;
    console.log(`📄 Generating PDF for invoice ${invoiceId} - NO AUTH REQUIRED`);
    
    // Mock invoice data - updated to match actual purchase history
    const invoiceData = {
      '1': {
        id: '1',
        invoiceNumber: 'INV-001',
        amount: 61.25,
        status: 'Paid',
        date: '2025-11-01',
        dueDate: '2025-11-15',
        description: 'Enterprise Plan52 - Monthly',
        items: [{ description: 'Enterprise Plan52 Monthly Subscription', amount: 61.25, quantity: 1 }],
        paymentDate: '2025-11-01',
        transactionId: 'TXN123456789',
        customer: {
          name: 'Divyaratnam Singh',
          email: 'divyarartnam@gmail.com'
        },
        subtotal: 61.25,
        tax: 0,
        total: 61.25
      },
      '2': {
        id: '2',
        invoiceNumber: 'INV-002',
        amount: 25.17,
        status: 'Pending',
        date: '2025-12-01',
        dueDate: '2025-12-15',
        description: 'Plan Upgrade Difference (Enterprise Plan52 → Enterprise Plan8)',
        items: [{ description: 'Plan Upgrade Fee (₹86.42 - ₹61.25)', amount: 25.17, quantity: 1 }],
        subtotal: 25.17,
        tax: 0,
        total: 25.17
      }
    };
    
    const invoice = invoiceData[invoiceId];
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Check if invoice is paid before generating PDF
    if (invoice.status.toLowerCase() !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice PDF is only available after payment completion',
        status: 'payment_required'
      });
    }
    
    // Generate HTML invoice
    const htmlContent = generateInvoiceHTML(invoice);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.html"`);
    res.send(htmlContent);
    
  } catch (error) {
    console.error('❌ Invoice generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
});

// Helper function to generate invoice HTML
function generateInvoiceHTML(invoice) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #1976d2;
        }
        .invoice-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #1976d2;
        }
        .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
        }
        .line-items {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: #fff;
        }
        .line-items th, .line-items td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .line-items th {
            background-color: #1976d2;
            color: white;
            font-weight: 600;
        }
        .total-section {
            float: right;
            width: 300px;
            margin-top: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
        }
        .total-row.final {
            font-weight: bold;
            font-size: 18px;
            border-bottom: 3px solid #1976d2;
            color: #1976d2;
            margin-top: 10px;
            padding-top: 15px;
        }
        .payment-info {
            background-color: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #4caf50;
        }
        .status {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status.paid {
            background-color: #d4edda;
            color: #155724;
        }
        .status.pending {
            background-color: #fff3cd;
            color: #856404;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1976d2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        @media print {
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    
    <div class="header">
        <div>
            <div class="company-name">BroadbandX</div>
            <div>123 Business Street<br>Business City, BC 12345<br>Phone: (555) 123-4567</div>
        </div>
        <div>
            <h2>INVOICE</h2>
        </div>
    </div>

    <div class="invoice-info">
        <div class="invoice-details">
            <div>
                <strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br>
                <strong>Invoice Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-IN')}<br>
                <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}
            </div>
            <div>
                <strong>Status:</strong> <span class="status ${invoice.status.toLowerCase()}">${invoice.status}</span><br>
                <strong>Customer:</strong> Divyaratnam<br>
                <strong>Email:</strong> divyaratnam@gmail.com
            </div>
        </div>
    </div>

    <h3>Services</h3>
    <table class="line-items">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity || 1}</td>
                    <td>₹${(item.amount || 0).toFixed(2)}</td>
                    <td>₹${(item.amount || 0).toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${(invoice.subtotal || invoice.amount).toFixed(2)}</span>
        </div>
        <div class="total-row">
            <span>Tax:</span>
            <span>₹${(invoice.tax || 0).toFixed(2)}</span>
        </div>
        <div class="total-row final">
            <span>Total:</span>
            <span>₹${(invoice.total || invoice.amount).toFixed(2)}</span>
        </div>
    </div>

    <div style="clear: both;"></div>
    
    ${invoice.status.toLowerCase() === 'paid' ? `
    <div class="payment-info">
        <h4>Payment Information</h4>
        <strong>Payment Date:</strong> ${new Date(invoice.paymentDate).toLocaleDateString('en-IN')}<br>
        <strong>Transaction ID:</strong> ${invoice.transactionId}<br>
        <strong>Payment Method:</strong> UPI
    </div>
    ` : ''}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
        <p><strong>Thank you for your business!</strong></p>
        <p><small>This invoice was generated electronically on December 3, 2025. For questions, please contact support.</small></p>
    </div>
</body>
</html>
  `;
}

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