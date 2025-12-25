const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'email']
}));

app.use(express.json());

// Mock database - In production, use MongoDB
let mockData = {
  users: [
    {
      id: '1',
      email: 'divyaratnam@gmail.com',
      firstName: 'Divyaratnam',
      lastName: 'User',
      createdAt: new Date('2024-11-01')
    }
  ],
  subscriptions: [
    {
      id: '1',
      userId: '1',
      planId: 'plan_enterprise8',
      planName: 'Enterprise Plan8',
      status: 'active',
      price: 86.42,
      startDate: new Date('2024-11-01'),
      nextBilling: new Date('2026-01-03'),
      createdAt: new Date('2024-11-01')
    }
  ],
  plans: [
    {
      id: 'plan_enterprise8',
      name: 'Enterprise Plan8',
      price: 86.42,
      category: 'Enterprise',
      features: ['Unlimited Bandwidth', '24/7 Support', 'Priority Routing']
    }
  ],
  invoices: [
    {
      id: '1',
      invoiceNumber: 'INV-001',
      userId: '1',
      subscriptionId: '1',
      amount: 61.25,
      status: 'Paid',
      date: '2025-11-26',
      dueDate: '2025-12-10',
      description: 'Enterprise Plan8 - Monthly',
      items: [
        { description: 'Enterprise Plan8 Monthly Subscription', amount: 61.25, quantity: 1 }
      ],
      paymentDate: '2025-11-26',
      transactionId: 'TXN123456789',
      paymentMethod: { type: 'UPI', last4: '6789' },
      billingPeriod: { 
        start: new Date('2025-11-01'), 
        end: new Date('2025-11-30') 
      },
      subtotal: 61.25,
      tax: 0,
      total: 61.25
    },
    {
      id: '2',
      invoiceNumber: 'INV-002',
      userId: '1',
      subscriptionId: '1',
      amount: 25.17,
      status: 'Pending',
      date: '2025-12-03',
      dueDate: '2025-12-17',
      description: 'Upgrade Payment',
      items: [
        { description: 'Plan Upgrade Fee', amount: 25.17, quantity: 1 }
      ],
      billingPeriod: { 
        start: new Date('2025-12-03'), 
        end: new Date('2026-01-02') 
      },
      subtotal: 25.17,
      tax: 0,
      total: 25.17
    }
  ],
  planHistory: [
    {
      id: '1',
      userId: '1',
      fromPlan: 'Basic Plan',
      toPlan: 'Enterprise Plan8',
      upgradeDate: '2025-11-01',
      amountPaid: 86.42,
      status: 'Completed',
      reason: 'Plan Upgrade',
      effectiveDate: '2025-11-01'
    },
    {
      id: '2',
      userId: '1',
      fromPlan: 'Enterprise Plan8',
      toPlan: 'Enterprise Plan8',
      upgradeDate: '2025-12-03',
      amountPaid: 25.17,
      status: 'Pending',
      reason: 'Additional Services',
      effectiveDate: '2025-12-03'
    }
  ]
};

// Authentication middleware (simplified for demo)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }
  
  // In production, verify JWT token
  req.user = { id: '1', email: 'divyaratnam@gmail.com' };
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Billing Server is running!',
        port: PORT,
        timestamp: new Date('2025-12-03T' + new Date().toTimeString().split(' ')[0]).toISOString(),
        currentDate: 'December 3, 2025'
    });
});

// Get comprehensive billing data for dashboard
app.get('/api/customer/subscriptions', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📧 Getting billing data for user: ${userId}`);
    
    // Get user's subscription
    const subscription = mockData.subscriptions.find(sub => sub.userId === userId);
    
    // Get user's invoices
    const invoices = mockData.invoices.filter(inv => inv.userId === userId);
    
    // Get user's plan history
    const planHistory = mockData.planHistory.filter(ph => ph.userId === userId);
    
    res.json({
      success: true,
      subscription: subscription,
      invoices: invoices,
      planHistory: planHistory
    });
    
  } catch (error) {
    console.error('❌ Error fetching billing data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing data',
      error: error.message
    });
  }
});

// PDF invoice generation endpoint
app.get('/api/pdf/invoice/:invoiceId', authenticateToken, (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;
    const invoice = mockData.invoices.find(inv => inv.id === invoiceId);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Check ownership
    if (invoice.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Generate HTML invoice
    const htmlContent = generateInvoiceHTML(invoice);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.html"`);
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
});

// Process payment endpoint
app.post('/api/billing/process-payment/:invoiceId', authenticateToken, (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;
    const { transactionId, paymentMethod } = req.body;
    
    // Find invoice
    const invoiceIndex = mockData.invoices.findIndex(inv => inv.id === invoiceId);
    
    if (invoiceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    const invoice = mockData.invoices[invoiceIndex];
    
    // Check ownership
    if (invoice.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Update invoice status
    mockData.invoices[invoiceIndex] = {
      ...invoice,
      status: 'Paid',
      paymentDate: new Date('2025-12-03T' + new Date().toTimeString().split(' ')[0]).toISOString(),
      transactionId: transactionId,
      paymentMethod: { type: paymentMethod || 'UPI' }
    };
    
    // Update plan history if this was a pending upgrade
    const planHistoryIndex = mockData.planHistory.findIndex(ph => 
      ph.userId === req.user.id && ph.status === 'Pending'
    );
    
    if (planHistoryIndex !== -1) {
      mockData.planHistory[planHistoryIndex].status = 'Completed';
    }
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      invoice: mockData.invoices[invoiceIndex]
    });
    
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
});

// Get plan history
app.get('/api/billing/plan-history', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const planHistory = mockData.planHistory.filter(ph => ph.userId === userId);
    
    res.json({
      success: true,
      planHistory: planHistory
    });
    
  } catch (error) {
    console.error('Plan history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plan history',
      error: error.message
    });
  }
});

// Helper function to generate invoice HTML
function generateInvoiceHTML(invoice) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #1976d2;
        }
        .invoice-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #1976d2;
        }
        .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
        }
        .line-items {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: #fff;
        }
        .line-items th, .line-items td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .line-items th {
            background-color: #1976d2;
            color: white;
            font-weight: 600;
        }
        .total-section {
            float: right;
            width: 300px;
            margin-top: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
        }
        .total-row.final {
            font-weight: bold;
            font-size: 18px;
            border-bottom: 3px solid #1976d2;
            color: #1976d2;
            margin-top: 10px;
            padding-top: 15px;
        }
        .payment-info {
            background-color: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #4caf50;
        }
        .status {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status.paid {
            background-color: #d4edda;
            color: #155724;
        }
        .status.pending {
            background-color: #fff3cd;
            color: #856404;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1976d2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        @media print {
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    
    <div class="header">
        <div>
            <div class="company-name">BroadbandX</div>
            <div>123 Business Street<br>Business City, BC 12345<br>Phone: (555) 123-4567</div>
        </div>
        <div>
            <h2>INVOICE</h2>
        </div>
    </div>

    <div class="invoice-info">
        <div class="invoice-details">
            <div>
                <strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br>
                <strong>Invoice Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-IN')}<br>
                <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}
            </div>
            <div>
                <strong>Status:</strong> <span class="status ${invoice.status.toLowerCase()}">${invoice.status}</span><br>
                <strong>Customer:</strong> Divyaratnam<br>
                <strong>Email:</strong> divyaratnam@gmail.com
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
            ${invoice.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity || 1}</td>
                    <td>₹${(item.amount || 0).toFixed(2)}</td>
                    <td>₹${(item.amount || 0).toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${(invoice.subtotal || invoice.amount).toFixed(2)}</span>
        </div>
        <div class="total-row">
            <span>Tax:</span>
            <span>₹${(invoice.tax || 0).toFixed(2)}</span>
        </div>
        <div class="total-row final">
            <span>Total:</span>
            <span>₹${(invoice.total || invoice.amount).toFixed(2)}</span>
        </div>
    </div>

    <div style="clear: both;"></div>
    
    ${invoice.status.toLowerCase() === 'paid' ? `
    <div class="payment-info">
        <h4>Payment Information</h4>
        <strong>Payment Date:</strong> ${new Date(invoice.paymentDate).toLocaleDateString('en-IN')}<br>
        <strong>Transaction ID:</strong> ${invoice.transactionId}<br>
        <strong>Payment Method:</strong> ${invoice.paymentMethod?.type || 'UPI'}
    </div>
    ` : ''}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
        <p><strong>Thank you for your business!</strong></p>
        <p><small>This invoice was generated electronically. For questions, please contact support.</small></p>
    </div>
</body>
</html>
  `;
}

// Start server
app.listen(PORT, () => {
    console.log('🚀 BILLING SERVER STARTED SUCCESSFULLY!');
    console.log('=================================');
    console.log(`🌐 Server running on: http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log('=================================');
    console.log('✅ Ready for frontend connections!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;