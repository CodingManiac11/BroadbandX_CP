# Usage Analytics System

## Overview
The usage analytics system generates realistic, unique usage data for each user based on their subscription plan. Each user has a distinct consumption pattern influenced by their plan speed, data limit, and randomly assigned user behavior profile.

## How Usage is Generated

### User-Specific Characteristics
Each user is assigned unique characteristics based on their user ID:

1. **Usage Profile**:
   - **Heavy vs Light User** (40% heavy, 60% light)
   - **Peak Hours** (18:00-22:00 with individual variation)
   - **Daily Hours** (4-10 hours of internet usage per day)
   - **Weekend Multiplier** (1.2x-1.7x more usage on weekends)
   - **Streaming User** (50% chance of being streaming-heavy)
   - **Download/Upload Ratio** (70-100% download bias)

2. **Plan-Based Calculation**:
   - Users consume 70-90% of their plan's data limit over 30 days
   - Daily usage varies based on user profile (heavy users use 30% more)
   - Speed varies slightly from plan speed (-20% to +10% variation)

3. **Realistic Patterns**:
   - **Multiple sessions per day** (2-6 sessions)
   - **Time-based behavior**:
     - Weekdays 9AM-5PM: More desktop usage
     - Evenings 6PM-10PM: Peak hours with more consumption
     - Late night/Early morning: Less usage, streaming devices
   - **Latency variations**: Better at night (20ms), worse during peak (35ms)
   - **Device distribution**: Mobile, Desktop, Tablet based on time and user profile

### Example User Patterns

**User A** (Heavy Desktop User, 100GB plan):
- Uses 85GB/month (85% of limit)
- Peak hours: 7PM-11PM
- 7 hours/day average
- Weekend: 1.6x multiplier
- Desktop-heavy during work hours
- Downloads: 90%, Uploads: 10%

**User B** (Light Mobile User, 50GB plan):
- Uses 32GB/month (64% of limit)
- Peak hours: 6PM-9PM
- 5 hours/day average
- Weekend: 1.3x multiplier
- Mobile-heavy usage
- Downloads: 75%, Uploads: 25%

## Data Consistency

### Same Data Everywhere
The system ensures consistency across:

1. **Customer Dashboard** (`/dashboard`)
   - Shows usage from `/api/usage/current`
   - Real-time usage percentage
   - Download/Upload breakdown

2. **Usage Analytics Page** (`/dashboard` → Usage Analytics section)
   - Uses same API: `/api/usage/current`
   - Shows detailed usage history
   - Same billing cycle data

3. **Data Source**: All pages fetch from `UsageLog` collection
   - Aggregated by user ID and timestamp
   - Filtered from subscription start date
   - Consistent calculations across all endpoints

## API Endpoints

### Get Current Usage
```
GET /api/usage/current/:userId
GET /api/usage/current (uses logged-in user)
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalDownload": 45.6,
    "totalUpload": 12.3,
    "totalUsage": 57.9,
    "downloadUsage": 45.6,
    "uploadUsage": 12.3,
    "dataLimit": 107374182400,
    "dataLimitGB": 100,
    "usagePercentage": 57.9,
    "period": "current",
    "billingCycle": {
      "start": "2026-01-01T00:00:00.000Z",
      "end": "2026-01-31T23:59:59.999Z"
    },
    "lastUpdated": "2026-01-13T10:30:00.000Z"
  }
}
```

### Get Usage History
```
GET /api/usage/daily/:userId?days=30
GET /api/usage/history/:userId?limit=7
```

### Generate Usage (Admin Only)
```
POST /api/usage/generate-all
Body: { "daysBack": 30, "forceRegenerate": false }
```

## Usage Generation Script

### Run Manually
```bash
cd server
npm run generate-usage
```

### What It Does
1. Finds all active subscriptions
2. Checks if user already has recent usage data (last 7 days)
3. If yes: Skips user (keeps existing data)
4. If no: Generates 30 days of usage data
5. Creates 2-6 sessions per day with realistic patterns
6. Distributes data based on user profile and plan

### Output Example
```
🚀 Starting usage generation for all users...

📊 Generating usage for John: 3.2 GB/day avg (Heavy user)
✅ Generated 180 usage logs for John
   Total usage: 92.50 GB (92.5% of 100GB limit)

📊 Generating usage for Sarah: 1.8 GB/day avg (Light user)
   Total usage: 48.75 GB (97.5% of 50GB limit)

📊 === GENERATION SUMMARY ===
✅ Successfully generated: 12 users
⏭️  Skipped (already had data): 3 users
📈 Total subscriptions: 15

📋 Detailed Results:
1. John: 92.50 GB (92.5% of 100GB)
2. Sarah: 48.75 GB (97.5% of 50GB)
3. Mike: 145.60 GB (72.8% of 200GB)
...
```

## How Each User Gets Different Consumption

### Factors Creating Unique Patterns

1. **Deterministic Randomness**:
   - Uses user ID as seed for reproducible randomness
   - Same user always gets same profile (unless regenerated)
   - Different users get completely different patterns

2. **Plan-Based Scaling**:
   - 50GB plan user: ~35-45GB usage
   - 100GB plan user: ~70-90GB usage
   - 200GB plan user: ~140-180GB usage
   - Speed scales with plan (25Mbps vs 100Mbps vs 1000Mbps)

3. **Time-Based Variations**:
   - Each user has different peak hours (18-22 range)
   - Different daily hours (4-10 hours range)
   - Different weekend behavior (1.2-1.7x multiplier)

4. **Session Distribution**:
   - Number of sessions varies (2-6 per day)
   - Session timing varies by user profile
   - Session duration varies (30min-4hours)
   - Data distributed unevenly across sessions

5. **Device Preferences**:
   - Work hour users: More desktop
   - Mobile-first users: More mobile
   - Streaming users: More tablet/TV devices
   - Time-of-day affects device choice

## Troubleshooting

### Issue: Users Don't Have Usage Data
**Solution**: Run the generation script
```bash
cd server
npm run generate-usage
```

### Issue: Usage Not Consistent Between Pages
**Check**:
1. Both pages should call `/api/usage/current`
2. Verify billing cycle dates match
3. Check browser console for API errors
4. Verify user ID is same in both requests

### Issue: All Users Have Same Usage
**Cause**: Old random generation code (removed)
**Solution**: New code uses deterministic seed-based generation

### Issue: Usage Doesn't Match Plan Limit
**Expected**: Users should use 70-90% of their plan limit
**If not**: 
- Check subscription start date (usage only counts from then)
- Verify plan features.dataLimit.amount is set correctly
- Regenerate usage data

## Technical Details

### Data Structure (UsageLog)
```javascript
{
  userId: ObjectId,
  deviceId: String,
  deviceType: "Desktop" | "Mobile" | "Tablet",
  timestamp: Date,
  download: Number,  // bytes
  upload: Number,    // bytes
  downloadSpeed: Number,  // Mbps
  uploadSpeed: Number,    // Mbps
  latency: Number,   // ms
  packetLoss: Number, // percentage
  sessionDuration: Number, // minutes
  ipAddress: String
}
```

### Aggregation Query
The system aggregates usage logs:
```javascript
{
  $match: { userId, timestamp: { $gte: subscriptionStartDate } },
  $group: {
    totalDownload: { $sum: '$download' },
    totalUpload: { $sum: '$upload' },
    // ...other metrics
  }
}
```

### Calculation Formula
```javascript
// Daily target
avgDailyGB = (dataLimit * 0.7-0.9) / 30

// Heavy user adjustment
baseDaily = avgDailyGB * (heavyUser ? 1.3 : 0.7)

// Weekend adjustment
dailyGB = baseDaily * (isWeekend ? 1.2-1.7 : 1.0)

// Random variation
finalDaily = dailyGB * (0.8-1.2)
```

## Summary

✅ **Unique per user**: Each user has distinct consumption patterns
✅ **Plan-based**: Usage scaled to plan speed and data limit
✅ **Realistic**: Multiple sessions, time-based patterns, device distribution
✅ **Consistent**: Same data shown in dashboard and analytics
✅ **Deterministic**: Same user always gets same profile (unless regenerated)
✅ **Scalable**: Can generate for all users with one command

Your usage analytics system now provides realistic, individualized data for each user! 🎉
