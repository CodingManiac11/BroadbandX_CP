const { Parser } = require('json2csv');

/**
 * Convert invoices to CSV format
 * @param {Array} invoices - Array of invoice objects
 * @returns {String} CSV string
 */
const invoicesToCSV = (invoices) => {
  const fields = [
    { label: 'Invoice ID', value: 'invoiceNumber' },
    { label: 'Date', value: 'createdAt' },
    { label: 'Customer Name', value: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.trim() },
    { label: 'Customer Email', value: 'user.email' },
    { label: 'Plan Name', value: 'subscription.plan.name' },
    { label: 'Amount', value: 'amount' },
    { label: 'Status', value: 'paymentStatus' },
    { label: 'Payment Method', value: 'paymentMethod' },
    { label: 'Due Date', value: 'dueDate' },
    { label: 'Paid Date', value: 'paidAt' }
  ];

  const parser = new Parser({ fields });
  return parser.parse(invoices);
};

/**
 * Convert usage logs to CSV format
 * @param {Array} usageLogs - Array of usage log objects
 * @returns {String} CSV string
 */
const usageLogsToCSV = (usageLogs) => {
  const fields = [
    { label: 'Date', value: 'date' },
    { label: 'Customer Name', value: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.trim() },
    { label: 'Customer Email', value: 'user.email' },
    { label: 'Plan Name', value: 'subscription.plan.name' },
    { label: 'Download (GB)', value: (row) => (row.dataUsed?.download || 0).toFixed(2) },
    { label: 'Upload (GB)', value: (row) => (row.dataUsed?.upload || 0).toFixed(2) },
    { label: 'Total (GB)', value: (row) => (row.dataUsed?.total || 0).toFixed(2) },
    { label: 'Peak Speed (Mbps)', value: (row) => row.peakSpeed || 'N/A' },
    { label: 'Session Duration (hours)', value: (row) => row.sessionDuration ? (row.sessionDuration / 3600).toFixed(2) : '0' }
  ];

  const parser = new Parser({ fields });
  return parser.parse(usageLogs);
};

/**
 * Convert subscriptions to CSV format
 * @param {Array} subscriptions - Array of subscription objects
 * @returns {String} CSV string
 */
const subscriptionsToCSV = (subscriptions) => {
  const fields = [
    { label: 'Subscription ID', value: '_id' },
    { label: 'Customer Name', value: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.trim() },
    { label: 'Customer Email', value: 'user.email' },
    { label: 'Plan Name', value: 'plan.name' },
    { label: 'Speed', value: 'plan.speed' },
    { label: 'Data Limit (GB)', value: 'plan.dataLimit' },
    { label: 'Price', value: 'plan.price' },
    { label: 'Status', value: 'status' },
    { label: 'Start Date', value: 'startDate' },
    { label: 'End Date', value: 'endDate' },
    { label: 'Billing Cycle', value: 'billingCycle' },
    { label: 'Auto Renew', value: (row) => row.autoRenew ? 'Yes' : 'No' }
  ];

  const parser = new Parser({ fields });
  return parser.parse(subscriptions);
};

/**
 * Convert users to CSV format
 * @param {Array} users - Array of user objects
 * @returns {String} CSV string
 */
const usersToCSV = (users) => {
  const fields = [
    { label: 'User ID', value: '_id' },
    { label: 'First Name', value: 'firstName' },
    { label: 'Last Name', value: 'lastName' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'Role', value: 'role' },
    { label: 'Status', value: 'status' },
    { label: 'Email Verified', value: (row) => row.emailVerified ? 'Yes' : 'No' },
    { label: 'Registered Date', value: 'createdAt' },
    { label: 'Last Login', value: 'lastLogin' }
  ];

  const parser = new Parser({ fields });
  return parser.parse(users);
};

module.exports = {
  invoicesToCSV,
  usageLogsToCSV,
  subscriptionsToCSV,
  usersToCSV
};
