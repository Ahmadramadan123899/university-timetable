const pool = require('../config/db');

// Get all courses with filtering
const getCourses = async (req, res) => {
  try {
    const { search, year, major, section } = req.query;
    
    let query = `
      SELECT 
        c.*,
        (
          SELECT g.year
          FROM course_offerings co
          JOIN class_groups g ON g.id = co.class_group_id
          WHERE co.course_id = c.id LIMIT 1
        ) as class_year,
        (
          SELECT g.major
          FROM course_offerings co
          JOIN class_groups g ON g.id = co.class_group_id
          WHERE co.course_id = c.id LIMIT 1
        ) as major,
        (
          SELECT g.section
          FROM course_offerings co
          JOIN class_groups g ON g.id = co.class_group_id
          WHERE co.course_id = c.id LIMIT 1
        ) as section
      FROM courses c
    `;
    
    const whereClauses = [];
    const params = [];
    let joinAdded = false;
    
    if (search) {
      whereClauses.push(`(c.code ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    
    if (year && year !== 'ALL') {
      if (!joinAdded) {
        query += ` JOIN course_offerings co ON co.course_id = c.id JOIN class_groups g ON g.id = co.class_group_id`;
        joinAdded = true;
      }
      whereClauses.push(`g.year = $${params.length + 1}`);
      params.push(year);
    }
    
    if (major && major !== 'ALL') {
      if (!joinAdded) {
        query += ` JOIN course_offerings co ON co.course_id = c.id JOIN class_groups g ON g.id = co.class_group_id`;
        joinAdded = true;
      }
      whereClauses.push(`g.major = $${params.length + 1}`);
      params.push(major);
    }
    
    if (section && section !== 'ALL') {
      if (!joinAdded) {
        query += ` JOIN course_offerings co ON co.course_id = c.id JOIN class_groups g ON g.id = co.class_group_id`;
        joinAdded = true;
      }
      whereClauses.push(`g.section = $${params.length + 1}`);
      params.push(section.toLowerCase());
    }
    
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    query += ` GROUP BY c.id ORDER BY c.code`;
    
    const result = await pool.query(query, params);
    
    // Process the results to ensure consistent formats
    const processedRows = result.rows.map(row => ({
      ...row,
      class_year: row.class_year || null,
      major: row.major || null,
      section: row.section || null
    }));
    
    res.json(processedRows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Create new course with class group association
const createCourse = async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      code, 
      name, 
      description, 
      tp_total_hours, 
      td_total_hours, 
      course_total_hours, 
      year, 
      semester,
      class_year, 
      major, 
      section 
    } = req.body;
    
    await client.query('BEGIN');

    // 1. Create the course with new fields
    const courseResult = await client.query(
      `INSERT INTO courses (code, name, description, tp_total_hours, td_total_hours, course_total_hours, year, semester) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [code, name, description, tp_total_hours || null, td_total_hours || null, course_total_hours || null, year || null, semester || null]
    );
    const newCourse = courseResult.rows[0];

    // 2. If class_year/major/section provided, create class group and offering
    if (class_year && major && section) {
      // Find or create class group
      const groupResult = await client.query(
        `INSERT INTO class_groups (name, year, major, section) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (year, major, section) DO UPDATE 
         SET name = EXCLUDED.name 
         RETURNING id`,
        [`${class_year} ${major} ${section}`, class_year, major, section.toLowerCase()]
      );
      const groupId = groupResult.rows[0].id;

      // Create course offering (without teacher_id)
      await client.query(
        'INSERT INTO course_offerings (course_id, class_group_id) VALUES ($1, $2)',
        [newCourse.id, groupId]
      );
    }

    await client.query('COMMIT');
    
    // Return course with additional fields
    res.status(201).json({
      ...newCourse,
      class_year: class_year || null,
      major: major || null,
      section: section ? section.toLowerCase() : null
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server error');
  } finally {
    client.release();
  }
};

const updateCourse = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { 
      code, 
      name, 
      description, 
      tp_total_hours, 
      td_total_hours, 
      course_total_hours, 
      year, 
      semester,
      class_year, 
      major, 
      section 
    } = req.body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ message: 'Code and name are required' });
    }

    await client.query('BEGIN');

    // 1. Update the course with new fields
    const courseResult = await client.query(
      `UPDATE courses SET 
        code = $1, 
        name = $2, 
        description = $3, 
        tp_total_hours = $4, 
        td_total_hours = $5, 
        course_total_hours = $6, 
        year = $7, 
        semester = $8 
       WHERE id = $9 RETURNING *`,
      [
        code, 
        name, 
        description, 
        tp_total_hours || null, 
        td_total_hours || null, 
        course_total_hours || null, 
        year || null, 
        semester || null, 
        id
      ]
    );
    
    if (courseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Course not found' });
    }
    const updatedCourse = courseResult.rows[0];

    // 2. Handle class group and offering updates if class_year/major/section provided
    if (class_year && major && section) {
      // Extract just the year number if format is "Year 1"
      const cleanClassYear = class_year.replace('Year ', '').replace('Master ', 'M');
      const cleanSection = section.toLowerCase();

      // Find or create class group
      const groupResult = await client.query(
        `INSERT INTO class_groups (name, year, major, section) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (year, major, section) DO UPDATE 
         SET name = EXCLUDED.name 
         RETURNING id`,
        [`${cleanClassYear} ${major} ${cleanSection}`, cleanClassYear, major, cleanSection]
      );
      const groupId = groupResult.rows[0].id;

      // Check if this exact offering already exists
      const existingOffering = await client.query(
        `SELECT id FROM course_offerings 
         WHERE course_id = $1 AND class_group_id = $2`,
        [id, groupId]
      );

      if (existingOffering.rows.length === 0) {
        // Delete any existing offerings for this course (if changing groups)
        await client.query(
          'DELETE FROM course_offerings WHERE course_id = $1',
          [id]
        );
        
        // Create new offering
        await client.query(
          'INSERT INTO course_offerings (course_id, class_group_id) VALUES ($1, $2)',
          [id, groupId]
        );
      }
      // If offering already exists with this group, do nothing
    }

    await client.query('COMMIT');
    
    // Return course with additional fields
    res.json({
      ...updatedCourse,
      class_year: class_year || null,
      major: major || null,
      section: section ? section.toLowerCase() : null
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update course error:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message
    });
  } finally {
    client.release();
  }
};
// Delete course
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if the course has any offerings
    const offerings = await pool.query(
      'SELECT id FROM course_offerings WHERE course_id = $1',
      [id]
    );

    await pool.query('DELETE FROM course_offerings WHERE course_id = $1', [id]);

    if (offerings.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete course with existing offerings' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM courses WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse
};