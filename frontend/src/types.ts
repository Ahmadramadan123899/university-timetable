
export type UserRole = 'student' | 'teacher' | 'admin';

export type AcademicYear = '1' | '2' | '3' | 'M1' | 'M2';
export type Major = 'CCNE' | 'CIVIL_ENG' | 'MIS' | 'INDUSTRIAL_ENG';
export type Section = 'ENGLISH' | 'FRENCH';
export type DayType = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type SessionType = 'TD' | 'TP' | 'Course';

// Utility functions for proper display formatting
export const getDisplayYear = (year: AcademicYear): string => {
  switch (year) {
    case '1': return 'Year 1';
    case '2': return 'Year 2';
    case '3': return 'Year 3';
    case 'M1': return 'Master 1';
    case 'M2': return 'Master 2';
    default: return year;
  }
};

export const getDisplayMajor = (major: Major): string => {
  switch (major) {
    case 'CCNE': return 'Computer and Communication Networks Engineering';
    case 'CIVIL_ENG': return 'Civil Engineering';
    case 'MIS': return 'Management Information Systems';
    case 'INDUSTRIAL_ENG': return 'Industrial Engineering';
    default: return major;
  }
};

export const getDisplaySection = (section: Section): string => {
  switch (section) {
    case 'ENGLISH': return 'English';
    case 'FRENCH': return 'French';
    default: return section;
  }
};

export const getDayName = (date: Date | string): DayType => {
  const days: DayType[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dayIndex = dateObj.getDay(); // 0 (Sunday) to 6 (Saturday)
  // Since our DayType doesn't include Sunday, we'll treat Sunday as Monday for display purposes
  return days[dayIndex === 0 ? 0 : dayIndex - 1];
};

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  year?: AcademicYear;
  major?: Major;
  section?: Section;
  td_group?: string;
  tp_group?: string;
}


export interface Teacher {
  id: string;
  name: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  year: AcademicYear;
  major: Major;
  section: Section;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  major?: Major;
  year?: AcademicYear;
  section?: Section;
  //teacher_id?: string;
  //teacher_name?: string;
  tp_total_hours : number;
    td_total_hours : number;
      course_total_hours : number;
      semester : string;
      class_year: number;
}

export interface Schedule {
  id: string;
  courseId: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  teacherId: string;
  type: SessionType;
  changes?: ScheduleChange[];
  dayName?: string;
  formattedDate?: string;
  teacherName: string;
  courseName: string;
  
}

export interface ScheduleChange {
  id: string;
  scheduleId: string;
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
  reason: string;
  createdAt: string;
  isCancelled: boolean;
}

interface ApiSchedule {
  id: string;
  course_offering_id: number;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  type: SessionType;
  teacher_id: string | null;
  group_name: string | null; // Add this line
}

export interface ApiScheduleWithDetails extends ApiSchedule {
  course_name: string;
  course_code: string;
  teacher_name: string;
  class_year: string;
  class_major: string;
  class_section: string;
  class_group_name: string;
  day_name: string;
  formatted_date: string;
   group_name: string | null; // Add this line
}

export interface ScheduleOption {
  offering_id: number;
  course_id: number;
  course_name: string;
  course_code: string;
  teacher_id: number;
  teacher_name: string;
  class_group_id: number;
  class_group_name: string;
  class_year: AcademicYear;
  class_major: Major;
  class_section: Section;
}

export interface DashboardData {
  stats: {
    totalUsers: number;
    activeCourses: number;
    scheduleChanges: number;
  };
  recentResets: {
    name: string;
    email: string;
    created_at: string;
  }[];
  activityData: {
    day: string;
    count: number;
    schedule_changes: number;
    cancellations: number;
    room_changes: number;
    exams: number;
  }[];
  recentActivity: {
    title: string;
    message: string;
    created_at: string;
    changed_by: string;
  }[];
}

export interface ActivityDataItem {
  day: string;
  count: number;
  schedule_changes: number;
  cancellations: number;
  room_changes: number;
  exams: number;
}

export interface RecentReset {
  name: string;
  email: string;
  created_at: string;
}

export interface RecentActivityItem {
  title: string;
  message: string;
  created_at: string;
  changed_by: string;
}

export type NotificationType = 
  | 'schedule_change' 
  | 'schedule_cancellation'
  | 'room_change'
  | 'exam_announcement';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  classGroupId: string;
  classGroupName?: string;
  scheduleId?: string;
  date?: string;
  formattedDate?: string;
  dayName?: string;
  startTime?: string;
  endTime?: string;
  sessionType?: SessionType;
  isRead: boolean;
  createdAt: string;
  teacherName: string;
  emailStatus?: {
    success: boolean;
    message: string;
    failedEmails?: Array<{
      email: string;
      error: string;
    }>;
  };
}
// Add these to your existing types
export interface ScheduleFilters {
  year: string;
  academicYear: AcademicYear;
  language: string;
  classGroup: string;
  weekRange: [number, number];
}

export interface WeekDay {
  date: Date;
  dayName: string;
  formattedDate: string;
}
export interface Teacher {
  id: string;
  name: string;
}

export interface TeacherDashboardData {
  course: {
    id: string;
    code: string;
    name: string;
    year?: string;
    semester?: string;
  };
  class: {
    year: string;
    major: string;
    section: string;
  };
  stats: {
    tp: {
      display: string;  // Formatted string for TP groups (e.g., "A1:5/15\nA2:3/15")
      scheduled: number; // Sum of all TP groups' scheduled sessions
      total: number;    // Combined total (4 * course.tp_total_hours)
      ratio: string;    // Formatted ratio (e.g., "15/60")
    };
    td: {
      display: string;  // Formatted string for TD groups (e.g., "A:5/15\nB:3/15")
      scheduled: number; // Sum of all TD groups' scheduled sessions
      total: number;    // Combined total (2 * course.td_total_hours)
      ratio: string;    // Formatted ratio (e.g., "8/30")
    };
    course: {
      scheduled: number;
      total: number;
      ratio: string;    // Formatted ratio (e.g., "5/20")
    };
  };
}