// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { requestPasswordReset, resetPassword } = require('../controllers/authController');

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', requestPasswordReset);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', resetPassword);

module.exports = router;