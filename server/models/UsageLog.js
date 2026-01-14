const mongoose = require('mongoose');

const UsageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deviceId: {
    type: String,
    required: true,
  },
  deviceType: {
    type: String,
    enum: ['Desktop', 'Mobile', 'Tablet', 'IoT', 'Other'],
    default: 'Other',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  download: {
    type: Number,  // in bytes
    required: true,
  },
  upload: {
    type: Number,  // in bytes
    required: true,
  },
  downloadSpeed: {
    type: Number,  // in Mbps
    required: true,
  },
  uploadSpeed: {
    type: Number,  // in Mbps
    required: true,
  },
  latency: {
    type: Number,  // in ms
    required: true,
  },
  packetLoss: {
    type: Number,  // percentage
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  },
  ipAddress: {
    type: String,
    required: true,
  },
  sessionDuration: {
    type: Number,  // in minutes
    required: true,
  },
}, {
  timestamps: true,
});

// Create indexes for better query performance
UsageLogSchema.index({ userId: 1, timestamp: -1 });
UsageLogSchema.index({ deviceId: 1 });
UsageLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('UsageLog', UsageLogSchema);