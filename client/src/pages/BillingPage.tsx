import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Paper
} from '@mui/material';
import { useRealtime } from '../contexts/RealtimeContext';
import {
  Receipt as BillingIcon,
  Settings as SettingsIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { 
  BillingDashboard, 
  SubscriptionActions 
} from '../components/billing';
import { 
  billingService,
  BillingSubscription 
} from '../services/billingService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`billing-tabpanel-${index}`}
      aria-labelledby={`billing-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const BillingPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Connect to real-time updates
  const { refreshTrigger } = useRealtime();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    fetchSubscription();
  }, []);

  // Refresh subscription when real-time events occur
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('📡 BillingPage: Real-time update detected (trigger:', refreshTrigger, '), refreshing subscription...');
      fetchSubscription();
    }
  }, [refreshTrigger]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const subscriptionData = await billingService.getSubscription();
      setSubscription(subscriptionData);
      setError(null);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
      // Don't show error for 404 (no subscription) - this is normal
      if ((error as any)?.response?.status !== 404) {
        setError('Failed to load subscription information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleError = (errorMessage: string) => {
    showSnackbar(errorMessage, 'error');
  };

  const handleSuccess = (message: string) => {
    showSnackbar(message, 'success');
    fetchSubscription(); // Refresh subscription data
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          Billing & Subscription
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your subscription, view invoices, and update your billing preferences.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !subscription && !error && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You don't have an active subscription. Visit our plans page to get started.
          </Alert>
        )}

        {(subscription || loading) && (
          <Paper elevation={1}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                aria-label="billing tabs"
              >
                <Tab 
                  icon={<BillingIcon />} 
                  label="Overview" 
                  id="billing-tab-0"
                  aria-controls="billing-tabpanel-0"
                />
                <Tab 
                  icon={<SettingsIcon />} 
                  label="Manage" 
                  id="billing-tab-1"
                  aria-controls="billing-tabpanel-1"
                  disabled={!subscription}
                />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <BillingDashboard onError={handleError} />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {subscription && (
                <SubscriptionActions
                  subscription={subscription}
                  onUpdate={() => {
                    fetchSubscription();
                    handleSuccess('Subscription updated successfully');
                  }}
                  onError={handleError}
                />
              )}
            </TabPanel>
          </Paper>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default BillingPage;