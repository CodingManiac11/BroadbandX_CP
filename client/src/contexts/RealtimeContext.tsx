import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import webSocketService from '../services/webSocketService';
import { toast } from 'react-toastify';

interface RealtimeContextType {
  isConnected: boolean;
  connectionId?: string;
  subscriptions: any[];
  refreshSubscriptions: () => void;
  notifications: RealtimeNotification[];
  clearNotification: (id: string) => void;
}

interface RealtimeNotification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  data?: any;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [connectionId, setConnectionId] = useState<string>();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Initialize WebSocket connection with less aggressive checking
    console.log('🔄 Initializing WebSocket connection...');
    if (!webSocketService.isConnected) {
      webSocketService.reconnect();
    }

    // Simple connection status check - only run a few times
    let attempts = 0;
    const maxAttempts = 3;
    const checkConnection = () => {
      const wasConnected = isConnected;
      const nowConnected = webSocketService.isConnected;
      
      console.log('🔍 WebSocket status check:', { wasConnected, nowConnected, attempts });
      
      if (wasConnected !== nowConnected) {
        console.log(`🔄 Connection status changed: ${wasConnected} → ${nowConnected}`);
        setIsConnected(nowConnected);
      }
      
      // Only try to reconnect a few times, then give up
      if (!nowConnected && attempts < maxAttempts) {
        console.log('🔄 Attempting WebSocket reconnection:', attempts + 1);
        attempts++;
        try {
          webSocketService.connect();
        } catch (error) {
          console.warn('Failed to connect WebSocket:', error);
        }
      }
      
      setConnectionId(webSocketService.connectionId);
    };

    // Initial connection check
    checkConnection();

    // Only do a couple more checks, then stop
    const timeouts = [
      setTimeout(checkConnection, 2000),  // Check after 2s
      setTimeout(checkConnection, 5000),  // Check after 5s
      setTimeout(checkConnection, 10000)  // Final check after 10s
    ];

    // Cleanup function to clear timeouts
    return () => {
      timeouts.forEach(clearTimeout);
    };

    // Setup event listeners only - no aggressive checking
    const handleSubscriptionCreated = (data: any) => {
      console.log('🔔 Subscription created:', data);
      
      // Add notification
      const notification: RealtimeNotification = {
        id: Date.now().toString(),
        type: 'subscription_created',
        message: data.message || 'New subscription created',
        timestamp: data.timestamp || new Date().toISOString(),
        data
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep only last 10
      
      // Show toast notification
      toast.success(data.message || 'New subscription created successfully!', {
        position: "top-right",
        autoClose: 5000,
      });
      
      // Trigger subscriptions refresh
      setRefreshTrigger(prev => prev + 1);
    };

    const handleSubscriptionCancelled = (data: any) => {
      console.log('🔔 Subscription cancelled:', data);
      
      const notification: RealtimeNotification = {
        id: Date.now().toString(),
        type: 'subscription_cancelled',
        message: data.message || 'Subscription cancelled',
        timestamp: data.timestamp || new Date().toISOString(),
        data
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 10));
      
      toast.warning(data.message || 'Subscription has been cancelled', {
        position: "top-right",
        autoClose: 5000,
      });
      
      setRefreshTrigger(prev => prev + 1);
    };

    const handleSubscriptionModified = (data: any) => {
      console.log('🔔 Subscription modified:', data);
      
      const notification: RealtimeNotification = {
        id: Date.now().toString(),
        type: 'subscription_modified',
        message: data.message || 'Subscription modified',
        timestamp: data.timestamp || new Date().toISOString(),
        data
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 10));
      
      toast.info(data.message || 'Subscription has been modified', {
        position: "top-right",
        autoClose: 5000,
      });
      
      setRefreshTrigger(prev => prev + 1);
    };

    const handleSubscriptionStatusChanged = (data: any) => {
      console.log('🔔 Subscription status changed:', data);
      
      const notification: RealtimeNotification = {
        id: Date.now().toString(),
        type: 'subscription_status_changed',
        message: data.message || 'Subscription status changed',
        timestamp: data.timestamp || new Date().toISOString(),
        data
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 10));
      
      toast.info(data.message || 'Subscription status has changed', {
        position: "top-right",
        autoClose: 5000,
      });
      
      setRefreshTrigger(prev => prev + 1);
    };

    const handleBillingUpdated = (data: any) => {
      console.log('🔔 Billing updated:', data);
      
      const notification: RealtimeNotification = {
        id: Date.now().toString(),
        type: 'billing_updated',
        message: data.message || 'Billing information updated',
        timestamp: data.timestamp || new Date().toISOString(),
        data
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 10));
      
      toast.info(data.message || 'Billing information has been updated', {
        position: "top-right",
        autoClose: 4000,
      });
    };

    const handlePaymentProcessed = (data: any) => {
      console.log('🔔 Payment processed:', data);
      
      const notification: RealtimeNotification = {
        id: Date.now().toString(),
        type: 'payment_processed',
        message: data.message || 'Payment processed',
        timestamp: data.timestamp || new Date().toISOString(),
        data
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 10));
      
      toast.success(data.message || 'Payment has been processed successfully', {
        position: "top-right",
        autoClose: 5000,
      });
    };

    const handleSystemNotification = (data: any) => {
      console.log('🔔 System notification:', data);
      
      const notification: RealtimeNotification = {
        id: Date.now().toString(),
        type: 'system_notification',
        message: data.message || 'System notification',
        timestamp: data.timestamp || new Date().toISOString(),
        data
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 10));
      
      toast.info(data.message || 'New system notification', {
        position: "top-right",
        autoClose: 6000,
      });
    };

    const handleUsageUpdated = (data: any) => {
      console.log('🔔 Usage updated:', data);
      
      const notification: RealtimeNotification = {
        id: Date.now().toString(),
        type: 'usage_updated',
        message: data.message || 'Usage data updated',
        timestamp: data.timestamp || new Date().toISOString(),
        data
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 10));
    };

    // Register event listeners
    webSocketService.on('subscription_created', handleSubscriptionCreated);
    webSocketService.on('subscription_cancelled', handleSubscriptionCancelled);
    webSocketService.on('subscription_modified', handleSubscriptionModified);
    webSocketService.on('subscription_status_changed', handleSubscriptionStatusChanged);
    webSocketService.on('billing_updated', handleBillingUpdated);
    webSocketService.on('payment_processed', handlePaymentProcessed);
    webSocketService.on('system_notification', handleSystemNotification);
    webSocketService.on('usage_updated', handleUsageUpdated);

    // Subscribe to updates
    webSocketService.subscribeToUpdates();

    return () => {
      // Cleanup event listeners
      webSocketService.off('subscription_created', handleSubscriptionCreated);
      webSocketService.off('subscription_cancelled', handleSubscriptionCancelled);
      webSocketService.off('subscription_modified', handleSubscriptionModified);
      webSocketService.off('subscription_status_changed', handleSubscriptionStatusChanged);
      webSocketService.off('billing_updated', handleBillingUpdated);
      webSocketService.off('payment_processed', handlePaymentProcessed);
      webSocketService.off('system_notification', handleSystemNotification);
      webSocketService.off('usage_updated', handleUsageUpdated);
    };
  }, []);

  const refreshSubscriptions = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const contextValue: RealtimeContextType = {
    isConnected,
    connectionId,
    subscriptions,
    refreshSubscriptions,
    notifications,
    clearNotification
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

export default RealtimeContext;