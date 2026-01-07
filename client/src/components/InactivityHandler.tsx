import React from 'react';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import { InactivityWarningModal } from './InactivityWarningModal';

/**
 * Component that handles inactivity timeout detection and warning
 * Must be rendered inside Router context
 */
export const InactivityHandler: React.FC = () => {
  // Inactivity timeout: 15 minutes (with 2-minute warning)
  const { showWarning, remainingTime, resetTimer } = useInactivityTimeout({
    timeout: 15 * 60 * 1000, // 15 minutes
    warningTime: 2 * 60 * 1000, // 2 minutes warning
    onWarning: () => {
      console.log('⚠️ User will be logged out soon due to inactivity');
    },
    onTimeout: () => {
      console.log('🚨 User logged out due to inactivity');
    }
  });

  return (
    <InactivityWarningModal
      open={showWarning}
      remainingSeconds={remainingTime}
      onStayLoggedIn={resetTimer}
    />
  );
};
