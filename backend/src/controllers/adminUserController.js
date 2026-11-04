// controllers/adminUserController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const getUsers = async (req, res) => {
  try {
    const { search, role, year, major, section, td_group, tp_group } = req.query;
    
    let query = `
      SELECT 
        u.id, u.name, u.email, u.role, 
        cg.year, cg.major, cg.section,
        se.td_group, se.tp_group
      FROM users u
      LEFT JOIN student_enrollments se ON u.id = se.student_id
      LEFT JOIN class_groups cg ON se.class_group_id = cg.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (u.name ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    if (role && role !== 'ALL') {
      query += ` AND u.role = $${params.length + 1}`;
      params.push(role);
    }
    
    if (year && year !== 'ALL') {
      query += ` AND cg.year = $${params.length + 1}`;
      params.push(year);
    }
    
    if (major && major !== 'ALL') {
      query += ` AND cg.major = $${params.length + 1}`;
      params.push(major);
    }
    
    if (section && section !== 'ALL') {
      // Convert section to lowercase to match the enum in the database
      const normalizedSection = section.toLowerCase();
      query += ` AND cg.section = $${params.length + 1}`;
      params.push(normalizedSection);
    }
    
    if (td_group && td_group !== 'ALL') {
      query += ` AND se.td_group = $${params.length + 1}`;
      params.push(td_group);
    }
    
    if (tp_group && tp_group !== 'ALL') {
      query += ` AND se.tp_group = $${params.length + 1}`;
      params.push(tp_group);
    }
    
    query += ` ORDER BY u.name`;
    
    const result = await pool.query(query, params);
    
    // Convert section to uppercase for frontend consistency
    const usersWithUppercaseSection = result.rows.map(user => ({
      ...user,
      section: user.section ? user.section.toUpperCase() : null
    }));
    
    res.json(usersWithUppercaseSection);
  } catch (err) {
    console.error('Error in getUsers:', err.message);
    res.status(500).json({ 
      message: 'Server error while fetching users',
      error: err.message 
    });
  }
};

const createUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, role, year, major, section, td_group, tp_group, password } = req.body;

    // Validate input
    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (role === 'student' && (!year || !major || !section || !td_group || !tp_group)) {
      return res.status(400).json({ 
        message: 'Students require year, major, section, TD group, and TP group' 
      });
    }

    // Check if user exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE email = $1', 
      [email]
    );
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await client.query('BEGIN');

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (name, email, role, password) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, role, created_at`,
      [name, email, role, hashedPassword]
    );
    const newUser = userResult.rows[0];

    // If student, handle enrollment
    if (role === 'student') {
      // Find or create class group
      const groupResult = await client.query(
        `INSERT INTO class_groups (name, year, major, section) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (year, major, section) DO UPDATE 
         SET name = EXCLUDED.name 
         RETURNING id`,
        [`${year} ${major} ${section}`, year, major, section]
      );
      const groupId = groupResult.rows[0].id;
      
      // Enroll student
      await client.query(
        `INSERT INTO student_enrollments (student_id, class_group_id, td_group, tp_group) 
         VALUES ($1, $2, $3, $4)`,
        [newUser.id, groupId, td_group, tp_group]
      );
      
      // Add student-specific fields to response
      newUser.year = year;
      newUser.major = major;
      newUser.section = section;
      newUser.td_group = td_group;
      newUser.tp_group = tp_group;
    }

    await client.query('COMMIT');
    res.status(201).json(newUser);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', err.message);
    res.status(500).json({ 
      message: 'Server error while creating user',
      error: err.message
    });
  } finally {
    client.release();
  }
};

const updateUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    let { name, email, role, password, year, major, section, td_group, tp_group } = req.body;

    // Normalize section to lowercase to match enum type
    if (section) {
      section = section.toLowerCase();
    }

    // Validate input
    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (role === 'student' && (!year || !major || !section || !td_group || !tp_group)) {
      return res.status(400).json({ 
        message: 'Students require year, major, section, TD group, and TP group' 
      });
    }

    // Check if user exists and get current role
    const userCheck = await client.query(
      'SELECT id, role FROM users WHERE id = $1', 
      [id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentRole = userCheck.rows[0].role;
    await client.query('BEGIN');

    // Handle role change from teacher to student
    if (currentRole === 'teacher' && role === 'student') {
      // 1. First delete schedule changes that reference schedules this teacher owns
      await client.query(`
        DELETE FROM schedule_changes 
        WHERE schedule_id IN (
          SELECT s.id FROM schedules s
          JOIN course_offerings co ON s.course_offering_id = co.id
          WHERE co.teacher_id = $1
        )`, [id]);

      // 2. Delete notifications that reference these schedules
      await client.query(`
        DELETE FROM notifications
        WHERE schedule_id IN (
          SELECT s.id FROM schedules s
          JOIN course_offerings co ON s.course_offering_id = co.id
          WHERE co.teacher_id = $1
        )`, [id]);

      // 3. Now delete the schedules themselves
      await client.query(`
        DELETE FROM schedules
        WHERE course_offering_id IN (
          SELECT id FROM course_offerings WHERE teacher_id = $1
        )`, [id]);

      // 4. Finally delete the course offerings
      await client.query(
        'DELETE FROM course_offerings WHERE teacher_id = $1',
        [id]
      );
    }

    // Update user
    const updateQuery = password 
      ? `UPDATE users 
         SET name = $1, email = $2, role = $3, password = $4 
         WHERE id = $5 
         RETURNING id, name, email, role, created_at`
      : `UPDATE users 
         SET name = $1, email = $2, role = $3 
         WHERE id = $4 
         RETURNING id, name, email, role, created_at`;

    const updateParams = password 
      ? [name, email, role, password, id]
      : [name, email, role, id];

    const userResult = await client.query(updateQuery, updateParams);
    const updatedUser = userResult.rows[0];

    // Handle student enrollment changes
    if (role === 'student') {
      // Find or create class group
      const groupResult = await client.query(
        `INSERT INTO class_groups (name, year, major, section) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (year, major, section) DO UPDATE 
         SET name = EXCLUDED.name 
         RETURNING id`,
        [`${year} ${major} ${section}`, year, major, section]
      );
      const groupId = groupResult.rows[0].id;
      
      // Remove any existing enrollments
      await client.query(
        'DELETE FROM student_enrollments WHERE student_id = $1',
        [id]
      );
      
      // Create new enrollment
      await client.query(
        `INSERT INTO student_enrollments (student_id, class_group_id, td_group, tp_group) 
         VALUES ($1, $2, $3, $4)`,
        [id, groupId, td_group, tp_group]
      );
      
      // Add student fields to response
      updatedUser.year = year;
      updatedUser.major = major;
      updatedUser.section = section;
      updatedUser.td_group = td_group;
      updatedUser.tp_group = tp_group;
    } else if (currentRole === 'student') {
      // Remove enrollment if changing from student to another role
      await client.query(
        'DELETE FROM student_enrollments WHERE student_id = $1', 
        [id]
      );
    }

    await client.query('COMMIT');
    res.json(updatedUser);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating user:', err.message);
    res.status(500).json({
      message: 'Server error while updating user',
      error: err.message
    });
  } finally {
    client.release();
  }
};

// ... rest of adminUserController.js remains the same ...

const deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    // Check if user exists
    const userCheck = await client.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Start transaction
    await client.query('BEGIN');
    
    // Delete schedule changes by this user
    await client.query('DELETE FROM schedule_changes WHERE changed_by = $1', [id]);
    
    // Delete notifications to this user
    await client.query('DELETE FROM notifications WHERE user_id = $1', [id]);
    
    // If user is a teacher, handle course offerings
    if (userCheck.rows[0].role === 'teacher') {
      // Get course offerings for this teacher
      const offerings = await client.query(
        'SELECT id FROM course_offerings WHERE teacher_id = $1', 
        [id]
      );
      
      // Delete schedules for these offerings
      for (const offering of offerings.rows) {
        await client.query(
          'DELETE FROM schedules WHERE course_offering_id = $1', 
          [offering.id]
        );
      }
      
      // Delete the course offerings
      await client.query(
        'DELETE FROM course_offerings WHERE teacher_id = $1', 
        [id]
      );
    }
    
    // Delete student enrollments
    await client.query('DELETE FROM student_enrollments WHERE student_id = $1', [id]);
    
    // Finally delete the user
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', err.message);
    res.status(500).json({ 
      message: 'Server error while deleting user',
      error: err.message 
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};