const pool = require('../config/db');

const getTeacherSchedule = async (req, res) => {
  const { teacherId } = req.params;
  const { 
    year, 
    academicYear, 
    language, 
    classGroup,
    fromWeek,
    toWeek,
    tdGroup,
    tpGroup 
  } = req.query;

  try {
    let baseQuery = `
      SELECT 
        s.id,
        c.code AS course_code,
        c.name AS course_name,
        s.date,
        s.start_time,
        s.end_time,
        s.room,
        s.type,
        s.group_name,
        s.status,
        g.name AS class_group_name,
        g.year AS class_year,
        g.major AS class_major,
        g.section AS class_section,
        TO_CHAR(s.date, 'Day') AS day_name,
        TO_CHAR(s.date, 'YYYY-MM-DD') AS formatted_date
      FROM schedules s
      JOIN course_offerings co ON s.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN class_groups g ON co.class_group_id = g.id
      WHERE s.teacher_id = $1`;
    
    const queryParams = [teacherId];
    let paramCount = 1;
    
    // Add date filtering based on year
    if (year) {
      paramCount++;
      baseQuery += ` AND EXTRACT(YEAR FROM s.date) = $${paramCount}`;
      queryParams.push(parseInt(year));
    }
    
    // Add academic year filtering
    if (academicYear && academicYear !== 'all') {
      paramCount++;
      baseQuery += ` AND g.year = $${paramCount}`;
      queryParams.push(academicYear);
    }
    
    // Add language/section filtering
    if (language && language !== '') {
      paramCount++;
      baseQuery += ` AND g.section = $${paramCount}`;
      queryParams.push(language);
    }
    
    // Add specific class group filtering
    if (classGroup && classGroup !== '') {
      paramCount++;
      baseQuery += ` AND g.name = $${paramCount}`;
      queryParams.push(classGroup);
    }
    
    // Add TD group filtering
    if (tdGroup) {
      paramCount++;
      baseQuery += ` AND (s.type != 'TD' OR s.group_name = $${paramCount})`;
      queryParams.push(tdGroup);
    }
    
    // Add TP group filtering
    if (tpGroup) {
      paramCount++;
      baseQuery += ` AND (s.type != 'TP' OR s.group_name = $${paramCount})`;
      queryParams.push(tpGroup);
    }
    
    // Add week range filtering
    if (fromWeek && toWeek) {
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      
      // Calculate date range for the weeks
      const jan1 = new Date(currentYear, 0, 1);
      const jan1Day = jan1.getDay();
      const daysToFirstMonday = jan1Day === 0 ? 1 : (8 - jan1Day);
      
      const fromWeekStart = new Date(currentYear, 0, 1 + daysToFirstMonday + (parseInt(fromWeek) - 2) * 7);
      const toWeekEnd = new Date(currentYear, 0, 1 + daysToFirstMonday + (parseInt(toWeek) - 2) * 7 + 6);
      
      paramCount++;
      baseQuery += ` AND s.date >= $${paramCount}`;
      queryParams.push(fromWeekStart.toISOString().split('T')[0]);
      
      paramCount++;
      baseQuery += ` AND s.date <= $${paramCount}`;
      queryParams.push(toWeekEnd.toISOString().split('T')[0]);
    }
    
    baseQuery += ` ORDER BY s.date, s.start_time`;
    
    const result = await pool.query(baseQuery, queryParams);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teacher schedule'
    });
  }
};
const getTeacherNotifications = async (req, res) => {
  const { teacherId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.created_at,
        c.code AS course_code,
        c.name AS course_name,
        g.name AS class_group_name
      FROM notifications n
      LEFT JOIN schedules s ON n.schedule_id = s.id
      LEFT JOIN course_offerings co ON s.course_offering_id = co.id
      LEFT JOIN courses c ON co.course_id = c.id
      LEFT JOIN class_groups g ON n.class_group_id = g.id
      WHERE s.teacher_id = $1 OR n.class_group_id IN (
        SELECT co.class_group_id 
        FROM schedules s
        JOIN course_offerings co ON s.course_offering_id = co.id
        WHERE s.teacher_id = $1
      )
      ORDER BY n.created_at DESC
    `, [teacherId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teacher notifications'
    });
  }
};

const getAllClassGroupsForTeacher = async (req, res) => {
  const { teacherId } = req.params;

  try {
    const result = await pool.query(`
      SELECT DISTINCT g.id, g.name, g.year, g.major, g.section
      FROM class_groups g
      JOIN course_offerings co ON g.id = co.class_group_id
      JOIN schedules s ON co.id = s.course_offering_id
      WHERE s.teacher_id = $1
      ORDER BY g.year, g.major, g.section
    `, [teacherId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teacher class groups'
    });
  }
};

module.exports = {
  getTeacherSchedule,
  getTeacherNotifications,
  getAllClassGroupsForTeacher
};