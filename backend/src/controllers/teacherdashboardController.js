
const pool = require('../config/db');

const getTeacherDashboard = async (req, res) => {
  try {
    const { 
      courseName,
      sessionType,
      year,
      semester,
      teacherId 
    } = req.query;

    // Get all courses with their class groups
    let baseQuery = `
      SELECT 
        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.tp_total_hours,
        c.td_total_hours,
        c.course_total_hours,
        c.year AS course_year,
        c.semester AS course_semester,
        g.id AS class_group_id,
        g.year AS class_year,
        g.major AS class_major,
        g.section AS class_section
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      JOIN class_groups g ON co.class_group_id = g.id
      WHERE 1=1
    `;

    const baseParams = [];
    const baseConditions = [];

    if (courseName) {
      baseConditions.push(`c.name ILIKE $${baseParams.length + 1}`);
      baseParams.push(`%${courseName}%`);
    }

    if (year) {
      baseConditions.push(`c.year = $${baseParams.length + 1}`);
      baseParams.push(year);
    }

    if (semester) {
      baseConditions.push(`c.semester = $${baseParams.length + 1}`);
      baseParams.push(semester);
    }

    if (teacherId) {
      baseConditions.push(`co.teacher_id = $${baseParams.length + 1}`);
      baseParams.push(teacherId);
    }

    if (baseConditions.length > 0) {
      baseQuery += ` AND ${baseConditions.join(' AND ')}`;
    }

    baseQuery += ` ORDER BY c.code, g.year, g.major, g.section`;

    const baseResult = await pool.query(baseQuery, baseParams);

    if (baseResult.rows.length === 0) {
      return res.json([]);
    }

    // Get all schedules for these courses
    const courseIds = baseResult.rows.map(row => row.course_id);
    const classGroupIds = baseResult.rows.map(row => row.class_group_id);

    let schedulesQuery = `
      SELECT 
        co.course_id,
        co.class_group_id,
        s.type,
        s.group_name,
        COUNT(*) as scheduled_count
      FROM schedules s
      JOIN course_offerings co ON s.course_offering_id = co.id
      WHERE co.course_id = ANY($1)
      AND co.class_group_id = ANY($2)
    `;

    if (sessionType) {
      schedulesQuery += ` AND s.type = $3`;
    }

    schedulesQuery += ` GROUP BY co.course_id, co.class_group_id, s.type, s.group_name`;

    const schedulesParams = [courseIds, classGroupIds];
    if (sessionType) {
      schedulesParams.push(sessionType);
    }

    const schedulesResult = await pool.query(schedulesQuery, schedulesParams);

   
    // Organize the data
    const dashboardData = baseResult.rows.map(row => {
      const courseSchedules = schedulesResult.rows.filter(
        s => s.course_id === row.course_id && s.class_group_id === row.class_group_id
      );

      // Process TP groups - each group gets the full TP total hours
      const tpGroups = {
        A1: { scheduled: 0, total: row.tp_total_hours || 0 },
        A2: { scheduled: 0, total: row.tp_total_hours || 0 },
        B1: { scheduled: 0, total: row.tp_total_hours || 0 },
        B2: { scheduled: 0, total: row.tp_total_hours || 0 }
      };

      // Process TD groups - each group gets the full TD total hours
      const tdGroups = {
        A: { scheduled: 0, total: row.td_total_hours || 0 },
        B: { scheduled: 0, total: row.td_total_hours || 0 }
      };

      // Process Course sessions
      const courseSessions = {
        scheduled: 0,
        total: row.course_total_hours || 0
      };

      // Count scheduled sessions
      courseSchedules.forEach(sched => {
        if (sched.type === 'TP' && sched.group_name && tpGroups[sched.group_name]) {
          tpGroups[sched.group_name].scheduled += parseInt(sched.scheduled_count);
        } else if (sched.type === 'TD' && sched.group_name && tdGroups[sched.group_name]) {
          tdGroups[sched.group_name].scheduled += parseInt(sched.scheduled_count);
        } else if (sched.type === 'Course') {
          courseSessions.scheduled += parseInt(sched.scheduled_count);
        }
      });

      // Calculate combined totals (sum of all groups)
      const combinedTpTotal = row.tp_total_hours ? row.tp_total_hours * 4 : 0;
      const combinedTdTotal = row.td_total_hours ? row.td_total_hours * 2 : 0;
      
      const tpTotalScheduled = Object.values(tpGroups).reduce((sum, group) => sum + group.scheduled, 0);
      const tdTotalScheduled = Object.values(tdGroups).reduce((sum, group) => sum + group.scheduled, 0);

      // Format the display strings
      const formatGroupDisplay = (groups) => {
        return Object.entries(groups)
          .map(([group, data]) => `${group}:${data.scheduled}/${data.total}`)
          .join('<br/>');
      };

      return {
        course: {
          id: row.course_id,
          code: row.course_code,
          name: row.course_name,
          year: row.course_year,
          semester: row.course_semester
        },
        class: {
          year: row.class_year,
          major: row.class_major,
          section: row.class_section
        },
        stats: {
          tp: {
            display: formatGroupDisplay(tpGroups),
            scheduled: tpTotalScheduled,
            total: combinedTpTotal,
            ratio: combinedTpTotal ? `${tpTotalScheduled}/${combinedTpTotal}` : 'N/A'
          },
          td: {
            display: formatGroupDisplay(tdGroups),
            scheduled: tdTotalScheduled,
            total: combinedTdTotal,
            ratio: combinedTdTotal ? `${tdTotalScheduled}/${combinedTdTotal}` : 'N/A'
          },
          course: {
            scheduled: courseSessions.scheduled,
            total: courseSessions.total,
            ratio: courseSessions.total ? `${courseSessions.scheduled}/${courseSessions.total}` : 'N/A'
          }
        }
      };
    });

    res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching teacher dashboard:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Rest of the file remains the same...
const getTeachersList = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM users WHERE role = 'teacher' ORDER BY name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching teachers list:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getTeacherDashboard,
  getTeachersList
};