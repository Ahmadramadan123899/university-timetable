const express = require('express');
const router = express.Router();
const emailController = require('../controllers/EmailController');

router.post('/send', emailController.sendEmail);

module.exports = router;