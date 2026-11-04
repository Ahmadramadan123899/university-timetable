const pool = require('../config/db');

const getSchedules = async (req, res) => {
  try {
    const { year, major, section, teacher_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        s.id,
        s.date,
        TO_CHAR(s.date, 'Day') as day_name,
        TO_CHAR(s.date, 'YYYY-MM-DD') as formatted_date,
        s.start_time,
        s.end_time,
        s.room,
        s.status,
        s.type,
        s.teacher_id,
        s.group_name,
        c.name as course_name,
        c.code as course_code,
        u.name as teacher_name,
        g.year as class_year,
        g.major as class_major,
        g.section as class_section,
        g.name as class_group_name
      FROM schedules s
      JOIN course_offerings co ON co.id = s.course_offering_id
      JOIN courses c ON c.id = co.course_id
      LEFT JOIN users u ON u.id = s.teacher_id
      JOIN class_groups g ON g.id = co.class_group_id
    `;

    const whereClauses = [];
    const params = [];

    if (year && year !== 'ALL') {
      whereClauses.push(`g.year = $${params.length + 1}`);
      params.push(year);
    }

    if (major && major !== 'ALL') {
      whereClauses.push(`g.major = $${params.length + 1}`);
      params.push(major);
    }

    if (section && section !== 'ALL') {
      whereClauses.push(`g.section = $${params.length + 1}`);
      params.push(section.toLowerCase());
    }

    if (teacher_id && teacher_id !== 'ALL') {
      whereClauses.push(`s.teacher_id = $${params.length + 1}`);
      params.push(teacher_id);
    }

    if (start_date) {
      whereClauses.push(`s.date >= $${params.length + 1}`);
      params.push(start_date);
    }

    if (end_date) {
      whereClauses.push(`s.date <= $${params.length + 1}`);
      params.push(end_date);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY s.date, s.start_time`;

    const result = await pool.query(query, params);
    
    // Convert section to uppercase for frontend consistency
    const schedulesWithUppercaseSection = result.rows.map(schedule => ({
      ...schedule,
      class_section: schedule.class_section ? schedule.class_section.toUpperCase() : null
    }));
    
    res.json(schedulesWithUppercaseSection);
  } catch (err) {
    console.error('Error in getSchedules:', err.message);
    res.status(500).json({ 
      message: 'Server error while fetching schedules',
      error: err.message 
    });
  }
};

const getTeachers = async (req, res) => {
  try {
    const query = `
      SELECT id, name 
      FROM users 
      WHERE role = 'teacher'
      ORDER BY name
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const getScheduleOptions = async (req, res) => {
  try {
    const coursesQuery = `
      SELECT 
        co.id as offering_id,
        c.id as course_id,
        c.name as course_name,
        c.code as course_code,
        g.id as class_group_id,
        g.name as class_group_name,
        g.year as class_year,
        g.major as class_major,
        g.section as class_section
      FROM course_offerings co
      JOIN courses c ON c.id = co.course_id
      JOIN class_groups g ON g.id = co.class_group_id
      ORDER BY c.name
    `;

    const result = await pool.query(coursesQuery);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const createSchedule = async (req, res) => {
  const client = await pool.connect();
  try {
    const { course_offering_id, date, start_time, end_time, room, type, teacher_id, group_name } = req.body;

    await client.query('BEGIN');

    // Check for schedule conflicts
    const conflictCheck = await client.query(
      `SELECT id FROM schedules 
       WHERE course_offering_id = $1 
       AND date = $2 
       AND ((start_time <= $3 AND end_time >= $3) OR (start_time <= $4 AND end_time >= $4))
       AND (group_name IS NULL OR group_name = $5 OR $5 = '')`,
      [course_offering_id, date, end_time, start_time, group_name || '']
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Schedule conflict detected' });
    }

    const result = await client.query(
      `INSERT INTO schedules (course_offering_id, date, start_time, end_time, room, type, teacher_id, group_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        course_offering_id, 
        date, 
        start_time, 
        end_time, 
        room, 
        type, 
        teacher_id || null, 
        type === 'Course' ? null : group_name || null
      ]
    );

    await client.query('COMMIT');
    
    // Fetch the full schedule details with joins for the response
    const fullSchedule = await client.query(
      `SELECT 
        s.*,
        c.name as course_name,
        c.code as course_code,
        u.name as teacher_name,
        g.year as class_year,
        g.major as class_major,
        g.section as class_section,
        g.name as class_group_name,
        TO_CHAR(s.date, 'Day') as day_name,
        TO_CHAR(s.date, 'YYYY-MM-DD') as formatted_date
       FROM schedules s
       JOIN course_offerings co ON co.id = s.course_offering_id
       JOIN courses c ON c.id = co.course_id
       LEFT JOIN users u ON u.id = s.teacher_id
       JOIN class_groups g ON g.id = co.class_group_id
       WHERE s.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(fullSchedule.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({
      message: 'Server error while creating schedule',
      error: err.message
    });
  } finally {
    client.release();
  }
};

const updateSchedule = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { date, start_time, end_time, room, type, teacher_id, group_name } = req.body;

    await client.query('BEGIN');

    // Check for schedule conflicts (excluding current schedule)
    const conflictCheck = await client.query(
      `SELECT id FROM schedules 
       WHERE id != $1 
       AND course_offering_id = (SELECT course_offering_id FROM schedules WHERE id = $1)
       AND date = $2 
       AND ((start_time <= $3 AND end_time >= $3) OR (start_time <= $4 AND end_time >= $4))
       AND (group_name IS NULL OR group_name = $5 OR $5 = '')`,
      [id, date, end_time, start_time, group_name || '']
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Schedule conflict detected' });
    }

    const result = await client.query(
      `UPDATE schedules 
       SET date = $1, start_time = $2, end_time = $3, room = $4, type = $5, teacher_id = $6, group_name = $7
       WHERE id = $8 RETURNING *`,
      [
        date, 
        start_time, 
        end_time, 
        room, 
        type, 
        teacher_id || null, 
        type === 'Course' ? null : group_name || null, 
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Fetch the full schedule details with joins for the response
    const fullSchedule = await client.query(
      `SELECT 
        s.*,
        c.name as course_name,
        c.code as course_code,
        u.name as teacher_name,
        g.year as class_year,
        g.major as class_major,
        g.section as class_section,
        g.name as class_group_name,
        TO_CHAR(s.date, 'Day') as day_name,
        TO_CHAR(s.date, 'YYYY-MM-DD') as formatted_date
       FROM schedules s
       JOIN course_offerings co ON co.id = s.course_offering_id
       JOIN courses c ON c.id = co.course_id
       LEFT JOIN users u ON u.id = s.teacher_id
       JOIN class_groups g ON g.id = co.class_group_id
       WHERE s.id = $1`,
      [id]
    );

    await client.query('COMMIT');
    res.json(fullSchedule.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({
      message: 'Server error while updating schedule',
      error: err.message
    });
  } finally {
    client.release();
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM schedules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      message: 'Server error while deleting schedule',
      error: err.message
    });
  }
};

module.exports = {
  getSchedules,
  getTeachers,
  getScheduleOptions,
  createSchedule,
  updateSchedule,
  deleteSchedule
};