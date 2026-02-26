const express = require('express');
const { processMessage, getSuggestions } = require('../controllers/chatbotController');
const router = express.Router();

// @route   POST /api/chatbot/message
// @desc    Process chat message and return AI response
// @access  Private
router.post('/message', processMessage);

// @route   GET /api/chatbot/suggestions
// @desc    Get contextual quick-reply suggestions  
// @access  Private
router.get('/suggestions', getSuggestions);

module.exports = router;
