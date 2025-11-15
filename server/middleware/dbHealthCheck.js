const mongoose = require('mongoose');

// Database health check middleware
const dbHealthCheck = (req, res, next) => {
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    // Database not connected, but don't block the request
    console.warn('⚠️  Database not connected, some features may not work');
    req.dbConnected = false;
  } else {
    req.dbConnected = true;
  }
  next();
};

// Database operation wrapper with timeout handling
const dbOperation = async (operation, fallbackData = null) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  Database not connected, returning fallback data');
      return fallbackData;
    }
    
    // Set operation timeout
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database operation timeout')), 5000)
    );
    
    return await Promise.race([operation(), timeout]);
  } catch (error) {
    console.error('Database operation failed:', error.message);
    return fallbackData;
  }
};

module.exports = { dbHealthCheck, dbOperation };