const express = require('express');
const {
  getCourses,
  //getTeachers,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');

const router = express.Router();

router.get('/', getCourses);
//router.get('/teachers', getTeachers);
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

module.exports = router;