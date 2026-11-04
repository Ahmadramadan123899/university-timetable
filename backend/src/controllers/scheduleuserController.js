const pool = require('../config/db');

const getUserSchedule = async (req, res) => {
  try {
    const { userId } = req.params;

    // First get the user's class group if they're a student
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is only for students'
      });
    }

    // Fixed query - properly join student_enrollments table
    const scheduleResult = await pool.query(
      `SELECT 
        s.id,
        s.date,
        s.start_time AS "start_time",
        s.end_time AS "end_time",
        s.room,
        s.type,
        s.group_name,
        c.name AS course_name,
        c.code AS course_code,
        u.name AS teacher_name,
        TO_CHAR(s.date, 'Day') AS day_name,
        TO_CHAR(s.date, 'YYYY-MM-DD') AS formatted_date
      FROM schedules s
      JOIN course_offerings co ON s.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN users u ON s.teacher_id = u.id
      JOIN student_enrollments se ON co.class_group_id = se.class_group_id
      WHERE se.student_id = $1
      ORDER BY s.date, s.start_time`,
      [userId]
    );

    res.json({
      success: true,
      data: scheduleResult.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching schedule'
    });
  }
};

const getScheduleByClassGroup = async (req, res) => {
  try {
    const { classGroupId } = req.params;

    // Get the schedule for a specific class group
    const scheduleResult = await pool.query(
      `SELECT 
        s.id,
        s.date,
        s.start_time AS "start_time",
        s.end_time AS "end_time",
        s.room,
        s.type,
        s.group_name,
        c.name AS course_name,
        c.code AS course_code,
        u.name AS teacher_name,
        TO_CHAR(s.date, 'Day') AS day_name,
        TO_CHAR(s.date, 'YYYY-MM-DD') AS formatted_date,
        cg.name as class_group_name,
        cg.year as class_year,
        cg.major as class_major,
        cg.section as class_section
      FROM schedules s
      JOIN course_offerings co ON s.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN users u ON s.teacher_id = u.id
      JOIN class_groups cg ON co.class_group_id = cg.id
      WHERE co.class_group_id = $1
      ORDER BY s.date, s.start_time`,
      [classGroupId]
    );

    res.json({
      success: true,
      data: scheduleResult.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class group schedule'
    });
  }
};

const getAllClassGroups = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM class_groups ORDER BY year, major, section');
    
    const formattedGroups = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      year: row.year,
      major: row.major,
      section: row.section
    }));
    
    res.json({
      success: true,
      data: formattedGroups
    });
  } catch (err) {
    console.error('Error in getClassGroups:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching class groups',
      error: err.message 
    });
  }
};

const getUserEnrollment = async (req, res) => {
  try {
    const { userId, classGroupId } = req.params;

    const result = await pool.query(
      'SELECT * FROM student_enrollments WHERE student_id = $1 AND class_group_id = $2',
      [userId, classGroupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrollment'
    });
  }
};

module.exports = {
  getUserSchedule,
  getScheduleByClassGroup,
  getAllClassGroups,
  getUserEnrollment
};