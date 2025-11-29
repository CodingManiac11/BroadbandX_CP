const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Enable CORS
app.use(cors());

// Set security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Data Sanitization against NoSQL Injection
app.use(mongoSanitize());

// Data Sanitization against XSS
app.use(xss());

// Compression
app.use(compression());

// Route files
const auth = require('./routes/auth');
const users = require('./routes/users');
const plans = require('./routes/plans');
const subscriptions = require('./routes/subscriptions');
const usage = require('./routes/usage');
const payments = require('./routes/payments');
const admin = require('./routes/admin');
const planRequests = require('./routes/planRequests');
const billing = require('./routes/billing');
const pdf = require('./routes/pdf');
const scheduler = require('./routes/scheduler');

// Mount routers
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/plans', plans);
app.use('/api/subscriptions', subscriptions);
app.use('/api/usage', usage);
app.use('/api/payments', payments);
app.use('/api/admin', admin);
app.use('/api/plan-requests', planRequests);
app.use('/api/billing', billing);
app.use('/api/pdf', pdf);
app.use('/api/scheduler', scheduler);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});