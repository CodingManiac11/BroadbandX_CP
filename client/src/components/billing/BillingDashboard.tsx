import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Stack,
  Divider
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  Receipt as ReceiptIcon,
  CreditCard as CreditCardIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  billingService,
  BillingSubscription,
  BillingInvoice,
  BillingPlan,
  SubscriptionPlanHistory
} from '../../services/billingService';
import { useRealtime } from '../../contexts/RealtimeContext';

interface BillingDashboardProps {
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({ onError, onSuccess }) => {
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [planHistory, setPlanHistory] = useState<SubscriptionPlanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get real-time context for subscription updates
  const { notifications, isConnected } = useRealtime();

  const handleError = useCallback((message: string) => {
    setHasError(true);
    setErrorMessage(message);
    onError?.(message);
  }, [onError]);

  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage('');
  }, []);

  // Single data fetch on mount only - no real-time updates
  const fetchBillingData = useCallback(async () => {
    if (dataLoaded) return; // Prevent multiple fetches
    
    console.log('🔄 Starting billing data fetch...');
    setLoading(true);
    
    try {
      console.log('🚀 Making API requests...');
      const [subscriptionData, invoicesData, historyData] = await Promise.allSettled([
        billingService.getSubscription(),
        billingService.getInvoices(),
        billingService.getPlanHistory()
      ]);

      console.log('📊 Processing API responses...');

      // Handle subscription data
      if (subscriptionData.status === 'fulfilled') {
        setSubscription(subscriptionData.value);
        console.log('✅ Subscription data loaded successfully');
      } else {
        console.warn('❌ Failed to load subscription:', subscriptionData.reason);
        setSubscription(null);
      }

      // Handle invoices data
      if (invoicesData.status === 'fulfilled') {
        setInvoices(invoicesData.value);
        console.log('✅ Invoices data loaded successfully');
      } else {
        console.warn('❌ Failed to load invoices:', invoicesData.reason);
        setInvoices([]);
      }

      // Handle plan history data
      if (historyData.status === 'fulfilled') {
        console.log('📋 Plan history data received:', historyData.value);
        console.log('📊 Plan history count:', historyData.value?.length || 0);
        setPlanHistory(historyData.value);
        console.log('✅ Plan history loaded successfully');
      } else {
        console.warn('❌ Failed to load plan history:', historyData.reason);
        setPlanHistory([]);
      }

      setDataLoaded(true);
      console.log('🎉 Billing data fetch completed successfully');

    } catch (error: any) {
      console.error('💥 Error fetching billing data:', error);
      
      // Set default states on error
      setSubscription(null);
      setInvoices([]);
      setPlanHistory([]);
      
      handleError(`Failed to load billing information: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log('🏁 Billing data fetch finished, loading set to false');
    }
  }, [dataLoaded, handleError]);

  // Only fetch data once on mount
  useEffect(() => {
    console.log('🚀 BillingDashboard mounted, starting data fetch...');
    fetchBillingData();
  }, [fetchBillingData]);

  // Listen for real-time subscription updates
  useEffect(() => {
    if (!notifications || !isConnected) return;

    // Check for recent subscription-related notifications
    const recentNotifications = notifications.filter(notification => 
      ['subscription_modified', 'subscription_created', 'subscription_cancelled'].includes(notification.type) &&
      new Date(notification.timestamp).getTime() > Date.now() - 30000 // Last 30 seconds
    );

    if (recentNotifications.length > 0) {
      console.log('🔄 Real-time subscription update detected, refreshing billing data...');
      refreshBillingData();
    }
  }, [notifications, isConnected]);

  // Manual refresh function
  const refreshBillingData = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    console.log('🔄 Manually refreshing billing data...');
    
    try {
      const [subscriptionData, invoicesData, historyData] = await Promise.allSettled([
        billingService.getSubscription(),
        billingService.getInvoices(),
        billingService.getPlanHistory()
      ]);

      // Handle subscription data
      if (subscriptionData.status === 'fulfilled') {
        setSubscription(subscriptionData.value);
        console.log('✅ Subscription data refreshed');
      }

      // Handle invoices data
      if (invoicesData.status === 'fulfilled') {
        setInvoices(invoicesData.value);
        console.log('✅ Invoices data refreshed');
      }

      // Handle plan history data
      if (historyData.status === 'fulfilled') {
        setPlanHistory(historyData.value);
        console.log('✅ Plan history refreshed:', historyData.value?.length || 0, 'entries');
      }

      onSuccess?.('Billing information updated in real-time');
    } catch (error: any) {
      console.error('💥 Error refreshing billing data:', error);
      handleError(`Failed to refresh billing information: ${error.message || 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, handleError, onSuccess]);

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      setDownloadingInvoice(invoiceId);
      const blob = await billingService.downloadInvoicePDF(invoiceId);
      billingService.downloadFile(blob, `invoice-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      onError?.('Failed to download invoice');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handlePreviewInvoice = async (invoiceId: string) => {
    try {
      await billingService.previewInvoicePDF(invoiceId);
      // Preview opens in new window, show success message
      onSuccess?.('Invoice preview opened in new window');
    } catch (error) {
      console.error('Error previewing invoice:', error);
      onError?.('Failed to preview invoice. Please try downloading instead.');
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'past_due':
        return 'warning';
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading billing information...
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          This may take a few moments
        </Typography>
        <Button 
          variant="text" 
          size="small" 
          onClick={() => {
            setLoading(false);
            handleError('Loading cancelled by user. Please check if the server is running and try again.');
          }}
          sx={{ mt: 2 }}
        >
          Cancel Loading
        </Button>
      </Box>
    );
  }

  if (hasError) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Unable to load billing information
            </Typography>
            <Typography variant="body2">
              {errorMessage}
            </Typography>
          </Alert>
          <Stack direction="row" spacing={2}>
            <Button 
              variant="contained" 
              onClick={() => {
                clearError();
                fetchBillingData();
              }}
            >
              Try Again
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Stack>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              If this problem persists, please make sure the server is running and try refreshing the page.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        You don't have an active subscription. Please select a plan to get started.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Real-time status and refresh controls */}
      <Alert 
        severity={isConnected ? 'success' : 'info'} 
        sx={{ mb: 2 }}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={refreshBillingData}
              disabled={refreshing}
              startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Stack>
        }
      >
        {isConnected ? 
          '🟢 Real-time billing updates active - Plan changes will appear instantly' : 
          '🔄 Billing data loaded from server - Click refresh to check for updates'
        }
      </Alert>

      {/* Current Subscription */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Subscription
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Plan
                  </Typography>
                  <Typography variant="h6">
                    {subscription.planId.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip 
                    label={formatStatus(subscription.status)}
                    color={getStatusColor(subscription.status)}
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Price
                  </Typography>
                  <Typography variant="body1">
                    {billingService.formatCents(subscription.planId.price)} / {subscription.planId.billingCycle}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Current Period
                  </Typography>
                  <Typography variant="body1">
                    {billingService.formatDate(subscription.currentPeriodStart)} - {billingService.formatDate(subscription.currentPeriodEnd)}
                  </Typography>
                </Box>
                {subscription.scheduledChanges && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Scheduled Change
                    </Typography>
                    <Chip 
                      icon={<ScheduleIcon />}
                      label={`${subscription.scheduledChanges.type} on ${billingService.formatDate(subscription.scheduledChanges.effectiveDate)}`}
                      color="info"
                      size="small"
                    />
                  </Box>
                )}
                {subscription.cancellationScheduled && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Cancellation Scheduled
                    </Typography>
                    <Chip 
                      icon={<CancelIcon />}
                      label={`Ends ${billingService.formatDate(subscription.cancellationScheduled.effectiveDate)}`}
                      color="warning"
                      size="small"
                    />
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Invoices
          </Typography>
          {invoices.length === 0 ? (
            <Typography color="text.secondary">
              No invoices available.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {invoice.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {billingService.formatDate(invoice.createdAt)}
                      </TableCell>
                      <TableCell>
                        {billingService.formatDate(invoice.billingPeriodStart)} - {billingService.formatDate(invoice.billingPeriodEnd)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {billingService.formatCents(invoice.totalCents)}
                        </Typography>
                        {invoice.taxCents > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Tax: {billingService.formatCents(invoice.taxCents)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={formatStatus(invoice.status)}
                          color={getStatusColor(invoice.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Preview Invoice">
                            <IconButton 
                              size="small"
                              onClick={() => handlePreviewInvoice(invoice._id)}
                            >
                              <PreviewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download PDF">
                            <span>
                              <IconButton 
                                size="small"
                                onClick={() => handleDownloadInvoice(invoice._id, invoice.invoiceNumber)}
                                disabled={downloadingInvoice === invoice._id}
                              >
                                {downloadingInvoice === invoice._id ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <DownloadIcon />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Plan History */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              <CreditCardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Plan History ({planHistory.length} changes detected)
            </Typography>
            {refreshing && (
              <Chip 
                label="Updating..." 
                color="primary" 
                size="small"
                icon={<CircularProgress size={16} />}
              />
            )}
          </Stack>
          {planHistory.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date & Time (IST)</TableCell>
                    <TableCell>Change Type</TableCell>
                    <TableCell>From Plan</TableCell>
                    <TableCell>To Plan</TableCell>
                    <TableCell>Price Change</TableCell>
                    <TableCell>Final Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {planHistory.map((change: any) => (
                    <TableRow key={change.id || change._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {change.dateIST || new Date(change.date || change.effectiveDate).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'Asia/Kolkata'
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          India Standard Time
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={change.changeType || formatStatus(change.type)}
                          color={change.type === 'activated' ? 'success' : 
                                 change.type === 'upgraded' || change.changeType === 'upgraded' ? 'info' :
                                 change.type === 'downgraded' || change.changeType === 'downgraded' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {change.fromPlan ? (
                          <Typography variant="body2">
                            {change.fromPlan.name || change.fromPlan}
                            {(change.fromPrice || change.fromPlan?.price) && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                ₹{change.fromPrice || (change.fromPlan.price / 100)}/month
                              </Typography>
                            )}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                          {change.toPlan?.name || change.toPlan}
                        </Typography>
                        {(change.toPrice || change.toPlan?.price) && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            ₹{change.toPrice || (change.toPlan.price / 100)}/month (base)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {change.priceChange !== null && change.priceChange !== undefined ? (
                          <Typography 
                            variant="body2" 
                            color={change.priceChange > 0 ? 'error.main' : change.priceChange < 0 ? 'success.main' : 'text.primary'}
                            sx={{ fontWeight: 500 }}
                          >
                            {change.priceChange > 0 ? '+' : ''}₹{change.priceChange}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {change.finalAmount && (
                          <Box>
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                              ₹{change.finalAmount}/month
                            </Typography>
                            {change.paymentStatus === 'payment_due' && (
                              <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                                Additional payment required
                              </Typography>
                            )}
                            {change.paymentStatus === 'payment_due' && (
                              <Chip 
                                label="Payment Due" 
                                color="error" 
                                size="small" 
                                sx={{ mt: 0.5 }}
                              />
                            )}
                            {change.paymentStatus === 'refund_pending' && (
                              <Chip 
                                label="Refund Pending" 
                                color="warning" 
                                size="small" 
                                sx={{ mt: 0.5 }}
                              />
                            )}
                            {change.paymentStatus === 'completed' && (
                              <Chip 
                                label="Paid" 
                                color="success" 
                                size="small" 
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        )}
                        {change.proration && !change.finalAmount && (
                          <Box>
                            {change.proration.creditCents > 0 && (
                              <Typography variant="caption" color="success.main" display="block">
                                Credit: {billingService.formatCents(change.proration.creditCents)}
                              </Typography>
                            )}
                            {change.proration.chargeCents > 0 && (
                              <Typography variant="caption" color="error.main" display="block">
                                Charge: {billingService.formatCents(change.proration.chargeCents)}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Stack>
                <Typography variant="body2" gutterBottom>
                  No plan changes detected yet. Your plan modification history will appear here.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Real-time updates: {isConnected ? '🟢 Active' : '🟡 Checking...'}
                </Typography>
              </Stack>
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

BillingDashboard.displayName = 'BillingDashboard';

export default BillingDashboard;