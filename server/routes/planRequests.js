const express = require('express');
const {
  createPlanRequest,
  getMyPlanRequests,
  cancelPlanRequest
} = require('../controllers/planRequestController');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Customer routes
router.post('/', createPlanRequest);
router.get('/my-requests', getMyPlanRequests);
router.put('/:id/cancel', cancelPlanRequest);

module.exports = router;