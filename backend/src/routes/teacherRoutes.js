const express = require('express');
const router = express.Router();
const { 
  getTeacherSchedule, 
  getTeacherNotifications,
  getAllClassGroupsForTeacher
} = require('../controllers/teacherController');

const { getTeacherDashboard, getTeachersList  } = require('../controllers/teacherdashboardController');

// GET /api/teachers/:teacherId/schedule - Get teacher's schedule with filters
router.get('/:teacherId/schedule', getTeacherSchedule);

// GET /api/teachers/:teacherId/notifications - Get teacher's notifications
router.get('/:teacherId/notifications', getTeacherNotifications);

// GET /api/teachers/:teacherId/class-groups - Get teacher's class groups
router.get('/:teacherId/class-groups', getAllClassGroupsForTeacher);

router.get('/dashboard', getTeacherDashboard);
router.get('/teachers', getTeachersList);

module.exports = router;