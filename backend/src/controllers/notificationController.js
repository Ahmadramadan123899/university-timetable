//controller/notificationController.js
const pool = require('../config/db');

const getUserClassGroup = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT cg.id, cg.name, cg.year, cg.major, cg.section
       FROM class_groups cg
       JOIN student_enrollments se ON cg.id = se.class_group_id
       WHERE se.student_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User is not enrolled in any class group'
      });
    }

    res.json({
      success: true,
      data: result.rows[0] // Assuming a user is in only one class group
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user class group'
    });
  }
};

const getClassGroupNotifications = async (req, res) => {
  try {
    const { classGroupId } = req.params;

    const result = await pool.query(
      `SELECT 
        n.id,
        n.title,
        n.message,
        n.type,
        n.is_read AS "isRead",
        n.created_at AS "createdAt",
        cg.id AS "classGroupId",
        cg.name AS "classGroupName",
        cg.year,
        cg.major,
        cg.section,
        s.date,
        s.start_time AS "startTime",
        s.end_time AS "endTime",
        s.type AS "sessionType",
        s.group_name
      FROM notifications n
      JOIN class_groups cg ON n.class_group_id = cg.id
      LEFT JOIN schedules s ON n.schedule_id = s.id
      WHERE cg.id = $1
      ORDER BY n.created_at DESC`,
      [classGroupId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications'
    });
  }
};

module.exports = {
    getUserClassGroup,
  getClassGroupNotifications
};
