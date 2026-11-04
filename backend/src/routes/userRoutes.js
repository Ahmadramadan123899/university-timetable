
// userRoutes.js
const express = require('express');
const router = express.Router();
const { getUsers, verifyUser } = require('../controllers/userController');

// GET /api/users - Get all users
router.get('/', getUsers);

// POST /api/users/verify - Verify user credentials
router.post('/verify', verifyUser);

module.exports = router;