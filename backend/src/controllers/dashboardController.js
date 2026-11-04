const pool = require('../config/db');

const getDashboardData = async (req, res) => {
  try {
    // Execute all queries in parallel for better performance
    const [
      usersCount,
      coursesCount,
      scheduleChangesCount,
      recentResets,
      activityData,
      recentActivity
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM courses'),
      pool.query("SELECT COUNT(*) FROM schedule_changes WHERE changed_at > NOW() - INTERVAL '7 days'"),
      pool.query(`
        SELECT u.name, u.email, pr.created_at AT TIME ZONE 'UTC' as created_at
        FROM password_reset_tokens pr
        JOIN users u ON pr.user_id = u.id
        WHERE pr.created_at > NOW() - INTERVAL '7 days'
        ORDER BY pr.created_at DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT 
          DATE(created_at) as day,
          COUNT(*) as count,
          SUM(CASE WHEN type = 'schedule_change' THEN 1 ELSE 0 END) as schedule_changes,
          SUM(CASE WHEN type = 'schedule_cancellation' THEN 1 ELSE 0 END) as cancellations,
          SUM(CASE WHEN type = 'room_change' THEN 1 ELSE 0 END) as room_changes,
          SUM(CASE WHEN type = 'exam_announcement' THEN 1 ELSE 0 END) as exams
        FROM notifications
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `),
      pool.query(`
        SELECT 
          title, 
          message, 
          created_at AT TIME ZONE 'UTC' as created_at
        FROM notifications
        ORDER BY created_at DESC
        LIMIT 5
      `)
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers: parseInt(usersCount.rows[0].count),
          activeCourses: parseInt(coursesCount.rows[0].count),
          scheduleChanges: parseInt(scheduleChangesCount.rows[0].count)
        },
        recentResets: recentResets.rows,
        activityData: activityData.rows,
        recentActivity: recentActivity.rows
      }
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to load dashboard data',
      error: error.message 
    });
  }
};

module.exports = {
  getDashboardData
};
