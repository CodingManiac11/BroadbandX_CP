const express = require('express');
const router = express.Router();
const PDFService = require('../services/PDFService');
const BillingInvoice = require('../models/BillingInvoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const { authenticateToken } = require('../middleware/auth');
const { param, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

/**
 * GET /api/pdf/invoice/:invoiceId/download
 * Download invoice PDF
 */
router.get('/invoice/:invoiceId/download', [
  authenticateToken,
  param('invoiceId').isMongoId().withMessage('Invalid invoice ID')
], handleValidationErrors, async (req, res) => {
  try {
    // Get invoice with subscription info for ownership check
    const invoice = await BillingInvoice.findById(req.params.invoiceId)
      .populate({
        path: 'subscription_id',
        populate: {
          path: 'customer_id',
          select: '_id name email'
        }
      });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Check ownership
    const userId = req.user._id || req.user.id;
    if (invoice.subscription_id.customer_id._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Only allow download of finalized invoices
    if (!['FINAL', 'PAID'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only download finalized invoices'
      });
    }
    
    // Get line items
    const lineItems = await InvoiceLineItem.getByInvoice(req.params.invoiceId);
    
    // Generate PDF
    const pdfBuffer = await PDFService.generateInvoicePDF(invoice, lineItems);
    
    // Set response headers for PDF download
    const fileName = `Invoice-${invoice.invoice_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF buffer
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
});

/**
 * GET /api/pdf/invoice/:invoiceId/preview
 * Preview invoice PDF in browser
 */
router.get('/invoice/:invoiceId/preview', [
  authenticateToken,
  param('invoiceId').isMongoId().withMessage('Invalid invoice ID')
], handleValidationErrors, async (req, res) => {
  try {
    // Get invoice with subscription info for ownership check
    const invoice = await BillingInvoice.findById(req.params.invoiceId)
      .populate({
        path: 'subscription_id',
        populate: {
          path: 'customer_id',
          select: '_id name email'
        }
      });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Check ownership
    const userId = req.user._id || req.user.id;
    if (invoice.subscription_id.customer_id._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Get line items
    const lineItems = await InvoiceLineItem.getByInvoice(req.params.invoiceId);
    
    // Generate PDF
    const pdfBuffer = await PDFService.generateInvoicePDF(invoice, lineItems);
    
    // Set response headers for PDF preview
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF buffer for inline display
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF preview',
      error: error.message
    });
  }
});

/**
 * GET /api/pdf/invoice/:invoiceId
 * Download or preview invoice PDF for Billing model (NO AUTHENTICATION)
 */
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    console.log(`📄 PDF Request for invoice ${req.params.invoiceId} - NO AUTH REQUIRED`);
    console.log(`📄 userId from query:`, req.query.userId);
    
    // Try to fetch actual subscription data from database
    let invoice = null;
    
    try {
      const Subscription = require('../models/Subscription');
      const Payment = require('../models/Payment');
      const User = require('../models/User');
      const mongoose = require('mongoose');
      
      // Build query based on userId if provided
      let query = { status: 'active' };
      if (req.query.userId) {
        // Convert string userId to ObjectId properly
        try {
          query.user = new mongoose.Types.ObjectId(req.query.userId);
          console.log(`📄 Converted userId to ObjectId:`, query.user);
        } catch (conversionError) {
          console.log(`📄 ⚠️ Failed to convert userId to ObjectId:`, conversionError.message);
          query.user = req.query.userId; // Fallback to string
        }
        console.log(`📄 Fetching subscription for userId: ${req.query.userId}`);
      }
      
      console.log(`📄 Query object:`, JSON.stringify(query));
      
      // Find the user's active subscription
      const subscription = await Subscription.findOne(query)
        .populate('plan')
        .populate('user')
        .sort({ createdAt: -1 })
        .limit(1);
      
      console.log(`📄 Found subscription:`, subscription ? {
        plan: subscription.plan?.name,
        user: subscription.user?.firstName + ' ' + subscription.user?.lastName,
        email: subscription.user?.email,
        price: subscription.pricing?.totalAmount
      } : 'none');
      
      if (subscription) {
        // Find payment for this subscription
        const payment = await Payment.findOne({ 
          subscription: subscription._id,
          status: { $in: ['captured', 'authorized'] }
        }).sort({ createdAt: -1 }).limit(1);
        
        console.log(`📄 Found payment:`, payment ? {
          id: payment._id,
          razorpayPaymentId: payment.razorpayPaymentId,
          method: payment.method,
          amount: payment.amount,
          status: payment.status
        } : 'none');
        
        if (payment) {
          const planName = subscription.plan?.name || subscription.planName || 'Subscription';
          // Use Plan's actual pricing first (correct price), fallback to subscription pricing if plan not populated
          const planPrice = subscription.plan?.pricing?.monthly || subscription.pricing?.totalAmount || payment.amount || 0;
          
          // Calculate proper billing cycle dates
          const startDate = new Date(subscription.startDate || subscription.createdAt);
          const endDate = new Date(startDate);
          if (subscription.billingCycle === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }
          
          // Map payment method for display
          const paymentMethodDisplay = payment.method || 'Razorpay';
          const paymentGateway = 'Razorpay Payment Gateway';
          
          // Generate invoice number from payment/subscription ID
          const invoiceNumber = payment.invoiceNumber || `INV-${payment._id.toString().slice(-8).toUpperCase()}`;
          
          invoice = {
            id: req.params.invoiceId,
            invoiceNumber: invoiceNumber,
            amount: planPrice,
            status: payment.status === 'captured' || payment.status === 'authorized' ? 'Paid' : 'Pending',
            createdAt: payment.capturedAt || payment.createdAt || subscription.createdAt,
            dueDate: endDate,
            billingPeriod: {
              start: startDate,
              end: endDate
            },
            user: {
              firstName: subscription.user?.firstName || 'Customer',
              lastName: subscription.user?.lastName || '',
              email: subscription.user?.email || 'customer@example.com'
            },
            subtotal: planPrice,
            tax: 0,
            total: planPrice,
            items: [
              { 
                description: `${planName} ${subscription.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`, 
                quantity: 1, 
                amount: planPrice 
              }
            ],
            paymentDate: payment.capturedAt || payment.createdAt,
            transactionId: payment.razorpayPaymentId || payment._id.toString(),
            paymentId: payment._id.toString(),
            razorpayOrderId: payment.razorpayOrderId,
            razorpayPaymentId: payment.razorpayPaymentId,
            paymentMethod: {
              type: paymentMethodDisplay,
              gateway: paymentGateway,
              details: payment.cardLast4 ? `****${payment.cardLast4}` : (payment.vpa || 'Online Payment')
            }
          };
          
          console.log(`📄 ✅ Generated invoice from actual subscription data for ${planName}`);
        } else {
          console.log(`📄 ⚠️ No payment found for subscription`);
        }
      } else {
        console.log(`📄 ⚠️ No subscription found`);
      }
    } catch (dbError) {
      console.log(`📄 ⚠️ Could not fetch from database:`, dbError.message);
      console.log(`📄 Full error:`, dbError);
    }
    
    // Check if we have invoice data
    if (!invoice) {
      console.log(`📄 ❌ No invoice data available - cannot generate PDF`);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found. Please ensure you have an active subscription with payment history.',
        error: 'NO_SUBSCRIPTION_DATA'
      });
    }
    
    console.log(`📄 Final invoice data:`, {
      user: `${invoice.user.firstName} ${invoice.user.lastName}`,
      email: invoice.user.email,
      plan: invoice.items[0].description,
      amount: invoice.amount
    });
    
    // Only allow PDF generation for paid invoices
    if (invoice.status.toLowerCase() !== 'paid') {
      console.log(`📄 ❌ Access denied - Invoice status: ${invoice.status}`);
      return res.status(400).json({
        success: false,
        message: 'Invoice PDF is only available after payment completion',
        status: 'payment_required'
      });
    }
    
    console.log(`📄 ✅ Access granted - Invoice status: ${invoice.status}`);
    
    // Generate HTML invoice
    const htmlContent = generateInvoiceHTML(invoice);
    
    // Check if client wants HTML or PDF
    const acceptHeader = req.headers.accept || '';
    const wantsPDF = req.query.format === 'pdf' || acceptHeader.includes('application/pdf');
    
    // Set CSP header using both hashes
    res.setHeader('Content-Security-Policy', "script-src 'self' 'sha256-JNEiJlItUNiAlsfJVS0RFOLQkr1ujMiUcTFLtccbJ4k=' 'sha256-6+HSeLxGbn7ayQLil7E1Whq7ey5zPTDuE0a0KEfz7Us='; style-src 'self' 'unsafe-inline'");
    
    if (wantsPDF) {
      // For now, return HTML that can be printed to PDF
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.html"`);
      res.send(htmlContent);
    } else {
      // Return HTML for preview
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    }
    
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
});

// Helper function to generate invoice HTML
function generateInvoiceHTML(invoice) {
  const customerName = invoice.user ? `${invoice.user.firstName || ''} ${invoice.user.lastName || ''}`.trim() : 'Customer';
  const customerEmail = invoice.user?.email || 'N/A';
  
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
        }
        .company-info {
            text-align: left;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
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
        .customer-info {
            background-color: #fff;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #ddd;
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
        .line-items tr:nth-child(even) {
            background-color: #f8f9fa;
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
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
        }
        .status {
            display: inline-block;
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
            z-index: 9999;
        }
        .print-button:hover {
            background: #1565c0;
        }
        .print-button:active {
            transform: scale(0.98);
        }
        @media print {
            body { margin: 0; }
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-button" id="printBtn">Print / Save as PDF</button>
    
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
                <strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}<br>
                <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}
            </div>
            <div>
                <strong>Status:</strong> <span class="status ${invoice.status}">${invoice.status}</span><br>
                <strong>Billing Period:</strong><br>
                ${new Date(invoice.billingPeriod.start).toLocaleDateString('en-IN')} - ${new Date(invoice.billingPeriod.end).toLocaleDateString('en-IN')}
            </div>
        </div>
        
        <div class="customer-info">
            <h4>Bill To:</h4>
            <strong>${customerName}</strong><br>
            Email: ${customerEmail}<br>
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
            ${invoice.items && invoice.items.length > 0 
              ? invoice.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity || 1}</td>
                    <td>₹${(item.amount || 0).toFixed(2)}</td>
                    <td>₹${(item.total || item.amount || 0).toFixed(2)}</td>
                </tr>
              `).join('')
              : `
                <tr>
                    <td>Subscription Service</td>
                    <td>1</td>
                    <td>₹${invoice.amount.toFixed(2)}</td>
                    <td>₹${invoice.amount.toFixed(2)}</td>
                </tr>
              `
            }
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${(invoice.subtotal || invoice.amount).toFixed(2)}</span>
        </div>
        ${invoice.tax > 0 ? `
        <div class="total-row">
            <span>Tax:</span>
            <span>₹${invoice.tax.toFixed(2)}</span>
        </div>
        ` : ''}
        ${invoice.discount > 0 ? `
        <div class="total-row">
            <span>Discount:</span>
            <span>-₹${invoice.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="total-row final">
            <span>Total:</span>
            <span>₹${(invoice.total || invoice.amount).toFixed(2)}</span>
        </div>
    </div>

    <div style="clear: both;"></div>
    
    ${invoice.status.toLowerCase() === 'paid' || invoice.paymentDate ? `
    <div class="payment-info">
        <h4>Payment Information</h4>
        <strong>Payment Status:</strong> ${invoice.status}<br>
        ${invoice.paymentDate ? `<strong>Payment Date:</strong> ${new Date(invoice.paymentDate).toLocaleString('en-IN')}<br>` : ''}
        ${invoice.paymentId ? `<strong>Payment ID:</strong> ${invoice.paymentId}<br>` : ''}
        ${invoice.razorpayOrderId ? `<strong>Razorpay Order ID:</strong> ${invoice.razorpayOrderId}<br>` : ''}
        ${invoice.razorpayPaymentId ? `<strong>Razorpay Payment ID:</strong> ${invoice.razorpayPaymentId}<br>` : ''}
        ${invoice.transactionId ? `<strong>Transaction ID:</strong> ${invoice.transactionId}<br>` : ''}
        ${invoice.paymentMethod ? `
          <strong>Payment Method:</strong> ${invoice.paymentMethod.type || invoice.paymentMethod}<br>
          ${invoice.paymentMethod.gateway ? `<strong>Payment Gateway:</strong> ${invoice.paymentMethod.gateway}<br>` : ''}
          ${invoice.paymentMethod.details ? `<strong>Payment Details:</strong> ${invoice.paymentMethod.details}<br>` : ''}
        ` : ''}
    </div>
    ` : ''}
    
    ${invoice.notes ? `
    <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <h4>Notes:</h4>
        <p>${invoice.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
        <p><strong>Thank you for your business!</strong></p>
        <p><small>This invoice was generated electronically. For questions, please contact customer support at billing@broadbandx.com</small></p>
    </div>
    
    <script>
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', function() {
                window.print();
            });
        }
    </script>
</body>
</html>
  `;
}

module.exports = router;