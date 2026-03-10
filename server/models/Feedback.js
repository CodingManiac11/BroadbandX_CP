const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  type: {
    type: String,
    enum: ['service', 'support', 'billing', 'general'],
    required: true
  },
  rating: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    speed: {
      type: Number,
      min: 1,
      max: 5
    },
    reliability: {
      type: Number,
      min: 1,
      max: 5
    },
    support: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'responded', 'resolved'],
    default: 'pending'
  },
  response: {
    content: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  tags: [{
    type: String
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['web', 'mobile', 'email', 'support'],
    default: 'web'
  },
  metadata: {
    browser: String,
    device: String,
    location: String
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
FeedbackSchema.index({ user: 1, createdAt: -1 });
FeedbackSchema.index({ type: 1, status: 1 });
FeedbackSchema.index({ sentiment: 1, createdAt: -1 });

// Pre-save middleware to analyze sentiment
FeedbackSchema.pre('save', function (next) {
  if (this.isModified('comment') || this.isNew) {
    // Simple sentiment analysis based on rating
    if (this.rating.overall >= 4) {
      this.sentiment = 'positive';
    } else if (this.rating.overall <= 2) {
      this.sentiment = 'negative';
    } else {
      this.sentiment = 'neutral';
    }
  }
  next();
});

// Static method to get average ratings
FeedbackSchema.statics.getAverageRatings = async function () {
  const averages = await this.aggregate([
    {
      $group: {
        _id: null,
        avgOverall: { $avg: '$rating.overall' },
        avgSpeed: { $avg: '$rating.speed' },
        avgReliability: { $avg: '$rating.reliability' },
        avgSupport: { $avg: '$rating.support' },
        avgValue: { $avg: '$rating.value' }
      }
    }
  ]);

  return averages[0];
};

// Method to check if feedback needs attention
FeedbackSchema.methods.needsAttention = function () {
  return (
    this.status === 'pending' &&
    (this.sentiment === 'negative' || this.rating.overall <= 2)
  );
};

module.exports = mongoose.model('Feedback', FeedbackSchema);