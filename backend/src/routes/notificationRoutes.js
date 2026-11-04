// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getUserClassGroup, getClassGroupNotifications } = require('../controllers/notificationController');

router.get('/user/:userId/class-group', getUserClassGroup);
router.get('/class-group/:classGroupId', getClassGroupNotifications);

module.exports = router;

