const { Parser } = require('json2csv');

/**
 * Convert payment records to CSV format for invoice export
 * @param {Array} payments - Array of payment objects from Payment model
 * @returns {String} CSV string
 */
const invoicesToCSV = (payments) => {
  const fields = [
    { label: 'Payment ID', value: 'razorpayOrderId' },
    { label: 'Date', value: 'createdAt' },
    { label: 'Customer Name', value: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.trim() },
    { label: 'Customer Email', value: 'user.email' },
    { label: 'Plan Name', value: 'subscription.plan.name' },
    { label: 'Amount', value: 'amount' },
    { label: 'Currency', value: 'currency' },
    { label: 'Status', value: 'status' },
    { label: 'Payment Method', value: 'method' },
    { label: 'Captured Date', value: 'capturedAt' }
  ];

  const parser = new Parser({ fields });
  return parser.parse(payments);
};

/**
 * Convert usage logs to CSV format
 * @param {Array} usageLogs - Array of usage log objects
 * @returns {String} CSV string
 */
const usageLogsToCSV = (usageLogs) => {
  const fields = [
    { label: 'Timestamp', value: 'timestamp' },
    { label: 'Customer Name', value: (row) => `${row.userId?.firstName || ''} ${row.userId?.lastName || ''}`.trim() || 'N/A' },
    { label: 'Customer Email', value: 'userId.email' },
    { label: 'Device Type', value: 'deviceType' },
    { label: 'Download (GB)', value: (row) => ((row.download || 0) / 1024).toFixed(2) },
    { label: 'Upload (GB)', value: (row) => ((row.upload || 0) / 1024).toFixed(2) },
    { label: 'Total (GB)', value: (row) => (((row.download || 0) + (row.upload || 0)) / 1024).toFixed(2) },
    { label: 'Download Speed (Mbps)', value: (row) => (row.downloadSpeed || 0).toFixed(2) },
    { label: 'Upload Speed (Mbps)', value: (row) => (row.uploadSpeed || 0).toFixed(2) },
    { label: 'Session Duration (min)', value: (row) => row.sessionDuration || 0 }
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
