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
    if (invoice.subscription_id.customer_id._id.toString() !== req.user.id) {
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
    if (invoice.subscription_id.customer_id._id.toString() !== req.user.id) {
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
    const invoiceId = req.params.invoiceId;
    console.log(`📄 PDF Request for invoice ID: ${invoiceId}`);
    console.log(`📄 Invoice ID type:`, typeof invoiceId);
    console.log(`📄 Invoice ID length:`, invoiceId.length);
    
    // Fetch real invoice from database
    const Billing = require('../models/Billing');
    
    // Check if valid MongoDB ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      console.log(`❌ Invalid MongoDB ObjectId: ${invoiceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID format'
      });
    }
    
    const invoice = await Billing.findById(invoiceId).populate('user', 'firstName lastName email');
    
    console.log(`📄 Database query completed`);
    console.log(`📄 Found invoice:`, invoice ? 'Yes' : 'No');
    
    if (invoice) {
      console.log(`📄 Invoice details:`, {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        user: invoice.user
      });
    }
    
    if (!invoice) {
      console.log(`❌ Invoice not found in database for ID: ${invoiceId}`);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Only allow PDF generation for paid invoices
    if (invoice.status.toLowerCase() !== 'paid') {
      console.log(`📄 ❌ Access denied - Invoice status: ${invoice.status}`);
      return res.status(400).json({
        success: false,
        message: 'Invoice PDF is only available after payment completion',
        status: 'payment_required'
      });
    }
    
    console.log(`📄 ✅ Access granted - Generating PDF for invoice: ${invoice.invoiceNumber}`);
    
    // Get subscription for payment history
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findById(invoice.subscription);
    
    // Find matching payment from subscription payment history
    let realPaymentData = null;
    if (subscription && subscription.paymentHistory && subscription.paymentHistory.length > 0) {
      // Find the payment matching this invoice
      realPaymentData = subscription.paymentHistory.find(p => 
        p.invoiceNumber === invoice.invoiceNumber || 
        Math.abs(p.amount - invoice.total) < 0.01 // Match by amount if invoice number doesn't match
      );
      
      // If not found by invoice/amount, use the most recent completed payment
      if (!realPaymentData) {
        realPaymentData = subscription.paymentHistory
          .filter(p => p.status === 'completed')
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      }
    }
    
    // Transform invoice to match expected format
    const invoiceData = {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      status: invoice.status,
      createdAt: invoice.createdAt,
      dueDate: invoice.dueDate,
      billingPeriod: invoice.billingPeriod,
      user: {
        firstName: invoice.user?.firstName || 'Customer',
        lastName: invoice.user?.lastName || '',
        email: invoice.user?.email || ''
      },
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount || 0,
      total: invoice.total,
      items: invoice.items || [],
      // Use real payment data if available, otherwise fall back to invoice data
      paymentDate: realPaymentData?.date || invoice.paymentDate,
      transactionId: realPaymentData?.transactionId || invoice.transactionId,
      paymentMethod: realPaymentData ? {
        type: realPaymentData.paymentMethod || 'card',
        last4: realPaymentData.paymentMethod === 'card' ? '****' : null
      } : invoice.paymentMethod,
      paymentNotes: realPaymentData?.notes
    };
    
    // Generate HTML invoice
    const htmlContent = generateInvoiceHTML(invoiceData);
    
    // Check if client wants HTML or PDF
    const acceptHeader = req.headers.accept || '';
    const wantsPDF = req.query.format === 'pdf' || acceptHeader.includes('application/pdf');
    
    if (wantsPDF) {
      // For now, return HTML that can be printed to PDF
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoiceData.invoiceNumber}.html"`);
      res.send(htmlContent);
    } else {
      // Return HTML for preview
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    }
    
  } catch (error) {
    console.error('❌ Invoice generation error:', error);
    console.error('Error stack:', error.stack);
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
        }
        .print-button:hover {
            background: #1565c0;
        }
        @media print {
            body { margin: 0; }
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    
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
    
    ${invoice.status === 'paid' ? `
    <div class="payment-info">
        <h4>Payment Information</h4>
        <strong>Payment Date:</strong> ${invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        }) : 'N/A'}<br>
        <strong>Payment Time:</strong> ${invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }) : 'N/A'}<br>
        <strong>Transaction ID:</strong> ${invoice.transactionId || 'N/A'}<br>
        <strong>Payment Method:</strong> ${(() => {
          const method = invoice.paymentMethod?.type || 'card';
          const methodName = method === 'credit_card' ? 'Credit Card' : 
                           method === 'debit_card' ? 'Debit Card' : 
                           method === 'card' ? 'Card' : 
                           method === 'bank_transfer' ? 'Bank Transfer' : 
                           method === 'upi' ? 'UPI' : 
                           method === 'netbanking' ? 'Net Banking' : 
                           method === 'wallet' ? 'Wallet' : 
                           'Online Payment';
          const last4 = invoice.paymentMethod?.last4;
          return last4 && last4 !== '****' ? `${methodName} ending in ${last4}` : methodName;
        })()}<br>
        ${invoice.paymentNotes ? `<strong>Payment Note:</strong> ${invoice.paymentNotes}<br>` : ''}
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
</body>
</html>
  `;
}

module.exports = router;