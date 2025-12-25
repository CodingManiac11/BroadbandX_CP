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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
  QrCode as QrCodeIcon,
  ContentCopy as CopyIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useRealtime } from '../../contexts/RealtimeContext';
// import { useAuth } from '../../context/AuthContext';
// import { InvoicePaymentButton } from './InvoicePaymentButton';

// QR Payment Modal Component
const QRPaymentModal = ({ open, onClose, invoice, onPaymentSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [transactionId] = useState(`TXN${Date.now()}`);
  
  const upiDetails = {
    id: '9570329856@ptyes',
    name: 'BroadbandX Services',
    amount: invoice?.amount || 0,
    transactionRef: transactionId,
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    });
  };

  const generateUPILink = () => {
    return `upi://pay?pa=${upiDetails.id}&pn=${encodeURIComponent(upiDetails.name)}&am=${upiDetails.amount}&tr=${upiDetails.transactionRef}&tn=${encodeURIComponent('BroadbandX Invoice Payment')}`;
  };

  const handlePaymentComplete = async () => {
    setLoading(true);
    try {
      console.log(`💳 Processing payment for invoice ${invoice.id}`);
      
      // Call server to complete payment in database
      const response = await axios.post('http://localhost:5001/api/billing/complete-payment', {
        invoiceId: invoice.id,
        paymentId: invoice.id,
        transactionId: transactionId
      });

      console.log('✅ Server payment completion response:', response.data);

      if (response.data.success) {
        // Create updated invoice object with Paid status
        const updatedInvoice = {
          ...invoice,
          status: 'Paid', // Ensure this is exactly 'Paid'
          paymentDate: new Date().toISOString(),
          transactionId: response.data.payment?.transactionId || transactionId
        };
        
        console.log('✅ Payment completed successfully, updated invoice:', updatedInvoice);
        console.log('🔍 Before payment - Invoice status:', invoice.status);
        console.log('🔍 After payment - Invoice status:', updatedInvoice.status);
        
        // Close modal first
        onClose();
        
        // Immediately notify parent with updated invoice
        setTimeout(() => {
          console.log('📤 Sending payment success to parent component');
          onPaymentSuccess?.(updatedInvoice);
        }, 100);
        
        // Force reload billing data from server to get updated status
        setTimeout(() => {
          console.log('🔄 Forcing billing data reload after payment');
          window.location.reload(); // Force complete page refresh to ensure updated data
        }, 500);
        
        alert(`✅ Payment of ₹${invoice.amount} completed successfully!`);
      } else {
        throw new Error(response.data.message || 'Payment completion failed');
      }
    } catch (error: any) {
      console.error('❌ Payment completion error:', error);
      alert(`❌ Payment failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <QrCodeIcon color="primary" />
          <Typography variant="h6">UPI Payment</Typography>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        <Card sx={{ mb: 2, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Invoice: {invoice?.invoiceNumber || 'INV-001'}
            </Typography>
            <Typography variant="h5" color="primary">
              ₹{invoice?.amount?.toFixed(2) || '0.00'}
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ 
            p: 3,
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 2,
            backgroundColor: 'primary.50',
            minHeight: '160px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <QrCodeIcon sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" color="primary">
              UPI QR Code
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scan with any UPI app
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ 
          p: 2, 
          backgroundColor: 'grey.100', 
          borderRadius: 1 
        }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            UPI ID:
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography 
              variant="body1" 
              sx={{ fontFamily: 'monospace', fontWeight: 'bold', flex: 1 }}
            >
              {upiDetails.id}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={() => copyToClipboard(upiDetails.id)}
            >
              Copy
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            fullWidth
            component="a"
            href={generateUPILink()}
            target="_blank"
            startIcon={<PaymentIcon />}
            sx={{ mb: 2 }}
          >
            Pay with UPI App
          </Button>
        </Box>

        <Alert severity="info">
          <Typography variant="body2">
            <strong>Popular UPI Apps:</strong> PhonePe, Google Pay, Paytm, BHIM, Amazon Pay
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handlePaymentComplete}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
        >
          {loading ? 'Verifying...' : "I've Paid"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Simple placeholder for InvoicePaymentButton
const InvoicePaymentButton = ({ invoice, onPaymentSuccess, onPaymentError, paidInvoices }: any) => {
  const [showQRPayment, setShowQRPayment] = useState(false);
  
  console.log(`🔍 Rendering InvoicePaymentButton for invoice ${invoice.id} with status: ${invoice.status}`);
  console.log(`💰 PaidInvoices set contains ${invoice.id}:`, paidInvoices?.has(invoice.id));

  const handleDownloadPDF = async (invoice: any) => {
    try {
      console.log('📄 Attempting to download PDF for invoice:', invoice.id);
      
      // Check if invoice is paid before attempting download
      if (invoice.status?.toLowerCase() !== 'paid') {
        alert('⚠️ PDF invoice is only available after payment completion. Please complete the payment first.');
        return;
      }
      
      // Map MongoDB payment IDs to simple invoice IDs for PDF endpoint
      const invoiceIdMapping: { [key: string]: string } = {
        '69268565094fd1e27e5b9acb': '1', // INV-001
        '69268565094fd1e27e5b9acc': '2'  // INV-002
      };
      
      const pdfInvoiceId = invoiceIdMapping[invoice.id as string] || invoice.invoiceNumber?.replace('INV-', '') || '1';
      console.log('📄 Using PDF invoice ID:', pdfInvoiceId, 'for payment ID:', invoice.id);
      
      // Get userId from localStorage to pass to PDF endpoint
      const userId = localStorage.getItem('userId');
      
      // Open PDF in new window for paid invoices only
      const pdfUrl = `http://localhost:5001/api/pdf/invoice/${pdfInvoiceId}?userId=${userId}`;
      window.open(pdfUrl, '_blank');
      
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Error downloading PDF. Please try again.');
    }
  };

  const handlePaymentComplete = (updatedInvoice: any) => {
    console.log('💳 Payment completed in button, updated invoice:', updatedInvoice);
    
    // Create new invoice with updated status
    const newInvoice = {
      ...updatedInvoice,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      transactionId: `TXN${Date.now()}`
    };
    
    // Call parent success handler with updated invoice
    onPaymentSuccess?.(newInvoice);
  };

  // Check if invoice is paid (case insensitive) - check both status and paidInvoices set
  const isPaid = invoice.status?.toLowerCase() === 'paid' || paidInvoices?.has(invoice.id);
  
  console.log(`🎯 Invoice ${invoice.id} isPaid: ${isPaid}, status: ${invoice.status}, inPaidSet: ${paidInvoices?.has(invoice.id)}`);

  if (isPaid) {
    return (
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ReceiptIcon />}
          onClick={() => handleDownloadPDF(invoice)}
        >
          Download PDF
        </Button>
        <Chip 
          label="Paid" 
          color="success" 
          size="small"
          icon={<CheckCircleIcon />}
        />
      </Stack>
    );
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
        <Button 
          size="small" 
          variant="contained" 
          color="primary"
          onClick={() => setShowQRPayment(true)}
          startIcon={<QrCodeIcon />}
        >
          Pay with UPI
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ReceiptIcon />}
          onClick={() => handleDownloadPDF(invoice)}
        >
          Download PDF
        </Button>
      </Stack>
      
      <QRPaymentModal
        open={showQRPayment}
        onClose={() => setShowQRPayment(false)}
        invoice={invoice}
        onPaymentSuccess={handlePaymentComplete}
      />
    </>
  );
};

interface BillingDashboardProps {
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

interface BillingData {
  subscription: any;
  invoices: any[];
}

const BillingDashboard: React.FC<BillingDashboardProps> = ({ onError, onSuccess }) => {
  console.log('🚀 SIMPLIFIED BILLING DASHBOARD LOADED - WITH REAL-TIME UPDATES');
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string>('');
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0); // Local refresh trigger
  const [paidInvoices, setPaidInvoices] = useState<Set<string>>(new Set()); // Track paid invoices
  
  // Use RealtimeContext for consistent real-time updates
  const { refreshTrigger } = useRealtime();

  // Manual refresh function
  const refreshBillingData = async () => {
    console.log('🔄 Manual refresh triggered - clearing cache and fetching latest data');
    
    // Clear any cached data
    setData(null);
    setPaidInvoices(new Set());
    setLoading(true);
    
    // Force fresh data load with cache-busting
    await loadBillingData(true);
    setLocalRefreshTrigger(Date.now());
  };

  // Load billing data on mount
  useEffect(() => {
    console.log('🔄 Starting billing data fetch');
    loadBillingData(true);
  }, []);

  // Watch for real-time subscription changes from RealtimeContext
  useEffect(() => {
    // The refreshTrigger from context changes when subscription events occur
    if (refreshTrigger > 0) {
      console.log('📡 Real-time update detected (trigger:', refreshTrigger, '), refreshing billing data...');
      loadBillingData(true);
    }
  }, [refreshTrigger]); // Trigger refresh when RealtimeContext detects changes

  const loadBillingData = async (forceFresh = false) => {
    try {
      setLoading(true);
      console.log('🌐 Making API call to fetch subscription data', forceFresh ? '(FORCE FRESH)' : '');
      
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('access_token'); // Use correct token key

      if (!userId || !token) {
        console.log('❌ Missing auth data:', { userId: !!userId, token: !!token });
        console.log('Available localStorage keys:', Object.keys(localStorage));
        throw new Error('Authentication required');
      }

      console.log('👤 User ID:', userId);
      console.log('🔑 Token found:', token ? 'YES' : 'NO');
      
      // Force cache bust to ensure fresh data
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };

      // Make single API call to get subscription data with cache busting
      const cacheBuster = forceFresh ? `&t=${Date.now()}&cb=${Math.random()}` : '';
      const response = await axios.get(
        `http://localhost:5001/api/customer/subscriptions?userId=${userId}${cacheBuster}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`
          },
          timeout: 15000 // 15 second timeout
        }
      );

      console.log('✅ API Response received:', response.data);
      console.log('🔍 Response structure check:', {
        isArray: Array.isArray(response.data),
        hasSuccessAndData: response.data?.success && response.data?.data,
        dataLength: response.data?.data?.length || response.data?.length,
        dataType: typeof response.data,
        actualData: response.data?.data || response.data
      });

      // Handle both response formats: direct array or {success, data} wrapper
      let subscriptionsArray;
      if (response.data?.success && response.data?.data) {
        // Format: {success: true, data: {...}} or {success: true, data: [...]}
        if (Array.isArray(response.data.data)) {
          subscriptionsArray = response.data.data;
        } else {
          // Single subscription object wrapped in success response
          subscriptionsArray = [response.data.data];
        }
      } else if (Array.isArray(response.data)) {
        // Format: direct array
        subscriptionsArray = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Single subscription object without wrapper
        subscriptionsArray = [response.data];
      } else {
        subscriptionsArray = [];
      }

      console.log('🔍 Extracted subscriptions array:', subscriptionsArray);

      if (subscriptionsArray.length > 0) {
        console.log('📊 Using REAL subscription data from API');
        
        let subscriptionData = subscriptionsArray[0]; // Get first item from array
        console.log('🔍 Raw subscription data structure:', subscriptionData);
        console.log('🔍 Subscription keys:', Object.keys(subscriptionData || {}));
        
        // Handle nested subscription structure
        if (subscriptionData?.subscriptions && Array.isArray(subscriptionData.subscriptions)) {
          console.log('🔍 Found nested subscriptions array, extracting first subscription');
          subscriptionData = subscriptionData.subscriptions[0];
          console.log('🔍 Extracted subscription data:', subscriptionData);
        }
        
        // Validate that this subscription belongs to the current user
        const currentUserId = localStorage.getItem('userId');
        const subscriptionUserId = subscriptionData?.user?.toString() || subscriptionData?.userId?.toString();
        
        console.log('🔐 User validation check:', {
          currentUserId,
          subscriptionUserId,
          match: currentUserId === subscriptionUserId
        });
        
        if (currentUserId !== subscriptionUserId) {
          console.error('❌ SECURITY ALERT: Subscription data belongs to different user!');
          console.error('  Current user:', currentUserId);
          console.error('  Subscription user:', subscriptionUserId);
          throw new Error('Data integrity error: Received subscription for different user');
        }
        
        // Process invoices from paymentHistory 
        console.log('🔍 Raw payment history from API:', subscriptionData?.paymentHistory);
        console.log('💰 Current paidInvoices set:', Array.from(paidInvoices));
        
        let processedInvoices = [];
        
        if (subscriptionData.paymentHistory && subscriptionData.paymentHistory.length > 0) {
          // Use real payment history if available
          processedInvoices = (subscriptionData.paymentHistory || []).map((payment: any, index: number) => {
            const paymentId = payment._id || payment.id;
            const isInPaidSet = paidInvoices.has(paymentId);
            const apiStatus = payment.status;
            const isCompleted = apiStatus === 'completed';
            
            console.log(`📋 Processing payment ${index + 1}:`, {
              paymentId,
              apiStatus,
              isCompleted,
              isInPaidSet,
              amount: payment.amount,
              rawPayment: payment
            });
            
            // Priority: Local paid state > API completed status > Default pending
            const finalStatus = isInPaidSet ? 'Paid' : (isCompleted ? 'Paid' : 'Pending');
            console.log(`💰 Final status for payment ${index + 1}: ${finalStatus} (Local override: ${isInPaidSet}, API completed: ${isCompleted})`);
            
            return {
              id: paymentId,
              invoiceNumber: `INV-${String(index + 1).padStart(3, '0')}`,
              amount: subscriptionData.pricing?.totalAmount || subscriptionData.pricing?.finalPrice || payment.amount || 0,
              status: finalStatus,
              date: new Date(payment.date).toLocaleDateString('en-GB'),
              dueDate: (() => {
                const startDate = new Date(subscriptionData.startDate || subscriptionData.createdAt);
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + 1);
                return dueDate.toLocaleDateString('en-GB');
              })(),
              description: index === 0 ? `${subscriptionData.planName || 'Subscription'} - Monthly` : `Plan Change - ${subscriptionData.planName || 'Subscription'}`,
              ...(payment.status === 'completed' || paidInvoices.has(paymentId) ? {
                paymentDate: new Date(payment.date).toISOString(),
                transactionId: payment.transactionId
              } : {})
            };
          });
        } else {
          // Create invoice from subscription data if no payment history
          console.log('📋 No payment history found, creating invoice from subscription data');
          processedInvoices = [{
            id: subscriptionData.id || subscriptionData._id,
            invoiceNumber: 'INV-001',
            amount: subscriptionData.pricing?.totalAmount || subscriptionData.pricing?.finalPrice || 0,
            status: 'Paid',
            date: new Date(subscriptionData.createdAt).toLocaleDateString('en-GB'),
            dueDate: (() => {
              const startDate = new Date(subscriptionData.startDate || subscriptionData.createdAt);
              const dueDate = new Date(startDate);
              dueDate.setMonth(dueDate.getMonth() + 1);
              return dueDate.toLocaleDateString('en-GB');
            })(),
            description: `${subscriptionData.planName || 'Subscription'} - Monthly`,
            paymentDate: new Date(subscriptionData.createdAt).toISOString(),
            transactionId: `TXN${subscriptionData.id || Date.now()}`
          }];
        }
        
        console.log('💳 Processed invoices from payment history:', processedInvoices);
        
        setData({
          subscription: {
            plan: { 
              name: subscriptionData.planName || subscriptionData.plan?.name || 'Unknown Plan', 
              price: subscriptionData.pricing?.totalAmount || subscriptionData.pricing?.finalPrice || 0
            },
            status: subscriptionData.status,
            nextBilling: subscriptionData.endDate ? new Date(subscriptionData.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          invoices: processedInvoices
        });
        console.log('📊 Subscription data loaded successfully');
      } else {
        console.log('⚠️ No subscription data found, showing mock data');
        
        // Create invoices respecting paid status - using actual payment IDs from database
        const mockInvoices = [
          { id: '69268565094fd1e27e5b9acb', invoiceNumber: 'INV-001', amount: 32.18, status: 'Paid', date: '03/12/2025', dueDate: '03/01/2026', description: 'Basic Plan29 - Monthly', paymentDate: '03/12/2025', transactionId: 'TXN001' },
          { id: '6930843e4e88bd85029b0fd2', invoiceNumber: 'INV-002', amount: 98.68, status: 'Pending', date: '04/12/2025', dueDate: '03/01/2026', description: 'Premium Plan79 - Monthly (After Upgrade)', paymentDate: null, transactionId: null }
        ];
        
        console.log('📋 Creating mock data with paid invoices:', Array.from(paidInvoices));
        
        setData({
          subscription: {
            plan: { name: 'Premium Plan79', price: 98.68 },
            status: 'active',
            nextBilling: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          invoices: mockInvoices
        });
      }

      setError('');
      console.log('🎉 Billing data loaded successfully!');
    } catch (error: any) {
      console.error('❌ Error loading billing data:', error);
      setError(error.message || 'Failed to load billing data');
      onError?.(error.message || 'Failed to load billing data');
      
      // Fallback to mock data respecting paid invoices - using actual payment IDs
      const fallbackInvoices = [
        { 
          id: '69268565094fd1e27e5b9acb', 
          invoiceNumber: 'INV-001', 
          amount: 32.18, 
          status: 'Paid', 
          date: '03/12/2025', 
          dueDate: '03/01/2026', 
          description: 'Basic Plan29 - Monthly', 
          paymentDate: '03/12/2025', 
          transactionId: 'TXN001' 
        },
        { 
          id: '6930843e4e88bd85029b0fd3', 
          invoiceNumber: 'INV-002', 
          amount: 98.68, 
          status: 'Pending', 
          date: new Date().toLocaleDateString('en-GB'), 
          dueDate: '03/01/2026', 
          description: 'Premium Plan79 - Monthly (After Upgrade)', 
          paymentDate: null, 
          transactionId: null 
        }
      ];
      
      console.log('🔄 Creating fallback data with paid invoices:', Array.from(paidInvoices));
      
        setData({
        subscription: {
          plan: { name: 'Premium Plan79', price: 98.68 },
          status: 'active',
          nextBilling: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        invoices: fallbackInvoices
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading billing information...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6">Unable to load billing information</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>{error}</Typography>
        <Button
          variant="outlined"
          onClick={() => loadBillingData(true)}
          sx={{ mt: 2 }}
          startIcon={<ScheduleIcon />}
        >
          Retry Loading
        </Button>
      </Alert>
    );
  }

  const { subscription, invoices } = data || {};

  return (
    <Box>
      {/* Current Subscription Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Current Subscription
          </Typography>
          
          {subscription && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Plan</Typography>
                <Typography variant="h6">{subscription.plan?.name || 'Basic Plan29'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Price</Typography>
                <Typography variant="h6">₹{subscription.plan?.price || 32.18}/month</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`Status: ${subscription.status || 'Active'}`}
                  color={subscription.status === 'active' ? 'success' : 'warning'}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Invoices
          </Typography>
          
          {invoices && invoices.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice: any, index: number) => (
                    <TableRow key={`${invoice.id || index}-${invoice.status}-${refreshTrigger}`}>
                      <TableCell>{invoice.invoiceNumber || `INV-${index + 1}`}</TableCell>
                      <TableCell>₹{invoice.amount || '32.18'}</TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status || 'paid'}
                          color={
                            (invoice.status?.toLowerCase() === 'paid') 
                              ? 'success' 
                              : 'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{invoice.date || new Date().toLocaleDateString()}</TableCell>
                      <TableCell>
                        <InvoicePaymentButton
                          key={`payment-${invoice.id}-${invoice.status}-${refreshTrigger}-${Array.from(paidInvoices).join('-')}`}
                          invoice={invoice}
                          paidInvoices={paidInvoices}
                          onPaymentSuccess={(updatedInvoice: any) => {
                            console.log('🎉 PAYMENT SUCCESS RECEIVED IN MAIN COMPONENT:', updatedInvoice);
                            
                            // Track this invoice as paid permanently
                            const newPaidInvoices = new Set(Array.from(paidInvoices).concat([updatedInvoice.id]));
                            setPaidInvoices(newPaidInvoices);
                            
                            // Force immediate re-render trigger
                            setLocalRefreshTrigger(prev => prev + 1000); // Large increment to ensure uniqueness
                            
                            // Create completely new invoice data with Paid status
                            const paidInvoice = {
                              ...updatedInvoice,
                              status: 'Paid', // Ensure status is exactly 'Paid'
                              paymentDate: new Date().toISOString(),
                              transactionId: `TXN${Date.now()}`
                            };
                            
                            console.log('🔄 Payment state update:', {
                              invoiceId: paidInvoice.id,
                              oldStatus: updatedInvoice.status,
                              newStatus: paidInvoice.status,
                              timestamp: new Date().toISOString(),
                              paidInvoicesSet: Array.from(newPaidInvoices)
                            });
                            
                            // Force immediate state update with completely new data
                            if (data?.invoices) {
                              const newInvoices = data.invoices.map(inv => {
                                if (inv.id === paidInvoice.id) {
                                  console.log(`💰 Updating invoice ${inv.id} from ${inv.status} to ${paidInvoice.status}`);
                                  return { ...paidInvoice }; // Create new object reference
                                }
                                return { ...inv }; // Ensure all objects are new references
                              });
                              
                              console.log('📊 New invoices array:', newInvoices);
                              
                              // Force complete state replacement with new object references
                              const newData = {
                                subscription: { ...data.subscription },
                                invoices: newInvoices
                              };
                              
                              setData(newData);
                              
                              // Multiple refresh triggers for UI update
                              setLocalRefreshTrigger(Date.now());
                              setTimeout(() => setLocalRefreshTrigger(Date.now()), 100);
                              setTimeout(() => setLocalRefreshTrigger(Date.now()), 500);
                              setTimeout(() => setLocalRefreshTrigger(Date.now()), 1000);
                            }
                            
                            // Show success message
                            alert(`✅ Payment of ₹${paidInvoice.amount} completed! Invoice status updated to Paid.`);
                            onSuccess?.('Payment completed successfully');
                          }}
                          onPaymentError={(error: string) => {
                            console.error('Payment error:', error);
                            onError?.(error);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              <Typography variant="body2">No invoices found. Your payment history will appear here.</Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          onClick={() => loadBillingData(true)}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <ScheduleIcon />}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </Box>
    </Box>
  );
};

export default BillingDashboard;