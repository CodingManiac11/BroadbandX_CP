import api from './api';

export interface BillingPlan {
  _id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  dataLimit: number;
  speedLimit: number;
  status: 'active' | 'inactive';
  metadata?: any;
}

export interface BillingSubscription {
  _id: string;
  userId: string;
  planId: BillingPlan;
  status: 'active' | 'cancelled' | 'past_due' | 'trial';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  proration?: {
    daysUsed: number;
    daysTotal: number;
    proratedAmount: number;
  };
  scheduledChanges?: {
    planId: string;
    effectiveDate: string;
    type: 'upgrade' | 'downgrade';
  };
  cancellationScheduled?: {
    effectiveDate: string;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoice {
  _id: string;
  invoiceNumber: string;
  subscriptionId: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paidAt?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    type: 'subscription' | 'proration' | 'adjustment' | 'credit';
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface BillingAdjustment {
  _id: string;
  subscriptionId: string;
  type: 'credit' | 'charge';
  amountCents: number;
  description: string;
  reason: string;
  status: 'pending' | 'applied' | 'cancelled';
  appliedAt?: string;
  createdAt: string;
}

export interface SubscriptionPlanHistory {
  _id: string;
  subscriptionId: string;
  fromPlan?: BillingPlan;
  toPlan: BillingPlan;
  changeType: 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'activated';
  effectiveDate: string;
  proration?: {
    daysUsed: number;
    daysTotal: number;
    creditCents: number;
    chargeCents: number;
  };
  // Additional fields for enhanced plan history display
  fromPrice?: number;
  toPrice?: number;
  priceChange?: number;
  finalAmount?: number;
  date?: string;
  reason?: string;
  status?: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSubscriptionRequest {
  planId: string;
  startDate?: string;
}

export interface ChangePlanRequest {
  newPlanId: string;
  effective?: 'immediate' | 'next_billing_cycle';
  effectiveDate?: string;
}

export interface CancelSubscriptionRequest {
  effective?: 'immediate' | 'end_of_billing_cycle';
  effectiveDate?: string;
  reason?: string;
}

export interface CreateAdjustmentRequest {
  type: 'credit' | 'charge';
  amountCents: number;
  description: string;
  reason: string;
}

class BillingService {
  // Plan management
  async getPlans(): Promise<BillingPlan[]> {
    try {
      // Try new billing API first
      const response = await api.get('/billing/plans');
      return response.data.plans;
    } catch (error) {
      // Fallback to existing plans API and transform data
      console.log('New billing plans API not available, using existing plans data...');
      try {
        const existingResponse = await api.get('/plans');
        const plans = existingResponse.data.data || existingResponse.data.plans || [];

        // Transform existing plans to billing plan format
        const billingPlans: BillingPlan[] = plans.map((plan: any) => ({
          _id: plan._id,
          name: plan.name,
          price: plan.pricing?.monthly ? Math.round(plan.pricing.monthly * 100) : 0, // Convert to cents
          billingCycle: 'monthly', // Default to monthly
          features: plan.features || [],
          dataLimit: plan.dataLimit || 0,
          speedLimit: plan.speed || 0,
          status: plan.status || 'active',
          metadata: {
            originalPlan: plan,
            source: 'existing_api'
          }
        }));

        return billingPlans;
      } catch (fallbackError) {
        console.error('Failed to fetch plans from both APIs:', fallbackError);
        return [];
      }
    }
  }

  async getPlan(planId: string): Promise<BillingPlan> {
    const response = await api.get(`/billing/plans/${planId}`);
    return response.data.plan;
  }

  // Subscription management
  async getSubscription(): Promise<BillingSubscription> {
    try {
      // Skip the new billing API for now and use existing subscription data directly
      console.log('🔄 Using existing subscription API (billing endpoints not available)...');
      const existingResponse = await api.get('/subscriptions/my-subscriptions');
      const subscriptions = existingResponse.data.data.subscriptions;
      
      if (!subscriptions || subscriptions.length === 0) {
        throw new Error('No active subscription found');
      }

      // Transform existing subscription to billing subscription format
      const existingSub = subscriptions[0]; // Get first active subscription
      
      // Get correct price - prioritize plan's actual pricing over calculated amounts
      let planPrice = 0; // in cents
      if (existingSub.plan.pricing?.monthly) {
        // Legacy system stores price in dollars, convert to cents
        planPrice = Math.round(existingSub.plan.pricing.monthly * 100);
      } else if (existingSub.pricing?.basePrice) {
        // Alternative: use base price from subscription
        planPrice = Math.round(existingSub.pricing.basePrice * 100);
      } else if (existingSub.pricing?.finalPrice) {
        // Last resort: use final price (includes tax) and remove tax
        const finalPriceWithTax = existingSub.pricing.finalPrice;
        planPrice = Math.round((finalPriceWithTax / 1.08) * 100); // Remove 8% tax
      }

      console.log('💰 Price conversion details:', {
        planPricingMonthly: existingSub.plan.pricing?.monthly,
        basePrice: existingSub.pricing?.basePrice, 
        finalPrice: existingSub.pricing?.finalPrice,
        convertedPriceCents: planPrice,
        convertedPriceDollars: planPrice / 100
      });

      const billingSubscription: BillingSubscription = {
          _id: existingSub._id,
          userId: existingSub.user,
          planId: {
            _id: existingSub.plan._id,
            name: existingSub.plan.name,
            price: planPrice, // Now in cents
            billingCycle: existingSub.billingCycle || 'monthly',
            features: existingSub.plan.features || [],
            dataLimit: existingSub.plan.dataLimit || 0,
            speedLimit: existingSub.plan.speed || 0,
            status: 'active'
          },
          status: existingSub.status === 'active' ? 'active' : 
                  existingSub.status === 'cancelled' ? 'cancelled' : 
                  existingSub.status === 'expired' ? 'past_due' : 'active',
          currentPeriodStart: existingSub.startDate,
          currentPeriodEnd: existingSub.endDate,
          createdAt: existingSub.createdAt,
          updatedAt: existingSub.updatedAt
        };

        return billingSubscription;
    } catch (error) {
      console.error('Error in getSubscription:', error);
      throw error;
    }
  }

  async createSubscription(data: CreateSubscriptionRequest): Promise<BillingSubscription> {
    try {
      const response = await api.post('/billing/subscription', data);
      return response.data.subscription;
    } catch (error) {
      // Fallback to existing subscription creation API
      console.log('New billing subscription API not available, using existing API...');
      try {
        const createResponse = await api.post('/subscriptions', {
          planId: data.planId,
          startDate: data.startDate
        });
        
        // Return the newly created subscription in billing format
        return await this.getSubscription();
      } catch (fallbackError) {
        throw new Error('Subscription creation failed. Please try again or contact support.');
      }
    }
  }

  async changePlan(data: ChangePlanRequest): Promise<BillingSubscription> {
    try {
      const response = await api.put('/billing/subscription/plan', data);
      return response.data.subscription;
    } catch (error) {
      // Fallback to existing upgrade/downgrade API
      console.log('New plan change API not available, attempting existing API...');
      try {
        const subscription = await this.getSubscription();
        const upgradeResponse = await api.put(`/subscriptions/${subscription._id}/upgrade`, {
          newPlanId: data.newPlanId,
          effectiveDate: data.effectiveDate
        });
        
        // Return updated subscription
        return await this.getSubscription();
      } catch (fallbackError) {
        throw new Error('Plan change functionality not available. Please contact support.');
      }
    }
  }

  async cancelSubscription(data?: CancelSubscriptionRequest): Promise<BillingSubscription> {
    try {
      const response = await api.delete('/billing/subscription', { data });
      return response.data.subscription;
    } catch (error) {
      // Fallback to existing cancel API
      console.log('New cancellation API not available, attempting existing API...');
      try {
        const subscription = await this.getSubscription();
        const cancelResponse = await api.put(`/subscriptions/${subscription._id}/cancel`, {
          reason: data?.reason,
          effectiveDate: data?.effectiveDate
        });
        
        return await this.getSubscription();
      } catch (fallbackError) {
        throw new Error('Cancellation functionality not available. Please contact support.');
      }
    }
  }

  async reactivateSubscription(): Promise<BillingSubscription> {
    try {
      const response = await api.post('/billing/subscription/reactivate');
      return response.data.subscription;
    } catch (error) {
      throw new Error('Reactivation functionality not available. Please contact support.');
    }
  }

  // Invoice management with improved error handling and retry logic
  async getInvoices(): Promise<BillingInvoice[]> {
    try {
      // Skip billing API and generate from subscription data directly
      console.log('🔄 Generating invoices from subscription data...');
      
      const subscription = await this.getSubscription();
      if (!subscription) return [];

      // Price is already in cents from the getSubscription method
      const priceInCents = subscription.planId.price;
      const totalCents = priceInCents; // No tax as requested

      console.log('📊 Invoice generation details:', {
        planName: subscription.planId.name,
        priceInCents: priceInCents,
        priceRupees: (priceInCents / 100).toFixed(2),
        totalCents: totalCents
      });

      // Create a mock invoice based on current subscription
      const mockInvoice: BillingInvoice = {
          _id: `inv-${subscription._id}`,
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
          subscriptionId: subscription._id,
          status: 'paid',
          subtotalCents: priceInCents,
          taxCents: 0, // No tax
          totalCents: totalCents,
          billingPeriodStart: subscription.currentPeriodStart,
          billingPeriodEnd: subscription.currentPeriodEnd,
          dueDate: subscription.currentPeriodEnd,
          paidAt: subscription.currentPeriodStart,
          lineItems: [
            {
              description: `${subscription.planId.name} - ${subscription.planId.billingCycle}`,
              quantity: 1,
              unitPriceCents: priceInCents,
              totalCents: priceInCents,
              type: 'subscription'
            }
          ],
          createdAt: subscription.currentPeriodStart,
          updatedAt: subscription.currentPeriodStart
        };

        console.log('✅ Successfully generated mock invoice:', mockInvoice);
        return [mockInvoice];
    } catch (fallbackError) {
      console.error('Failed to generate mock invoice:', fallbackError);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  async getInvoice(invoiceId: string): Promise<BillingInvoice> {
    const response = await api.get(`/billing/invoices/${invoiceId}`);
    return response.data.invoice;
  }

  async downloadInvoicePDF(invoiceId: string): Promise<Blob> {
    try {
      const response = await api.get(`/pdf/invoice/${invoiceId}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      // Generate a proper HTML invoice that can be saved as PDF
      console.log('PDF API not available, generating HTML invoice...');
      
      try {
        // Get subscription and invoice data
        const invoices = await this.getInvoices();
        const invoice = invoices.find(inv => inv._id === invoiceId);
        
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Generate HTML invoice
        const htmlContent = this.generateHTMLInvoice(invoice);
        
        // Create a blob with HTML content that browsers can open
        const blob = new Blob([htmlContent], { type: 'text/html' });
        return blob;
      } catch (fallbackError) {
        console.error('Failed to generate invoice:', fallbackError);
        
        // Last resort - create a readable text invoice
        const textInvoice = `
BROADBANDX INVOICE
==================

Invoice ID: ${invoiceId}
Date: ${new Date().toLocaleDateString()}
Status: Unable to generate full invoice

Please contact customer support for a detailed invoice.

Customer Support: support@broadbandx.com
Phone: 1-800-BROADBAND

Thank you for your business!
        `;
        
        const blob = new Blob([textInvoice], { type: 'text/plain' });
        return blob;
      }
    }
  }

  private generateHTMLInvoice(invoice: BillingInvoice): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-info {
            text-align: left;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
        }
        .invoice-info {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .line-items {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .line-items th, .line-items td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .line-items th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .total-section {
            float: right;
            width: 300px;
            margin-top: 20px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .total-row.final {
            font-weight: bold;
            font-size: 18px;
            border-bottom: 2px solid #333;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
        }
        @media print {
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <div class="company-name">BroadbandX</div>
            <div>123 Business Street<br>
            Business City, BC 12345<br>
            Phone: (555) 123-4567<br>
            Email: billing@broadbandx.com</div>
        </div>
    </div>

    <div class="invoice-info">
        <h2>INVOICE</h2>
        <div class="invoice-details">
            <div>
                <strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br>
                <strong>Invoice Date:</strong> ${this.formatDate(invoice.createdAt)}<br>
                <strong>Due Date:</strong> ${this.formatDate(invoice.dueDate)}
            </div>
            <div>
                <strong>Status:</strong> ${invoice.status.toUpperCase()}<br>
                <strong>Billing Period:</strong><br>
                ${this.formatDate(invoice.billingPeriodStart)} - ${this.formatDate(invoice.billingPeriodEnd)}
            </div>
        </div>
    </div>

    <h3>Services</h3>
    <table class="line-items">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.lineItems.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${this.formatCents(item.unitPriceCents)}</td>
                    <td>${this.formatCents(item.totalCents)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>${this.formatCents(invoice.subtotalCents)}</span>
        </div>
        ${invoice.taxCents > 0 ? `
        <div class="total-row">
            <span>Tax:</span>
            <span>${this.formatCents(invoice.taxCents)}</span>
        </div>
        ` : ''}
        <div class="total-row final">
            <span>Total:</span>
            <span>${this.formatCents(invoice.totalCents)}</span>
        </div>
    </div>

    <div style="clear: both;"></div>

    <div class="footer">
        <p>Thank you for your business!</p>
        <p><small>This invoice was generated electronically. For questions, please contact customer support.</small></p>
    </div>

    <script>
        // Auto-print functionality for easier PDF generation
        function printInvoice() {
            window.print();
        }
        
        // Add print button
        document.addEventListener('DOMContentLoaded', function() {
            const printBtn = document.createElement('button');
            printBtn.textContent = 'Print/Save as PDF';
            printBtn.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; padding: 10px; background: #1976d2; color: white; border: none; border-radius: 5px; cursor: pointer;';
            printBtn.onclick = printInvoice;
            document.body.appendChild(printBtn);
        });
    </script>
</body>
</html>
    `;
  }

  async previewInvoicePDF(invoiceId: string): Promise<string> {
    try {
      // First try the dedicated PDF preview endpoint
      const response = await api.get(`/pdf/invoice/${invoiceId}/preview`);
      return response.data.pdfUrl;
    } catch (error) {
      console.log('PDF preview API not available, generating HTML preview...');
      
      try {
        // Generate HTML invoice and create blob URL for preview
        const invoices = await this.getInvoices();
        const invoice = invoices.find(inv => inv._id === invoiceId);
        
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        const htmlContent = this.generateHTMLInvoice(invoice);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        
        // Open in new window for preview
        const previewWindow = window.open(blobUrl, '_blank');
        if (!previewWindow) {
          throw new Error('Popup blocked. Please allow popups and try again.');
        }

        // Return the blob URL for the iframe if needed
        return blobUrl;
      } catch (fallbackError) {
        console.error('Failed to generate HTML preview:', fallbackError);
        throw new Error('Unable to preview invoice. Please try downloading instead.');
      }
    }
  }

  // Billing history and adjustments
  async getAdjustments(): Promise<BillingAdjustment[]> {
    try {
      const response = await api.get('/billing/adjustments');
      return response.data.adjustments;
    } catch (error) {
      console.log('Billing adjustments API not available');
      return [];
    }
  }

  async getPlanHistory(): Promise<SubscriptionPlanHistory[]> {
    try {
      console.log('🔍 Fetching comprehensive plan history...');
      
      // Call the enhanced plan history endpoint
      const response = await api.get('/subscriptions/plan-history');
      
      console.log('📦 Raw API response:', response.data);
      
      // The backend returns the plan history array directly
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log('✅ Got plan history from API:', response.data.length, 'entries');
        
        // Transform the backend format to frontend format
        const transformedHistory = response.data.map((item: any, index: number) => ({
          _id: item.id || item._id || `hist-${Date.now()}-${index}`,
          subscriptionId: item.subscriptionId || 'unknown',
          changeType: item.changeType || item.type || 'unknown',
          date: item.date || item.dateIST || new Date().toISOString(),
          fromPlan: item.fromPlan ? {
            _id: 'plan-from',
            name: item.fromPlan, // fromPlan is the plan name string
            price: Math.round((item.fromPrice || 0) * 100), // Convert to cents for compatibility
            billingCycle: 'monthly' as 'monthly' | 'yearly',
            features: [],
            dataLimit: 0,
            speedLimit: 0,
            status: 'active'
          } : undefined,
          toPlan: {
            _id: 'plan-to', 
            name: item.toPlan || 'Current Plan', // toPlan is the plan name string
            price: Math.round((item.toPrice || 0) * 100), // Convert to cents for compatibility
            billingCycle: 'monthly' as 'monthly' | 'yearly',
            features: [],
            dataLimit: 0,
            speedLimit: 0,
            status: 'active'
          },
          fromPrice: item.fromPrice || 0, // Keep original rupee values
          toPrice: item.toPrice || 0, // Keep original rupee values
          priceChange: item.priceChange || 0, // Keep as rupee amount for display
          finalAmount: item.finalAmount ? parseFloat(item.finalAmount) : (item.toPrice || 0), // Final amount in rupees
          effectiveDate: item.date || item.dateIST || new Date().toISOString(),
          reason: item.description || 'Plan change',
          status: item.paymentStatus || 'completed',
          paymentStatus: item.paymentStatus || 'completed',
          createdAt: item.date || new Date().toISOString(),
          updatedAt: item.date || new Date().toISOString()
        }));
        
        console.log('✅ Transformed plan history:', transformedHistory);
        return transformedHistory as SubscriptionPlanHistory[];
      }

      // If no data, try fallback
      console.log('⚠️ No plan history data returned, trying fallback');
      return await this.getFallbackPlanHistory();
      
    } catch (error: any) {
      console.warn('❌ Plan history endpoint failed, trying fallback:', error.message);
      return await this.getFallbackPlanHistory();
    }
  }

  // Fallback method for getting plan history (old logic)
  private async getFallbackPlanHistory(): Promise<SubscriptionPlanHistory[]> {
    try {
      // Skip billing API and use existing endpoints directly
      console.log('🔍 Fetching plan history from existing endpoints...');
      
      // Try multiple endpoints to get historical data
      const endpoints = [
        '/customer/billing-history',
        '/subscriptions/history', 
        '/subscriptions/modifications',
        '/customer/subscriptions'
      ];

      let planChanges: SubscriptionPlanHistory[] = [];
      let foundHistory = false;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          const response = await api.get(endpoint);
          const data = response.data?.data || response.data?.bills || response.data?.history || response.data?.subscriptions || response.data;
            
            if (Array.isArray(data) && data.length > 0) {
              console.log(`✅ Found data at ${endpoint}:`, data);
              
              // Process different response structures
              if (endpoint.includes('billing-history')) {
                // Process billing history format
                planChanges = data.map((item: any, index: number) => ({
                  _id: item._id || `hist-${Date.now()}-${index}`,
                  subscriptionId: item.subscription?._id || item._id,
                  fromPlan: index > 0 ? {
                    _id: data[index - 1]?.subscription?.plan?._id || 'unknown',
                    name: data[index - 1]?.subscription?.plan?.name || 'Previous Plan',
                    price: data[index - 1]?.subscription?.plan?.pricing?.monthly ? Math.round(data[index - 1].subscription.plan.pricing.monthly * 100) : 0,
                    billingCycle: 'monthly',
                    features: data[index - 1]?.subscription?.plan?.features || [],
                    dataLimit: data[index - 1]?.subscription?.plan?.dataLimit || 0,
                    speedLimit: data[index - 1]?.subscription?.plan?.speed || 0,
                    status: 'active'
                  } : undefined,
                  toPlan: {
                    _id: item.subscription?.plan?._id || 'unknown',
                    name: item.subscription?.plan?.name || 'Current Plan',
                    price: item.subscription?.plan?.pricing?.monthly ? Math.round(item.subscription.plan.pricing.monthly * 100) : 0,
                    billingCycle: 'monthly',
                    features: item.subscription?.plan?.features || [],
                    dataLimit: item.subscription?.plan?.dataLimit || 0,
                    speedLimit: item.subscription?.plan?.speed || 0,
                    status: 'active'
                  },
                  changeType: index === 0 ? 'created' : 'upgraded',
                  effectiveDate: item.subscription?.startDate || item.createdAt,
                  createdAt: item.subscription?.createdAt || item.createdAt
                }));
                foundHistory = true;
                break;
              } else if (endpoint.includes('subscriptions')) {
                // Process subscription format - look for plan changes
                const subscriptions = data;
                let lastPlan: any = null;
                
                subscriptions.forEach((sub: any, index: number) => {
                  const currentPlan = sub.plan;
                  
                  planChanges.push({
                    _id: `hist-${sub._id}-${index}`,
                    subscriptionId: sub._id,
                    fromPlan: lastPlan ? {
                      _id: lastPlan._id,
                      name: lastPlan.name,
                      price: lastPlan.pricing?.monthly ? Math.round(lastPlan.pricing.monthly * 100) : 0,
                      billingCycle: 'monthly',
                      features: lastPlan.features || [],
                      dataLimit: lastPlan.dataLimit || 0,
                      speedLimit: lastPlan.speed || 0,
                      status: 'active'
                    } : undefined,
                    toPlan: {
                      _id: currentPlan._id,
                      name: currentPlan.name,
                      price: currentPlan.pricing?.monthly ? Math.round(currentPlan.pricing.monthly * 100) : 0,
                      billingCycle: 'monthly',
                      features: currentPlan.features || [],
                      dataLimit: currentPlan.dataLimit || 0,
                      speedLimit: currentPlan.speed || 0,
                      status: 'active'
                    },
                    changeType: lastPlan ? (
                      currentPlan.pricing?.monthly > lastPlan.pricing?.monthly ? 'upgraded' : 'downgraded'
                    ) : 'created',
                    effectiveDate: sub.startDate || sub.createdAt,
                    createdAt: sub.createdAt
                  });
                  
                  lastPlan = currentPlan;
                });
                
                foundHistory = true;
                break;
              }
            }
          } catch (endpointError: any) {
            console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.message || endpointError);
            continue;
          }
        }

        // Always analyze current subscription for plan changes (force execution)
        console.log('🔄 Analyzing current subscription for plan changes...');
        const existingResponse = await api.get('/subscriptions/my-subscriptions');
        const subscriptions = existingResponse.data.data.subscriptions;
        
        console.log('📊 Raw subscription data for plan analysis:', subscriptions);
          if (subscriptions && subscriptions.length > 0) {
              const subscription = subscriptions[0];
              const currentPlan = subscription.plan;
              const activatedPlan = subscription.serviceHistory?.[0]?.metadata?.planName;
              
              console.log('🔍 Plan change analysis:', {
                currentPlan: currentPlan?.name,
                activatedPlan: activatedPlan,
                planChanged: currentPlan?.name !== activatedPlan,
                serviceHistory: subscription.serviceHistory
              });
              
              // Always create activation entry first if we have activation data
              if (activatedPlan) {
                console.log('✅ Creating activation entry for:', activatedPlan);
                planChanges.push({
                  _id: `hist-activation-${subscription._id}`,
                  subscriptionId: subscription._id,
                  toPlan: {
                    _id: 'activated-plan',
                    name: activatedPlan,
                    price: 0,
                    billingCycle: 'monthly',
                    features: [],
                    dataLimit: 0,
                    speedLimit: 0,
                    status: 'inactive'
                  },
                  changeType: 'created',
                  effectiveDate: subscription.startDate || subscription.createdAt,
                  createdAt: subscription.startDate || subscription.createdAt
                });
              }
              
              // Always create current plan entry, checking if it's different from activated plan
              if (currentPlan) {
                if (activatedPlan && currentPlan.name !== activatedPlan) {
                  console.log('📈 Creating upgrade entry:', {
                    from: activatedPlan,
                    to: currentPlan.name,
                    upgradeDate: subscription.updatedAt
                  });
                  
                  // Create upgrade entry
                  planChanges.push({
                    _id: `hist-upgrade-${subscription._id}`,
                    subscriptionId: subscription._id,
                    fromPlan: {
                      _id: 'activated-plan',
                      name: activatedPlan,
                      price: 0,
                      billingCycle: 'monthly',
                      features: [],
                      dataLimit: 0,
                      speedLimit: 0,
                      status: 'inactive'
                    },
                    toPlan: {
                      _id: currentPlan._id,
                      name: currentPlan.name,
                      price: currentPlan.pricing?.monthly ? Math.round(currentPlan.pricing.monthly * 100) : 0,
                      billingCycle: 'monthly',
                      features: currentPlan.features || [],
                      dataLimit: currentPlan.features?.dataLimit?.amount || 0,
                      speedLimit: currentPlan.features?.speed?.download || 0,
                      status: 'active'
                    },
                    changeType: 'upgraded',
                    effectiveDate: subscription.updatedAt,
                    createdAt: subscription.updatedAt
                  });
                } else if (!activatedPlan) {
                  console.log('✅ Creating current plan entry (no activation data)');
                  // No activation data, just create current plan entry
                  planChanges.push({
                    _id: `hist-current-${subscription._id}`,
                    subscriptionId: subscription._id,
                    toPlan: {
                      _id: currentPlan._id,
                      name: currentPlan.name,
                      price: currentPlan.pricing?.monthly ? Math.round(currentPlan.pricing.monthly * 100) : 0,
                      billingCycle: 'monthly',
                      features: currentPlan.features || [],
                      dataLimit: currentPlan.features?.dataLimit?.amount || 0,
                      speedLimit: currentPlan.features?.speed?.download || 0,
                      status: 'active'
                    },
                    changeType: 'created',
                    effectiveDate: subscription.startDate || subscription.createdAt,
                    createdAt: subscription.startDate || subscription.createdAt
                  });
                }
              }
            } else {
              console.log('⚠️ No subscription data available for plan history analysis');
            }

        console.log('📋 Final plan history generated:', planChanges);
        console.log('📊 Plan history count:', planChanges.length);
        return planChanges.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (fallbackError) {
        console.error('Failed to generate plan history:', fallbackError);
        return [];
      }
  }

  // Utility methods
  formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleString();
  }

  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Adjust filename based on blob type
    if (blob.type === 'text/html') {
      // For HTML invoices, use .html extension and open in new tab
      const htmlFilename = filename.replace('.pdf', '.html');
      link.download = htmlFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Also open in new tab for easier printing to PDF
      const newTab = window.open(url, '_blank');
      if (newTab) {
        newTab.document.title = `Invoice - ${filename}`;
      }
    } else {
      // Regular download for other file types
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // Clean up the object URL after a short delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }

  // Plan modification payment methods
  async getOutstandingBalance(subscriptionId: string): Promise<{
    subscriptionId: string;
    planName: string;
    outstandingAmount: string;
    refundCredit: string;
    netAmount: string;
    pendingPayments: number;
    pendingRefunds: number;
    hasDuePayment: boolean;
    hasRefundCredit: boolean;
  }> {
    try {
      const response = await api.get(`/billing/outstanding-balance/${subscriptionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching outstanding balance:', error);
      throw new Error('Failed to get outstanding balance. Please try again.');
    }
  }

  async processModificationPayment(subscriptionId: string, paymentMethod: string, amount: number): Promise<{
    success: boolean;
    message: string;
    transactionId: string;
    amount: number;
  }> {
    try {
      const response = await api.post('/billing/process-modification-payment', {
        subscriptionId,
        paymentMethod,
        amount
      });
      return response.data;
    } catch (error) {
      console.error('Error processing modification payment:', error);
      throw new Error('Failed to process payment. Please try again.');
    }
  }

  async processRefund(subscriptionId: string, refundMethod: 'gateway' | 'credit'): Promise<{
    success: boolean;
    message: string;
    amount: number;
    method: string;
  }> {
    try {
      const response = await api.post('/billing/process-refund', {
        subscriptionId,
        refundMethod
      });
      return response.data;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error('Failed to process refund. Please try again.');
    }
  }

  // New methods for upgrade billing scenario
  async createUpgradeScenario(): Promise<{
    success: boolean;
    message: string;
    data: {
      currentPlanInvoice: any;
      upgradeInvoice: any;
    };
  }> {
    try {
      const response = await api.post('/billing/create-upgrade-scenario');
      return response.data;
    } catch (error) {
      console.error('Error creating upgrade scenario:', error);
      throw new Error('Failed to create upgrade billing scenario. Please try again.');
    }
  }

  async processUpgradePayment(invoiceId: string, paymentMethod?: any): Promise<{
    success: boolean;
    message: string;
    data: {
      invoice: any;
      subscription: any;
    };
  }> {
    try {
      const response = await api.post(`/billing/process-upgrade-payment/${invoiceId}`, {
        paymentMethod
      });
      return response.data;
    } catch (error) {
      console.error('Error processing upgrade payment:', error);
      throw new Error('Failed to process upgrade payment. Please try again.');
    }
  }

  async getUserInvoices(userId: string): Promise<{
    success: boolean;
    count: number;
    data: any[];
  }> {
    try {
      const response = await api.get(`/billing/invoices/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user invoices:', error);
      throw new Error('Failed to fetch invoices. Please try again.');
    }
  }
}

export const billingService = new BillingService();
export default billingService;