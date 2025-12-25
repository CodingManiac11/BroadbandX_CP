const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * PDFService - Invoice PDF generation with professional formatting
 */
class PDFService {
  
  /**
   * Generate invoice PDF
   * @param {Object} invoice - Invoice document
   * @param {Array} lineItems - Array of line item documents
   * @returns {Buffer} PDF buffer
   */
  static async generateInvoicePDF(invoice, lineItems) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        
        // Add content to PDF
        this.addHeader(doc, invoice);
        this.addInvoiceInfo(doc, invoice);
        this.addBillingAddresses(doc, invoice);
        this.addLineItemsTable(doc, lineItems);
        this.addTotals(doc, invoice);
        this.addPaymentInfo(doc, invoice);
        this.addFooter(doc, invoice);
        
        // Finalize PDF
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Add company header and logo
   * @private
   */
  static addHeader(doc, invoice) {
    const logoPath = path.join(__dirname, '../assets/logo.png');
    
    // Add logo if exists
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 50, { width: 100 });
      } catch (error) {
        console.warn('Could not load logo:', error.message);
      }
    }
    
    // Company info
    doc.fontSize(24)
       .fillColor('#2c3e50')
       .text(invoice.company_info.name || 'BroadbandX', 200, 50);
    
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(invoice.company_info.address?.street || '', 200, 80)
       .text(`${invoice.company_info.address?.city || ''}, ${invoice.company_info.address?.state || ''} ${invoice.company_info.address?.postal_code || ''}`, 200, 95)
       .text(invoice.company_info.address?.country || '', 200, 110)
       .text(`Phone: ${invoice.company_info.phone || 'N/A'}`, 200, 130)
       .text(`Email: ${invoice.company_info.email || 'N/A'}`, 200, 145);
    
    if (invoice.company_info.tax_id) {
      doc.text(`GST: ${invoice.company_info.tax_id}`, 200, 160);
    }
    
    return doc;
  }
  
  /**
   * Add invoice information
   * @private
   */
  static addInvoiceInfo(doc, invoice) {
    // Invoice title
    doc.fontSize(28)
       .fillColor('#2c3e50')
       .text('INVOICE', 400, 50);
    
    // Invoice details
    doc.fontSize(12)
       .fillColor('#34495e')
       .text('Invoice Number:', 400, 90)
       .fontSize(10)
       .fillColor('#7f8c8d')
       .text(invoice.invoice_number, 400, 105);
    
    doc.fontSize(12)
       .fillColor('#34495e')
       .text('Invoice Date:', 400, 125)
       .fontSize(10)
       .fillColor('#7f8c8d')
       .text(invoice.issued_at ? invoice.issued_at.toLocaleDateString() : 'Draft', 400, 140);
    
    doc.fontSize(12)
       .fillColor('#34495e')
       .text('Due Date:', 400, 160)
       .fontSize(10)
       .fillColor('#7f8c8d')
       .text(invoice.due_date.toLocaleDateString(), 400, 175);
    
    doc.fontSize(12)
       .fillColor('#34495e')
       .text('Status:', 400, 195)
       .fontSize(10)
       .fillColor(invoice.status === 'PAID' ? '#27ae60' : '#e74c3c')
       .text(invoice.status, 400, 210);
    
    return doc;
  }
  
  /**
   * Add billing addresses
   * @private
   */
  static addBillingAddresses(doc, invoice) {
    let yPos = 250;
    
    // Bill To section
    doc.fontSize(14)
       .fillColor('#2c3e50')
       .text('Bill To:', 50, yPos);
    
    yPos += 20;
    doc.fontSize(12)
       .fillColor('#34495e')
       .text(invoice.customer_info.name, 50, yPos);
    
    yPos += 15;
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(invoice.customer_info.email, 50, yPos);
    
    // Add billing address if available
    if (invoice.customer_info.billing_address) {
      const addr = invoice.customer_info.billing_address;
      if (addr.street) {
        yPos += 15;
        doc.text(addr.street, 50, yPos);
      }
      if (addr.city || addr.state || addr.postal_code) {
        yPos += 15;
        doc.text(`${addr.city || ''}, ${addr.state || ''} ${addr.postal_code || ''}`, 50, yPos);
      }
      if (addr.country) {
        yPos += 15;
        doc.text(addr.country, 50, yPos);
      }
    }
    
    // Service Period
    doc.fontSize(14)
       .fillColor('#2c3e50')
       .text('Service Period:', 350, 250);
    
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(`From: ${invoice.period_start.toLocaleDateString()}`, 350, 275)
       .text(`To: ${invoice.period_end.toLocaleDateString()}`, 350, 290)
       .text(`Period: ${invoice.period_days} days`, 350, 305);
    
    return doc;
  }
  
  /**
   * Add line items table
   * @private
   */
  static addLineItemsTable(doc, lineItems) {
    let yPos = 360;
    const tableTop = yPos;
    const tableLeft = 50;
    const tableWidth = 500;
    
    // Table header
    doc.rect(tableLeft, yPos, tableWidth, 25)
       .fillAndStroke('#ecf0f1', '#bdc3c7');
    
    doc.fontSize(10)
       .fillColor('#2c3e50')
       .text('Description', tableLeft + 10, yPos + 8)
       .text('Qty', tableLeft + 300, yPos + 8)
       .text('Unit Price', tableLeft + 350, yPos + 8)
       .text('Amount', tableLeft + 450, yPos + 8);
    
    yPos += 25;
    
    // Table rows
    lineItems.forEach((item, index) => {
      // Alternate row colors
      const rowColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
      
      doc.rect(tableLeft, yPos, tableWidth, 25)
         .fillAndStroke(rowColor, '#ecf0f1');
      
      // Calculate text positions
      const descWidth = 280;
      const description = this.truncateText(item.detailed_description || item.description, descWidth);
      
      doc.fontSize(9)
         .fillColor('#34495e')
         .text(description, tableLeft + 10, yPos + 8, { width: descWidth })
         .text(item.quantity.toString(), tableLeft + 300, yPos + 8)
         .text(item.unit_price_formatted, tableLeft + 350, yPos + 8)
         .text(item.total_formatted, tableLeft + 450, yPos + 8);
      
      yPos += 25;
      
      // Add page break if needed
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    });
    
    // Table border
    doc.rect(tableLeft, tableTop, tableWidth, yPos - tableTop)
       .stroke('#bdc3c7');
    
    return { doc, yPos };
  }
  
  /**
   * Add totals section
   * @private
   */
  static addTotals(doc, invoice) {
    let yPos = 500; // Adjust based on table height
    
    // Find available space
    const currentY = doc.y;
    if (currentY > yPos) {
      yPos = currentY + 20;
    }
    
    // Add spacing
    yPos += 30;
    
    const totalsLeft = 350;
    const totalsWidth = 200;
    
    // Subtotal
    doc.fontSize(11)
       .fillColor('#34495e')
       .text('Subtotal:', totalsLeft, yPos)
       .text(invoice.subtotal_formatted, totalsLeft + 100, yPos);
    
    yPos += 20;
    
    // Tax
    doc.text(`Tax (${invoice.tax_percentage}%):`, totalsLeft, yPos)
       .text(invoice.tax_formatted, totalsLeft + 100, yPos);
    
    yPos += 20;
    
    // Total
    doc.rect(totalsLeft, yPos - 5, totalsWidth, 25)
       .fillAndStroke('#3498db', '#2980b9');
    
    doc.fontSize(12)
       .fillColor('#ffffff')
       .text('Total:', totalsLeft + 10, yPos + 3)
       .text(invoice.total_formatted, totalsLeft + 100, yPos + 3);
    
    return doc;
  }
  
  /**
   * Add payment information
   * @private
   */
  static addPaymentInfo(doc, invoice) {
    let yPos = 600;
    
    doc.fontSize(12)
       .fillColor('#2c3e50')
       .text('Payment Information:', 50, yPos);
    
    yPos += 20;
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(`Status: ${invoice.status}`, 50, yPos);
    
    if (invoice.paid_at || invoice.paymentDate) {
      yPos += 15;
      const paidDate = invoice.paid_at || invoice.paymentDate;
      doc.text(`Paid Date: ${new Date(paidDate).toLocaleDateString()}`, 50, yPos);
    }
    
    if (invoice.payment_reference || invoice.transactionId) {
      yPos += 15;
      doc.text(`Transaction ID: ${invoice.payment_reference || invoice.transactionId}`, 50, yPos);
    }
    
    if (invoice.paymentId) {
      yPos += 15;
      doc.text(`Payment ID: ${invoice.paymentId}`, 50, yPos);
    }
    
    if (invoice.razorpayOrderId) {
      yPos += 15;
      doc.text(`Razorpay Order ID: ${invoice.razorpayOrderId}`, 50, yPos);
    }
    
    if (invoice.razorpayPaymentId) {
      yPos += 15;
      doc.text(`Razorpay Payment ID: ${invoice.razorpayPaymentId}`, 50, yPos);
    }
    
    if (invoice.paymentMethod) {
      yPos += 15;
      const method = invoice.paymentMethod.type || invoice.paymentMethod;
      const gateway = invoice.paymentMethod.gateway || 'Razorpay';
      doc.text(`Payment Method: ${method} (${gateway})`, 50, yPos);
      
      if (invoice.paymentMethod.details) {
        yPos += 15;
        doc.text(`Payment Details: ${invoice.paymentMethod.details}`, 50, yPos);
      }
    }
    
    yPos += 25;
    doc.fontSize(11)
       .fillColor('#34495e')
       .text('Payment Terms:', 50, yPos);
    
    yPos += 15;
    doc.fontSize(9)
       .fillColor('#7f8c8d')
       .text(invoice.payment_terms || 'Payment processed via Razorpay secure payment gateway', 50, yPos, { width: 500 });
    
    return doc;
  }
  
  /**
   * Add footer
   * @private
   */
  static addFooter(doc, invoice) {
    // Add page numbers and footer at bottom
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.strokeColor('#ecf0f1')
         .lineWidth(1)
         .moveTo(50, 750)
         .lineTo(550, 750)
         .stroke();
      
      // Footer text
      doc.fontSize(8)
         .fillColor('#95a5a6')
         .text(invoice.notes || 'Thank you for your business!', 50, 760)
         .text(`Page ${i + 1} of ${pageCount}`, 450, 760)
         .text('BroadbandX - Connecting You to the World', 50, 775)
         .text(`Generated on ${new Date().toLocaleDateString()}`, 350, 775);
    }
    
    return doc;
  }
  
  /**
   * Truncate text to fit in specified width
   * @private
   */
  static truncateText(text, maxWidth) {
    if (!text) return '';
    
    // Simple truncation - in production you'd measure text width
    const maxChars = Math.floor(maxWidth / 6); // Approximate
    if (text.length <= maxChars) return text;
    
    return text.substring(0, maxChars - 3) + '...';
  }
  
  /**
   * Generate summary report PDF
   * @param {Object} data - Report data
   * @returns {Buffer} PDF buffer
   */
  static async generateSummaryReport(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        
        // Add report content
        doc.fontSize(20)
           .text('Billing Summary Report', 50, 50);
        
        doc.fontSize(12)
           .text(`Report Period: ${data.period_start} to ${data.period_end}`, 50, 100);
        
        // Add summary data
        let yPos = 150;
        Object.entries(data.summary || {}).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, 50, yPos);
          yPos += 20;
        });
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFService;