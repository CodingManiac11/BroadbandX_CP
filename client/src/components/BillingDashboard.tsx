import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  CreditCard,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowUp,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { billingService } from '../services/billingService';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || '');

interface Invoice {
  _id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  total: number;
  invoicePdf: string;
  items?: Array<{
    description: string;
    amount: number;
    quantity: number;
    total: number;
  }>;
  notes?: string;
  metadata?: Map<string, string>;
}

interface BillingStats {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
}

interface BillingOverview {
  recentInvoices: Invoice[];
  upcomingInvoice: Invoice | null;
  stats: BillingStats;
}

interface PaymentButtonProps {
  invoice: Invoice;
  onPaymentSuccess: () => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ invoice, onPaymentSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      const result = await billingService.processUpgradePayment(invoice._id, {
        type: 'credit_card',
        last4: '4242',
        cardBrand: 'visa'
      });

      if (result.success) {
        alert('Payment processed successfully!');
        onPaymentSuccess();
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (invoice.status === 'paid') {
    return (
      <div className="flex items-center text-green-600">
        <CheckCircle size={16} className="mr-2" />
        Paid
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePayment}
        disabled={processing}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Processing...' : `Pay ₹${invoice.amount.toFixed(2)}`}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

interface Invoice {
  _id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  total: number;
  invoicePdf: string;
}

interface BillingStats {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
}

interface BillingOverview {
  recentInvoices: Invoice[];
  upcomingInvoice: Invoice | null;
  stats: BillingStats;
}

const PaymentMethodForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update payment method on server
      await axios.put('/api/billing/payment-method', {
        paymentMethodId: paymentMethod.id,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }} />
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Update Payment Method'}
      </button>
    </form>
  );
};

const BillingDashboard: React.FC = () => {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (userId && token && !isInitialized) {
      setIsInitialized(true);
      initializeBillingData();
    }
  }, [userId, token, isInitialized]);

  const initializeBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create the upgrade scenario first
      await billingService.createUpgradeScenario();
      
      // Then fetch the billing data
      await fetchBillingData();
    } catch (err: any) {
      console.error('Error initializing billing data:', err);
      setError('Failed to initialize billing data');
    }
  };

  const fetchBillingData = async () => {
    if (!userId || !token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch invoices using the new endpoint
      const invoicesResponse = await billingService.getUserInvoices(userId);
      
      if (invoicesResponse.success && invoicesResponse.data) {
        setInvoices(invoicesResponse.data);
        
        // Calculate stats
        const stats = invoicesResponse.data.reduce((acc, invoice) => {
          if (invoice.status === 'paid') {
            acc.totalPaid += invoice.amount;
          } else if (invoice.status === 'pending') {
            acc.totalPending += invoice.amount;
          } else if (invoice.status === 'overdue') {
            acc.totalOverdue += invoice.amount;
          }
          return acc;
        }, { totalPaid: 0, totalPending: 0, totalOverdue: 0 });

        // Find pending upgrade invoice
        const upcomingInvoice = invoicesResponse.data.find(
          inv => inv.status === 'pending' && inv.notes?.includes('upgrade')
        ) || null;

        setOverview({
          recentInvoices: invoicesResponse.data,
          upcomingInvoice,
          stats
        });
      }
    } catch (err: any) {
      console.error('Billing data fetch error:', err);
      setError(err.message || 'Failed to fetch billing data');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    fetchBillingData(); // Refresh data after payment
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await axios.get(`/api/billing/invoice/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoice.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download invoice:', err);
    }
  };

  if (loading) return <div>Loading billing information...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!overview) return <div>No billing data available</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'overdue':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Billing Dashboard</h1>

      {/* Billing Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Paid</p>
              <p className="text-2xl font-semibold text-green-500">
                {formatCurrency(overview.stats.totalPaid)}
              </p>
            </div>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Pending Payments</p>
              <p className="text-2xl font-semibold text-yellow-500">
                {formatCurrency(overview.stats.totalPending)}
              </p>
            </div>
            <Clock className="text-yellow-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Overdue Amount</p>
              <p className="text-2xl font-semibold text-red-500">
                {formatCurrency(overview.stats.totalOverdue)}
              </p>
            </div>
            <AlertCircle className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {/* Current Plan Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Current Plan Status</h2>
          <div className="flex items-center text-blue-600">
            <ArrowUp className="mr-2" size={16} />
            <span className="text-sm">Upgrade in Progress</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Current Plan</h3>
            <p className="text-xl font-bold text-gray-900">Enterprise Plan52</p>
            <p className="text-gray-600">₹61.25/month</p>
            <p className="text-green-600 text-sm mt-1 flex items-center">
              <CheckCircle size={14} className="mr-1" />
              Paid
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <h3 className="font-medium text-blue-700 mb-2">Upgrading To</h3>
            <p className="text-xl font-bold text-blue-900">Enterprise Plan8</p>
            <p className="text-blue-700">₹86.42/month (base)</p>
            <p className="text-orange-600 text-sm mt-1">
              Additional payment required: +₹25.17
            </p>
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Invoices</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">Invoice #</th>
                <th className="text-left py-3">Description</th>
                <th className="text-left py-3">Date</th>
                <th className="text-left py-3">Amount</th>
                <th className="text-left py-3">Status</th>
                <th className="text-left py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice._id} className="border-b">
                  <td className="py-3 font-mono text-sm">{invoice.invoiceNumber}</td>
                  <td className="py-3">
                    {invoice.items && invoice.items[0] ? invoice.items[0].description : 'Invoice'}
                    {invoice.notes?.includes('upgrade') && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Upgrade
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td className="py-3 font-semibold">
                    ₹{invoice.amount.toFixed(2)}
                  </td>
                  <td className="py-3">
                    <span className={getStatusColor(invoice.status)}>
                      {(invoice.status || 'unknown').charAt(0).toUpperCase() + (invoice.status || 'unknown').slice(1)}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-2">
                      {invoice.status === 'pending' ? (
                        <PaymentButton 
                          invoice={invoice} 
                          onPaymentSuccess={handlePaymentSuccess}
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownloadInvoice(invoice._id)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Download Invoice"
                          >
                            <Download size={20} />
                          </button>
                          {invoice.status === 'paid' && (
                            <Receipt size={16} className="text-green-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {invoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="mx-auto mb-2" size={48} />
              <p>No invoices found</p>
              <button 
                onClick={initializeBillingData}
                className="mt-2 text-blue-600 hover:text-blue-700 underline"
              >
                Create Sample Billing Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Invoice */}
      {overview?.upcomingInvoice && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">Payment Due</h2>
              <p className="text-yellow-700">Invoice #{overview.upcomingInvoice.invoiceNumber}</p>
              <p className="text-2xl font-bold text-yellow-900">₹{overview.upcomingInvoice.amount.toFixed(2)}</p>
              <p className="text-yellow-600">
                Due on {format(new Date(overview.upcomingInvoice.dueDate), 'MMM dd, yyyy')}
              </p>
            </div>
            <PaymentButton 
              invoice={overview.upcomingInvoice} 
              onPaymentSuccess={handlePaymentSuccess}
            />
          </div>
        </div>
      )}

      {/* Payment Method Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
        {showPaymentForm ? (
          <Elements stripe={stripePromise}>
            <PaymentMethodForm onSuccess={() => {
              setShowPaymentForm(false);
              fetchBillingData();
            }} />
          </Elements>
        ) : (
          <button
            onClick={() => setShowPaymentForm(true)}
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <CreditCard className="mr-2" size={20} />
            Update Payment Method
          </button>
        )}
      </div>
    </div>
  );
};

export default BillingDashboard;