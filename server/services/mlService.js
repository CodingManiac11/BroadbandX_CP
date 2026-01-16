/**
 * BroadbandX - ML Service Connector
 * Provides integration between Node.js backend and Python ML service.
 */

const axios = require('axios');

// ML Service Configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_API_TIMEOUT = parseInt(process.env.ML_API_TIMEOUT) || 10000;

/**
 * Axios instance configured for ML service
 */
const mlClient = axios.create({
    baseURL: ML_SERVICE_URL,
    timeout: ML_API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Check if ML service is available
 * @returns {Promise<Object>} Health status
 */
async function checkHealth() {
    try {
        const response = await mlClient.get('/health');
        return {
            available: true,
            status: response.data.status,
            modelsLoaded: response.data.models_loaded
        };
    } catch (error) {
        console.error('ML Service health check failed:', error.message);
        return {
            available: false,
            error: error.message
        };
    }
}

/**
 * Predict churn probability for a customer
 * @param {Object} customerData - Customer data object
 * @returns {Promise<Object>} Churn prediction result
 */
async function predictChurn(customerData) {
    try {
        const features = mapCustomerToFeatures(customerData);

        const response = await mlClient.post('/api/ml/churn/predict', {
            customer_id: customerData._id || customerData.id,
            features
        });

        return {
            success: true,
            ...response.data
        };
    } catch (error) {
        console.error('Churn prediction failed:', error.message);
        return {
            success: false,
            error: error.message,
            // Fallback to heuristic
            churn_probability: estimateChurnRisk(customerData),
            risk_level: 'unknown'
        };
    }
}

/**
 * Batch churn prediction for multiple customers
 * @param {Array} customers - Array of customer objects
 * @returns {Promise<Object>} Batch prediction results
 */
async function predictChurnBatch(customers) {
    try {
        const requests = customers.map(customer => ({
            customer_id: customer._id || customer.id,
            features: mapCustomerToFeatures(customer)
        }));

        const response = await mlClient.post('/api/ml/churn/predict/batch', {
            customers: requests
        });

        return {
            success: true,
            predictions: response.data.predictions,
            summary: response.data.summary
        };
    } catch (error) {
        console.error('Batch churn prediction failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get customer segment
 * @param {Object} customerData - Customer data object
 * @returns {Promise<Object>} Segmentation result
 */
async function getCustomerSegment(customerData) {
    try {
        const features = mapCustomerToFeatures(customerData);

        const response = await mlClient.post('/api/ml/segmentation/predict', {
            customer_id: customerData._id || customerData.id,
            features
        });

        return {
            success: true,
            ...response.data
        };
    } catch (error) {
        console.error('Segmentation failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Calculate dynamic price for a customer
 * @param {Object} customerData - Customer data object
 * @param {Number} basePrice - Base plan price
 * @returns {Promise<Object>} Dynamic pricing result
 */
async function calculateDynamicPrice(customerData, basePrice) {
    try {
        const features = mapCustomerToFeatures(customerData);

        const response = await mlClient.post('/api/ml/pricing/calculate', {
            customer_id: customerData._id || customerData.id,
            base_price: basePrice,
            features
        });

        return {
            success: true,
            ...response.data
        };
    } catch (error) {
        console.error('Dynamic pricing failed:', error.message);
        return {
            success: false,
            error: error.message,
            // Fallback to base price
            dynamic_price: basePrice,
            price_change_percent: 0
        };
    }
}

/**
 * Get comprehensive customer analysis
 * @param {Object} customerData - Customer data object
 * @param {Number} basePrice - Base plan price
 * @returns {Promise<Object>} Complete analysis
 */
async function analyzeCustomer(customerData, basePrice) {
    try {
        const features = mapCustomerToFeatures(customerData);

        const response = await mlClient.post('/api/ml/pricing/customer-analysis', {
            customer_id: customerData._id || customerData.id,
            base_price: basePrice,
            features
        });

        return {
            success: true,
            ...response.data
        };
    } catch (error) {
        console.error('Customer analysis failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get all segment profiles
 * @returns {Promise<Object>} Segment profiles
 */
async function getSegmentProfiles() {
    try {
        const response = await mlClient.get('/api/ml/segmentation/profiles');
        return {
            success: true,
            segments: response.data.segments
        };
    } catch (error) {
        console.error('Failed to get segment profiles:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get feature importance from churn model
 * @returns {Promise<Object>} Feature importance data
 */
async function getFeatureImportance() {
    try {
        const response = await mlClient.get('/api/ml/churn/feature-importance');
        return {
            success: true,
            ...response.data
        };
    } catch (error) {
        console.error('Failed to get feature importance:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get model statistics
 * @returns {Promise<Object>} Model stats
 */
async function getModelStats() {
    try {
        const response = await mlClient.get('/api/ml/model-stats');
        return {
            success: true,
            ...response.data
        };
    } catch (error) {
        console.error('Failed to get model stats:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Map customer data from MongoDB to ML feature format
 * @param {Object} customer - Customer object from database
 * @returns {Object} Features in ML format
 */
function mapCustomerToFeatures(customer) {
    // Calculate days since last login
    const lastLogin = customer.lastLogin ? new Date(customer.lastLogin) : new Date();
    const daysSinceLogin = Math.floor((new Date() - lastLogin) / (1000 * 60 * 60 * 24));

    // Calculate contract age in months
    const customerSince = customer.customerSince ? new Date(customer.customerSince) : new Date();
    const contractAgeMonths = Math.floor((new Date() - customerSince) / (1000 * 60 * 60 * 24 * 30));

    return {
        usage_change_30d: customer.usageChange30d || 0,
        days_since_login: daysSinceLogin,
        avg_monthly_usage_gb: customer.avgMonthlyUsage || 100,
        session_count_30d: customer.sessionCount30d || 30,
        avg_speed_mbps: customer.avgSpeed || 50,
        payment_failures_90d: customer.paymentFailures90d || 0,
        late_payments_count: customer.latePaymentsCount || 0,
        support_tickets: customer.supportTickets || 0,
        complaints_count: customer.complaintsCount || 0,
        contract_age_months: contractAgeMonths,
        plan_price: customer.planPrice || 799,
        total_revenue: customer.totalRevenue || 10000,
        nps_score: customer.npsScore || 5,
        billing_cycle_monthly: customer.billingCycle === 'monthly' ? 1 : 0,
        account_type_business: customer.accountType === 'business' ? 1 : 0
    };
}

/**
 * Fallback churn risk estimation when ML service is unavailable
 * @param {Object} customerData - Customer data
 * @returns {Number} Estimated churn probability
 */
function estimateChurnRisk(customerData) {
    let risk = 0.25; // Base risk

    // Increase risk based on factors
    if (customerData.usageChange30d < -10) risk += 0.15;
    if (customerData.paymentFailures90d > 0) risk += 0.10;
    if (customerData.supportTickets > 3) risk += 0.10;
    if (customerData.npsScore < 5) risk += 0.10;

    // Decrease risk based on positive factors
    if (customerData.contractAgeMonths > 24) risk -= 0.10;
    if (customerData.npsScore > 7) risk -= 0.10;

    return Math.max(0, Math.min(1, risk));
}

module.exports = {
    checkHealth,
    predictChurn,
    predictChurnBatch,
    getCustomerSegment,
    calculateDynamicPrice,
    analyzeCustomer,
    getSegmentProfiles,
    getFeatureImportance,
    getModelStats,
    mapCustomerToFeatures,
    estimateChurnRisk,
    ML_SERVICE_URL
};
