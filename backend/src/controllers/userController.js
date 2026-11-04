// controllers/userController.js
const pool = require('../config/db');
const bcrypt = require('bcrypt');

const getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

const verifyUser = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  console.log('Login attempt:', { email, rememberMe: Boolean(rememberMe) }); // Debug log

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];
    let passwordValid = false;

    // Check password (supports both hashed and plaintext for migration)
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // Password is hashed
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      // Password is plaintext (for seeded users)
      passwordValid = password === user.password;
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Calculate session expiry based on remember me
    const now = new Date();
    let expiresAt;
    const isRememberMe = Boolean(rememberMe);
    
    if (isRememberMe) {
      // Remember me: 1 month (30 days)
      expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      console.log(`User ${user.email} logged in with Remember Me - expires: ${expiresAt.toISOString()}`);
    } else {
      // Regular login: 3 hours
      expiresAt = new Date(now.getTime() + (3 * 60 * 60 * 1000));
      console.log(`User ${user.email} logged in normally - expires: ${expiresAt.toISOString()}`);
    }

    // Prepare user data
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      expiresAt: expiresAt.toISOString(),
      rememberMe: isRememberMe
    };

    // Add student info if applicable
    if (user.role === 'student') {
      const enrollmentResult = await pool.query(
        `SELECT g.year, g.major, g.section 
         FROM student_enrollments e
         JOIN class_groups g ON e.class_group_id = g.id
         WHERE e.student_id = $1`,
        [user.id]
      );

      if (enrollmentResult.rows.length > 0) {
        userData.year = enrollmentResult.rows[0].year;
        userData.major = enrollmentResult.rows[0].major;
        userData.section = enrollmentResult.rows[0].section;
      }
    }

    console.log('Sending response:', { success: true, userData }); // Debug log

    res.json({
      success: true,
      data: userData
    });

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

module.exports = {
  getUsers,
  verifyUser
};