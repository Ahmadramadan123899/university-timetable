const pool = require('../config/db');
const nodemailer = require('nodemailer');

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email utility functions
const getEmailSubject = (type, title) => {
  switch(type) {
    case 'schedule_change':
      return `Schedule Change: ${title}`;
    case 'schedule_cancellation':
      return `Class Cancellation: ${title}`;
    case 'room_change':
      return `Room Change: ${title}`;
    case 'exam_announcement':
      return `Exam Announcement: ${title}`;
    default:
      return `Notification: ${title}`;
  }
};

const formatTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hourNum = parseInt(hours, 10);
  return `${hourNum > 12 ? hourNum - 12 : hourNum}:${minutes} ${hourNum >= 12 ? 'PM' : 'AM'}`;
};

const getEmailBody = (notification, schedule, classGroupName) => {
  let body = `<h2>${notification.title}</h2>`;
  body += `<p>${notification.message}</p>`;
  
  if (schedule) {
    body += `<h3>Schedule Details:</h3>`;
    body += `<ul>`;
    body += `<li><strong>Course:</strong> ${schedule.course_name || 'N/A'}</li>`;
    body += `<li><strong>Date:</strong> ${new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>`;
    body += `<li><strong>Time:</strong> ${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}</li>`;
    body += `<li><strong>Room:</strong> ${schedule.room || 'N/A'}</li>`;
    body += `<li><strong>Type:</strong> ${schedule.type || 'N/A'}</li>`;
    body += `<li><strong>Teacher:</strong> ${schedule.teacher_name || 'N/A'}</li>`;
    body += `</ul>`;
  }

  body += `<p><strong>Class Group:</strong> ${classGroupName}</p>`;
  body += `<p>This is an automated notification. Please do not reply to this email.</p>`;
  
  return body;
};

const sendNotificationEmails = async (notification, scheduleId, classGroupId) => {
  try {
    // Get class group details
    const classGroupResult = await pool.query(
      'SELECT name FROM class_groups WHERE id = $1',
      [classGroupId]
    );
    
    if (classGroupResult.rows.length === 0) {
      throw new Error('Class group not found');
    }
    
    const classGroupName = classGroupResult.rows[0].name;

    // Get schedule details
    let schedule = null;
    let teacherEmail = null;
    
    if (scheduleId) {
      const scheduleResult = await pool.query(`
        SELECT s.*, c.name as course_name, c.code as course_code, u.email as teacher_email, u.name as teacher_name
        FROM schedules s
        JOIN course_offerings co ON s.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        LEFT JOIN users u ON s.teacher_id = u.id
        WHERE s.id = $1
      `, [scheduleId]);
      
      if (scheduleResult.rows.length > 0) {
        schedule = scheduleResult.rows[0];
        teacherEmail = schedule.teacher_email;
      }
    }

    // Get all students in the class group
    const studentsResult = await pool.query(`
      SELECT u.email, u.name 
      FROM users u
      JOIN student_enrollments se ON u.id = se.student_id
      WHERE se.class_group_id = $1 AND u.role = 'student' AND u.email IS NOT NULL
    `, [classGroupId]);

    const students = studentsResult.rows;

    // Prepare email content
    const subject = getEmailSubject(notification.type, notification.title);
    const body = getEmailBody(notification, schedule, classGroupName);

    // Send emails to all students
    const emailPromises = [];
    
    for (const student of students) {
      if (student.email) {
        const mailOptions = {
          from: process.env.EMAIL_FROM,
          to: student.email,
          subject: subject,
          html: body
        };
        emailPromises.push(transporter.sendMail(mailOptions).catch(err => {
          console.error(`Failed to send email to ${student.email}:`, err);
          return { success: false, email: student.email, error: err.message };
        }));
      }
    }

    // Send email to teacher if exists
    if (teacherEmail) {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: teacherEmail,
        subject: subject,
        html: body
      };
      emailPromises.push(transporter.sendMail(mailOptions).catch(err => {
        console.error(`Failed to send email to teacher ${teacherEmail}:`, err);
        return { success: false, email: teacherEmail, error: err.message };
      }));
    }

    const results = await Promise.all(emailPromises);
    const failedEmails = results.filter(r => !r.success);
    
    if (failedEmails.length > 0) {
      console.error('Failed to send some emails:', failedEmails);
      return {
        success: false,
        message: `Error sending ${failedEmails.length} emails. Check console for details.`,
        failedEmails
      };
    }
    
    console.log(`Emails sent successfully to ${results.length} recipients`);
    
    return {
      success: true,
      message: `Emails sent to ${students.length} students${teacherEmail ? ' and 1 teacher' : ''}`,
      recipientCount: results.length
    };

  } catch (error) {
    console.error('Error sending notification emails:', error);
    throw error;
  }
};

const getNotifications = async (req, res) => {
  try {
    const { search, type, year, major } = req.query;

    let query = `
      SELECT 
        n.id, n.title, n.message, n.type, n.is_read, n.created_at,
        s.id AS schedule_id, s.date, s.start_time, s.end_time, s.type AS session_type, s.room,
        TO_CHAR(s.date, 'Day') AS day_name,
        TO_CHAR(s.date, 'YYYY-MM-DD') AS formatted_date,
        cg.id AS class_group_id, cg.name AS class_group_name,
        cg.year, cg.major, cg.section,
        u.id AS teacher_id, u.name AS teacher_name,
        c.name AS course_name, c.code AS course_code
      FROM notifications n
      LEFT JOIN schedules s ON n.schedule_id = s.id
      LEFT JOIN course_offerings co ON s.course_offering_id = co.id
      LEFT JOIN courses c ON co.course_id = c.id
      LEFT JOIN class_groups cg ON n.class_group_id = cg.id
      LEFT JOIN users u ON s.teacher_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (n.title ILIKE $${params.length + 1} OR n.message ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (type && type !== 'ALL') {
      query += ` AND n.type = $${params.length + 1}`;
      params.push(type);
    }

    if (year && year !== 'ALL') {
      query += ` AND cg.year = $${params.length + 1}`;
      params.push(year);
    }

    if (major && major !== 'ALL') {
      query += ` AND cg.major = $${params.length + 1}`;
      params.push(major);
    }

    query += ` ORDER BY n.created_at DESC`;

    const result = await pool.query(query, params);

    const formattedNotifications = result.rows.map(row => ({
      id: row.id.toString(),
      title: row.title,
      message: row.message,
      type: row.type,
      teacherId: row.teacher_id?.toString() || null,
      teacherName: row.teacher_name || null,
      classGroupId: row.class_group_id?.toString() || null,
      classGroupName: row.class_group_name || null,
      isRead: row.is_read,
      createdAt: row.created_at.toISOString(),
      ...(row.schedule_id && { 
        scheduleId: row.schedule_id.toString(),
        date: row.date,
        formattedDate: row.formatted_date,
        dayName: row.day_name?.trim(),
        startTime: row.start_time,
        endTime: row.end_time,
        sessionType: row.session_type,
        room: row.room,
        courseName: row.course_name,
        courseCode: row.course_code
      })
    }));

    res.json(formattedNotifications);
  } catch (err) {
    console.error('Error in getNotifications:', err);
    res.status(500).json({
      message: 'Server error while fetching notifications',
      error: err.message
    });
  }
};

const getClassGroups = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM class_groups ORDER BY year, major, section');
    
    const formattedGroups = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      year: row.year,
      major: row.major,
      section: row.section
    }));
    
    res.json(formattedGroups);
  } catch (err) {
    console.error('Error in getClassGroups:', err);
    res.status(500).json({ 
      message: 'Server error while fetching class groups',
      error: err.message 
    });
  }
};

const createNotification = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      title,
      message,
      type,
      classGroupId,
      scheduleId
    } = req.body;

    if (!title || !message || !type || !classGroupId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO notifications (title, message, type, class_group_id, schedule_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [title, message, type, classGroupId, scheduleId || null];

    const result = await client.query(insertQuery, values);
    const newNotification = result.rows[0];

    await client.query('COMMIT');

    // Send emails after successful creation
    let emailResult = { success: false, message: 'No emails sent' };
    try {
      emailResult = await sendNotificationEmails(newNotification, scheduleId, classGroupId);
    } catch (emailError) {
      console.error('Error sending emails:', emailError);
      emailResult = { 
        success: false, 
        message: 'Error sending emails: ' + emailError.message 
      };
    }

    res.status(201).json({
      message: 'Notification created successfully',
      notification: {
        id: newNotification.id.toString(),
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        classGroupId: newNotification.class_group_id.toString(),
        scheduleId: newNotification.schedule_id?.toString() || null,
        isRead: newNotification.is_read,
        createdAt: newNotification.created_at.toISOString()
      },
      emailStatus: emailResult
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating notification:', err);
    res.status(500).json({
      message: 'Server error while creating notification',
      error: err.message
    });
  } finally {
    client.release();
  }
};

const updateNotification = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { 
      title, 
      message, 
      type, 
      classGroupId, 
      scheduleId 
    } = req.body;

    if (!title || !message || !type || !classGroupId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const notificationCheck = await client.query(
      'SELECT id, class_group_id FROM notifications WHERE id = $1', 
      [id]
    );
    if (notificationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const classGroupCheck = await client.query(
      'SELECT id, name FROM class_groups WHERE id = $1', 
      [classGroupId]
    );
    if (classGroupCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Class group not found' });
    }

    await client.query('BEGIN');

    const notificationResult = await client.query(
      `UPDATE notifications 
       SET title = $1, message = $2, type = $3, class_group_id = $4, schedule_id = $5
       WHERE id = $6
       RETURNING *`,
      [title, message, type, classGroupId, scheduleId || null, id]
    );

    const updatedNotification = notificationResult.rows[0];

    await client.query('COMMIT');

    // Send emails after successful update
    let emailResult = { success: false, message: 'No emails sent' };
    try {
      emailResult = await sendNotificationEmails(updatedNotification, scheduleId, classGroupId);
    } catch (emailError) {
      console.error('Error sending emails:', emailError);
      emailResult = { 
        success: false, 
        message: 'Error sending emails: ' + emailError.message 
      };
    }

    // Get schedule details if scheduleId exists
    let scheduleDetails = null;
    if (scheduleId) {
      const scheduleResult = await client.query(
        `SELECT s.date, s.start_time, s.end_time, s.type AS session_type, s.room,
                c.name AS course_name, c.code AS course_code,
                u.name AS teacher_name
         FROM schedules s
         JOIN course_offerings co ON s.course_offering_id = co.id
         JOIN courses c ON co.course_id = c.id
         LEFT JOIN users u ON s.teacher_id = u.id
         WHERE s.id = $1`,
        [scheduleId]
      );
      if (scheduleResult.rows.length > 0) {
        scheduleDetails = scheduleResult.rows[0];
      }
    }

    const response = {
      id: updatedNotification.id.toString(),
      title: updatedNotification.title,
      message: updatedNotification.message,
      type: updatedNotification.type,
      classGroupId: classGroupId.toString(),
      classGroupName: classGroupCheck.rows[0].name,
      isRead: updatedNotification.is_read,
      createdAt: updatedNotification.created_at.toISOString(),
      emailStatus: emailResult,
      ...(scheduleDetails && {
        scheduleId: scheduleId.toString(),
        date: scheduleDetails.date,
        formattedDate: scheduleDetails.date.toISOString().split('T')[0],
        dayName: new Date(scheduleDetails.date).toLocaleDateString('en-US', { weekday: 'long' }),
        startTime: scheduleDetails.start_time,
        endTime: scheduleDetails.end_time,
        sessionType: scheduleDetails.session_type,
        room: scheduleDetails.room,
        courseName: scheduleDetails.course_name,
        teacherName: scheduleDetails.teacher_name
      })
    };

    res.json(response);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in updateNotification:', err);
    res.status(500).json({
      message: 'Server error while updating notification',
      error: err.message
    });
  } finally {
    client.release();
  }
};

const deleteNotification = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    const notificationCheck = await client.query(
      'SELECT id FROM notifications WHERE id = $1', 
      [id]
    );
    if (notificationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await client.query('BEGIN');
    
    // Delete the notification directly (no user_notifications table needed based on your schema)
    await client.query(
      'DELETE FROM notifications WHERE id = $1', 
      [id]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in deleteNotification:', err);
    res.status(500).json({ 
      message: 'Server error while deleting notification',
      error: err.message 
    });
  } finally {
    client.release();
  }
};

const getSchedules = async (req, res) => {
  try {
    const { classGroupId } = req.query;

    if (!classGroupId) {
      return res.status(400).json({ message: 'classGroupId is required' });
    }

    const query = `
      SELECT 
        s.id, s.date, s.start_time, s.end_time, s.type AS session_type, s.room,
        TO_CHAR(s.date, 'Day') AS day_name,
        TO_CHAR(s.date, 'YYYY-MM-DD') AS formatted_date,
        co.id AS course_offering_id, co.course_id,
        c.name AS course_name, c.code AS course_code,
        u.id AS teacher_id, u.name AS teacher_name
      FROM schedules s
      JOIN course_offerings co ON s.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN users u ON s.teacher_id = u.id
      WHERE co.class_group_id = $1 AND s.date >= CURRENT_DATE
      ORDER BY s.date, s.start_time
    `;

    const result = await pool.query(query, [classGroupId]);

    const formattedSchedules = result.rows.map(row => ({
      id: row.id.toString(),
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      sessionType: row.session_type,
      dayName: row.day_name?.trim(),
      formattedDate: row.formatted_date,
      room: row.room,
      courseId: row.course_id?.toString() || null,
      courseName: row.course_name || null,
      courseCode: row.course_code || null,
      teacherId: row.teacher_id?.toString() || null,
      teacherName: row.teacher_name || null,
      type: row.session_type
    }));

    res.json(formattedSchedules);
  } catch (err) {
    console.error('Error in getSchedules:', err);
    res.status(500).json({
      message: 'Server error while fetching schedules',
      error: err.message
    });
  }
};

const getStudentsInClassGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT u.id, u.name, u.email 
      FROM users u
      JOIN student_enrollments se ON u.id = se.student_id
      WHERE se.class_group_id = $1 AND u.role = 'student'
      ORDER BY u.name
    `;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting students:', err);
    res.status(500).json({
      message: 'Server error while fetching students',
      error: err.message
    });
  }
};

module.exports = {
  getNotifications,
  getClassGroups,
  createNotification,
  updateNotification,
  deleteNotification,
  getSchedules,
  getStudentsInClassGroup
};