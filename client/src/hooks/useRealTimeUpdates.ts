import { useEffect, useRef } from 'react';
import { realTimeService } from '../services/realTimeService';
import { useAuth } from '../contexts/AuthContext';

export const useRealTimeUpdates = () => {
  const { user } = useAuth();
  const isConnected = useRef(false);

  useEffect(() => {
    if (user && !isConnected.current) {
      // Connect to real-time service
      realTimeService.connect(user._id);
      isConnected.current = true;

      // Join admin room if user is admin
      if (user.role === 'admin') {
        realTimeService.joinAdminRoom();
      }
    }

    return () => {
      if (isConnected.current) {
        if (user?.role === 'admin') {
          realTimeService.leaveAdminRoom();
        }
        realTimeService.disconnect();
        isConnected.current = false;
      }
    };
  }, [user]);

  return realTimeService;
};

export const usePlanRequestUpdates = (onUpdate: (data: any) => void) => {
  useEffect(() => {
    // Subscribe to plan request events
    const events = [
      'plan_request_created',
      'plan_request_status_changed',
      'plan_request_approved',
      'plan_request_rejected',
      'plan_request_cancelled'
    ];

    events.forEach(event => {
      realTimeService.on(event, onUpdate);
    });

    return () => {
      events.forEach(event => {
        realTimeService.off(event, onUpdate);
      });
    };
  }, [onUpdate]);
};

export const useAdminPlanRequestUpdates = (onUpdate: (data: any) => void) => {
  useEffect(() => {
    // Subscribe to admin plan request events
    const events = [
      'admin_plan_request_created',
      'admin_plan_request_approved',
      'admin_plan_request_rejected',
      'admin_plan_request_cancelled'
    ];

    events.forEach(event => {
      realTimeService.on(event, onUpdate);
    });

    return () => {
      events.forEach(event => {
        realTimeService.off(event, onUpdate);
      });
    };
  }, [onUpdate]);
};