import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface InactivityTimeoutOptions {
  timeout?: number; // in milliseconds
  warningTime?: number; // show warning before logout (ms)
  onWarning?: () => void;
  onTimeout?: () => void;
}

/**
 * Hook to handle user inactivity timeout
 * Logs out user after specified inactivity period
 * 
 * @param options - Configuration options
 * @returns { showWarning, remainingTime, resetTimer }
 */
export const useInactivityTimeout = (options: InactivityTimeoutOptions = {}) => {
  const {
    timeout = 15 * 60 * 1000, // 15 minutes default
    warningTime = 2 * 60 * 1000, // 2 minutes warning
    onWarning,
    onTimeout
  } = options;

  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeout);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timers
  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // Handle logout
  const handleTimeout = () => {
    console.log('🚨 Inactivity timeout - logging out user');
    
    // Clear tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userId');
    
    // Clear timers
    clearTimers();
    
    // Call custom timeout handler
    if (onTimeout) {
      onTimeout();
    }
    
    // Redirect to login
    navigate('/login', { 
      state: { 
        message: 'You have been logged out due to inactivity',
        type: 'info'
      } 
    });
  };

  // Show warning before timeout
  const showTimeoutWarning = () => {
    console.log('⚠️ Inactivity warning shown');
    setShowWarning(true);
    
    // Start countdown
    let remaining = warningTime;
    setRemainingTime(remaining);
    
    countdownRef.current = setInterval(() => {
      remaining -= 1000;
      setRemainingTime(remaining);
      
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    }, 1000);
    
    if (onWarning) {
      onWarning();
    }
  };

  // Reset inactivity timer
  const resetTimer = () => {
    console.log('🔄 Activity detected - resetting inactivity timer');
    
    // Clear existing timers
    clearTimers();
    
    // Hide warning if shown
    setShowWarning(false);
    setRemainingTime(timeout);
    
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    // Set warning timer (timeout - warningTime)
    const warningDelay = timeout - warningTime;
    if (warningDelay > 0) {
      warningTimeoutRef.current = setTimeout(showTimeoutWarning, warningDelay);
    }
    
    // Set logout timer
    timeoutRef.current = setTimeout(handleTimeout, timeout);
  };

  // Track user activity
  useEffect(() => {
    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttle: Only reset timer once per 5 seconds to avoid excessive resets
    let lastReset = 0;
    const throttleDelay = 5000; // 5 seconds

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset >= throttleDelay) {
        lastReset = now;
        resetTimer();
      }
    };

    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    if (token) {
      // Add event listeners
      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      // Start initial timer
      resetTimer();
    }

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [timeout, warningTime]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    showWarning,
    remainingTime: Math.ceil(remainingTime / 1000), // Convert to seconds
    resetTimer
  };
};
