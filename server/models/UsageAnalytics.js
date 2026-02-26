const mongoose = require('mongoose');

const usageAnalyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  metrics: {
    dataUsed: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Data used cannot be negative']
    },
    speedTests: [{
      timestamp: { type: Date, default: Date.now },
      downloadSpeed: { type: Number, required: true },
      uploadSpeed: { type: Number, required: true },
      latency: { type: Number, required: true },
      location: String,
      server: String
    }],
    sessionMetrics: {
      totalSessions: { type: Number, default: 0 },
      avgSessionDuration: { type: Number, default: 0 }, // in minutes
      peakUsageHours: [{
        hour: { type: Number, min: 0, max: 23 },
        dataUsed: { type: Number, default: 0 }
      }],
      deviceTypes: [{
        type: { type: String, enum: ['mobile', 'desktop', 'tablet', 'smart-tv', 'gaming-console', 'iot', 'other'] },
        count: { type: Number, default: 0 },
        dataUsed: { type: Number, default: 0 }
      }]
    },
    qualityMetrics: {
      uptime: { type: Number, default: 100, min: 0, max: 100 }, // percentage
      packetLoss: { type: Number, default: 0, min: 0, max: 100 }, // percentage
      jitter: { type: Number, default: 0 }, // in ms
      dns_resolution_time: { type: Number, default: 0 } // in ms
    }
  },
  applicationUsage: [{
    application: {
      type: String,
      enum: ['streaming', 'gaming', 'video-calls', 'browsing', 'downloads', 'social-media', 'work', 'education', 'other'],
      required: true
    },
    dataUsed: { type: Number, required: true },
    duration: { type: Number, required: true }, // in minutes
    qualityScore: { type: Number, min: 1, max: 10 }, // user-reported quality
    peakBandwidth: Number // highest bandwidth used for this app
  }],
  geolocation: {
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  networkConditions: {
    weather: String, // for correlation analysis
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night']
    },
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    networkCongestion: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  },
  anomalies: [{
    type: {
      type: String,
      enum: ['unusual-usage', 'speed-degradation', 'frequent-disconnections', 'high-latency'],
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    description: String,
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: Date,
    resolution: String
  }],
  predictions: {
    nextMonthUsage: Number, // predicted data usage for next month
    optimalPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan'
    },
    confidence: { type: Number, min: 0, max: 1 }, // confidence score of the prediction
    factors: [String] // factors influencing the prediction
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for usage efficiency (actual vs. plan capacity)
usageAnalyticsSchema.virtual('usageEfficiency').get(function () {
  if (this.populated('subscription') && this.subscription.plan) {
    const planLimit = this.subscription.plan.features.dataLimit.amount;
    if (planLimit && !this.subscription.plan.features.dataLimit.unlimited) {
      return (this.metrics.dataUsed / planLimit) * 100;
    }
  }
  return null;
});

// Virtual for average speed
usageAnalyticsSchema.virtual('averageSpeed').get(function () {
  if (this.metrics.speedTests && this.metrics.speedTests.length > 0) {
    const totalDown = this.metrics.speedTests.reduce((sum, test) => sum + test.downloadSpeed, 0);
    const totalUp = this.metrics.speedTests.reduce((sum, test) => sum + test.uploadSpeed, 0);
    return {
      download: totalDown / this.metrics.speedTests.length,
      upload: totalUp / this.metrics.speedTests.length
    };
  }
  return { download: 0, upload: 0 };
});

// Indexes for performance
usageAnalyticsSchema.index({ user: 1, date: -1 });
usageAnalyticsSchema.index({ subscription: 1, date: -1 });
usageAnalyticsSchema.index({ date: -1 });
usageAnalyticsSchema.index({ 'metrics.dataUsed': -1 });
usageAnalyticsSchema.index({ 'networkConditions.timeOfDay': 1 });
usageAnalyticsSchema.index({ 'networkConditions.dayOfWeek': 1 });

// Compound indexes for analytics queries
usageAnalyticsSchema.index({ user: 1, 'networkConditions.timeOfDay': 1 });
usageAnalyticsSchema.index({ subscription: 1, 'applicationUsage.application': 1 });

// Static method to get user usage summary
usageAnalyticsSchema.statics.getUserUsageSummary = function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDataUsed: { $sum: '$metrics.dataUsed' },
        avgDailyUsage: { $avg: '$metrics.dataUsed' },
        peakDailyUsage: { $max: '$metrics.dataUsed' },
        avgDownloadSpeed: { $avg: '$metrics.speedTests.downloadSpeed' },
        avgUploadSpeed: { $avg: '$metrics.speedTests.uploadSpeed' },
        avgLatency: { $avg: '$metrics.speedTests.latency' },
        totalSessions: { $sum: '$metrics.sessionMetrics.totalSessions' },
        avgUptime: { $avg: '$metrics.qualityMetrics.uptime' }
      }
    }
  ]);
};

// Static method to get usage patterns for recommendations
usageAnalyticsSchema.statics.getUsagePatterns = function (userId, months = 3) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          hour: { $hour: '$date' },
          dayOfWeek: '$networkConditions.dayOfWeek'
        },
        avgDataUsed: { $avg: '$metrics.dataUsed' },
        applications: { $push: '$applicationUsage' }
      }
    },
    {
      $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 }
    }
  ]);
};

// Static method to detect anomalies
usageAnalyticsSchema.statics.detectAnomalies = function (userId, threshold = 2) {
  // This would typically involve more complex statistical analysis
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: null,
        avgUsage: { $avg: '$metrics.dataUsed' },
        stdDev: { $stdDevPop: '$metrics.dataUsed' },
        records: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        anomalies: {
          $filter: {
            input: '$records',
            cond: {
              $gt: [
                { $abs: { $subtract: ['$$this.metrics.dataUsed', '$avgUsage'] } },
                { $multiply: ['$stdDev', threshold] }
              ]
            }
          }
        }
      }
    }
  ]);
};

// Method to add speed test result
usageAnalyticsSchema.methods.addSpeedTest = function (downloadSpeed, uploadSpeed, latency, location, server) {
  this.metrics.speedTests.push({
    downloadSpeed,
    uploadSpeed,
    latency,
    location,
    server
  });
  return this.save();
};

// Method to add anomaly
usageAnalyticsSchema.methods.addAnomaly = function (type, severity, description) {
  this.anomalies.push({
    type,
    severity,
    description
  });
  return this.save();
};

// Method to calculate usage score (for recommendations)
usageAnalyticsSchema.methods.calculateUsageScore = function () {
  const weights = {
    dataUsage: 0.4,
    speedConsistency: 0.2,
    uptime: 0.2,
    applicationDiversity: 0.2
  };

  // Normalize data usage (0-100 scale)
  const dataScore = Math.min(100, (this.metrics.dataUsed / 1000) * 100);

  // Speed consistency score
  const speedTests = this.metrics.speedTests;
  let speedScore = 0;
  if (speedTests.length > 0) {
    const speeds = speedTests.map(test => test.downloadSpeed);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
    speedScore = Math.max(0, 100 - Math.sqrt(variance));
  }

  // Uptime score
  const uptimeScore = this.metrics.qualityMetrics.uptime;

  // Application diversity score
  const appTypes = new Set(this.applicationUsage.map(app => app.application));
  const diversityScore = Math.min(100, (appTypes.size / 9) * 100); // 9 total app types

  return (
    dataScore * weights.dataUsage +
    speedScore * weights.speedConsistency +
    uptimeScore * weights.uptime +
    diversityScore * weights.applicationDiversity
  );
};

module.exports = mongoose.model('UsageAnalytics', usageAnalyticsSchema);