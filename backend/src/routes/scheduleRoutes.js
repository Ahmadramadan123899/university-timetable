
const express = require('express');
const {
  getSchedules,
  getTeachers,
  getScheduleOptions,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/scheduleController');
const { 
  getUserSchedule,
  getScheduleByClassGroup,
  getAllClassGroups,
  getUserEnrollment
} = require('../controllers/scheduleuserController');

const router = express.Router();

router.get('/', getSchedules);
router.get('/teachers', getTeachers);
router.get('/options', getScheduleOptions);
router.post('/', createSchedule);
router.put('/:id', updateSchedule);
router.delete('/:id', deleteSchedule);

// GET /api/schedules/user/:userId - Get schedule for specific user
router.get('/user/:userId', getUserSchedule);

// GET /api/schedules/class/:classGroupId - Get schedule for specific class group
router.get('/class/:classGroupId', getScheduleByClassGroup);

router.get('/class-groups', getAllClassGroups);


// Add to scheduleRoutes.js
router.get('/student-enrollment/:userId/:classGroupId', getUserEnrollment);

module.exports = router;