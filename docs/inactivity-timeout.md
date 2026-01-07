# Inactivity Timeout Configuration

## Overview
Implemented automatic user logout after 15 minutes of inactivity with a 2-minute warning before timeout.

## How It Works

### Inactivity Detection
- **Tracked Events**: mousedown, mousemove, keypress, scroll, touchstart, click
- **Throttling**: Activity checks throttled to once every 5 seconds to optimize performance
- **Timer Reset**: Any activity resets both warning and logout timers

### Timeline
```
User Activity → 0:00
    ↓
13 Minutes of No Activity
    ↓
Warning Shown → 13:00
    ↓
User Inactive for 2 More Minutes
    ↓
Auto Logout → 15:00
```

### User Experience
1. **Active Use**: Timers continuously reset, user stays logged in indefinitely
2. **Warning Phase (13-15 min)**: 
   - Modal appears with countdown timer
   - User can click "Stay Logged In" to continue session
   - Any activity (mouse/keyboard) also dismisses warning and resets timer
3. **Timeout (15 min)**:
   - User automatically logged out
   - Tokens cleared from localStorage
   - Redirected to login page with info message

## Configuration

### Current Settings (App.tsx)
```typescript
{
  timeout: 15 * 60 * 1000,      // 15 minutes total
  warningTime: 2 * 60 * 1000,   // 2 minutes warning before logout
}
```

### Customization Options
You can adjust these values in `client/src/App.tsx`:

**For Banking/Financial Apps** (stricter):
```typescript
{
  timeout: 5 * 60 * 1000,       // 5 minutes total
  warningTime: 1 * 60 * 1000,   // 1 minute warning
}
```

**For Standard Web Apps** (balanced):
```typescript
{
  timeout: 15 * 60 * 1000,      // 15 minutes total
  warningTime: 2 * 60 * 1000,   // 2 minutes warning
}
```

**For Low-Risk Apps** (relaxed):
```typescript
{
  timeout: 30 * 60 * 1000,      // 30 minutes total
  warningTime: 3 * 60 * 1000,   // 3 minutes warning
}
```

## Files Added

### 1. useInactivityTimeout.ts
**Location**: `client/src/hooks/useInactivityTimeout.ts`
**Purpose**: Custom React hook managing inactivity detection and timers

**Features**:
- Monitors user activity events
- Manages warning and logout timers
- Throttles activity checks (5-second intervals)
- Handles automatic logout and cleanup
- Returns warning state and remaining time

### 2. InactivityWarningModal.tsx
**Location**: `client/src/components/InactivityWarningModal.tsx`
**Purpose**: Visual warning modal shown before timeout

**Features**:
- Countdown timer display (MM:SS format)
- Warning icon and alert message
- "Stay Logged In" button
- Material-UI themed design
- Cannot be dismissed by clicking outside or ESC key

### 3. App.tsx (Modified)
**Location**: `client/src/App.tsx`
**Changes**: 
- Imported inactivity hook and modal
- Initialized hook with 15-minute timeout
- Added modal component before ToastContainer

## Security Benefits

### Combined with JWT Tokens
Your app now has **dual-layer timeout protection**:

1. **Token Expiry** (15 minutes): 
   - Even if token is stolen, expires quickly
   - Automatic refresh keeps active users logged in

2. **Inactivity Timeout** (15 minutes):
   - Protects unattended sessions
   - Prevents unauthorized access to open sessions
   - User must be actively using the app

### Example Scenarios

**Scenario 1: User Steps Away**
```
10:00 AM - User logs in
10:05 AM - User gets coffee (leaves computer unlocked)
10:18 AM - Warning appears (no one sees it)
10:20 AM - Auto logout
Result: ✅ Session secured after 20 minutes
```

**Scenario 2: Active User**
```
10:00 AM - User logs in
10:14 AM - User clicks button
10:28 AM - User types in form
10:42 AM - User scrolls page
Result: ✅ User stays logged in, timers keep resetting
```

**Scenario 3: User Sees Warning**
```
10:00 AM - User logs in
10:13 AM - Warning appears
10:14 AM - User clicks "Stay Logged In"
Result: ✅ Timer resets, user continues working
```

## Testing Guide

### Manual Testing
1. **Test Activity Detection**:
   ```
   - Login to the app
   - Open browser console
   - Look for: "🔄 Activity detected - resetting inactivity timer"
   - Move mouse → Should see log every 5 seconds max
   ```

2. **Test Warning**:
   ```
   - Login and don't interact for 13 minutes
   - Warning modal should appear
   - Countdown should show 2:00, 1:59, 1:58...
   - Click "Stay Logged In" → Modal closes, timer resets
   ```

3. **Test Auto Logout**:
   ```
   - Login and don't interact for 15 minutes
   - Should see: "🚨 Inactivity timeout - logging out user"
   - Should redirect to login page
   - Message: "You have been logged out due to inactivity"
   ```

### Quick Testing (Dev Mode)
To test quickly without waiting 15 minutes, temporarily change in App.tsx:

```typescript
const { showWarning, remainingTime, resetTimer } = useInactivityTimeout({
  timeout: 2 * 60 * 1000,      // 2 minutes (instead of 15)
  warningTime: 30 * 1000,      // 30 seconds (instead of 2 min)
});
```

Then:
- Don't touch mouse/keyboard for 1.5 minutes → Warning appears
- Wait 30 more seconds → Auto logout

**Remember**: Change back to 15 minutes for production!

## Integration with Existing Security

### Works Seamlessly With:
✅ **JWT Token Expiry** (15-minute access tokens)
✅ **Token Refresh** (30-day refresh tokens)
✅ **Role-Based Access Control** (admin/customer roles)
✅ **Protected Routes** (authentication checks)

### Does Not Conflict With:
✅ API calls (activity detection doesn't interrupt requests)
✅ Socket.io connections (real-time updates work normally)
✅ Background processes (only logs out on inactivity)

## Troubleshooting

### Warning Doesn't Appear
**Issue**: No modal after 13 minutes of inactivity
**Check**:
1. Is user logged in? (Check localStorage for `access_token`)
2. Open console → Any errors?
3. Verify imports in App.tsx are correct

### Timer Keeps Resetting
**Issue**: Warning never appears, even when inactive
**Check**:
1. Any background JavaScript running? (animations, auto-refresh)
2. Browser extensions triggering mouse events?
3. Check console for "Activity detected" logs

### Logout Happens Too Soon/Late
**Issue**: Timing doesn't match configuration
**Check**:
1. Verify timeout values in App.tsx (in milliseconds)
2. Check browser console timestamps
3. Ensure no other logout logic interfering

## Production Recommendations

### Recommended Settings
- **Timeout**: 15 minutes (current)
- **Warning**: 2 minutes (current)
- **Reasoning**: Balances security with user experience

### Optional Enhancements
1. **Remember Last Activity**: Store activity timestamp in localStorage
2. **Cross-Tab Sync**: Logout all tabs when one times out
3. **Configurable by Role**: Different timeouts for admin vs customer
4. **Server-Side Validation**: Backend checks last activity timestamp

### Monitoring
Track these metrics in production:
- How often users see warnings
- How often users click "Stay Logged In"
- How often auto-logout occurs
- Average session duration

## Comparison: Token Expiry vs Inactivity Timeout

| Feature | Token Expiry | Inactivity Timeout |
|---------|-------------|-------------------|
| **What it protects** | Stolen tokens | Unattended sessions |
| **Trigger** | Time since token issued | Time since last activity |
| **Active user impact** | None (auto-refresh) | None (timer resets) |
| **Inactive user impact** | Token expires in 15 min | Logged out in 15 min |
| **Can be extended?** | Yes (refresh token) | Yes (any activity) |
| **Visible to user?** | No | Yes (warning modal) |

## Summary

✅ **Implemented**: 15-minute inactivity timeout with 2-minute warning
✅ **Security**: Dual-layer protection (token expiry + inactivity)
✅ **UX**: Seamless for active users, warns before logout
✅ **Configurable**: Easy to adjust timing in App.tsx
✅ **Production-Ready**: Follows security best practices

Your app now meets enterprise-level security standards for session management! 🎉
