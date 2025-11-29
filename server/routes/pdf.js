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

module.exports = router;