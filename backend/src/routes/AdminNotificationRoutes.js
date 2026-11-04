const express = require('express');
const router = express.Router();
const adminNotificationController = require('../controllers/AdminNotificationController');

// Notification management routes
router.get('/', adminNotificationController.getNotifications);
router.get('/class-groups', adminNotificationController.getClassGroups);
router.get('/schedules', adminNotificationController.getSchedules);
router.post('/', adminNotificationController.createNotification);
router.put('/:id', adminNotificationController.updateNotification);
router.delete('/:id', adminNotificationController.deleteNotification);
router.get('/class-groups/:id/students', adminNotificationController.getStudentsInClassGroup);

module.exports = router;