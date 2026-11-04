-- Tables of the UniTimetable database (PostgreSQL).
-- Run once on an empty database: psql -d <db> -f database/schema.sql

-- Enum types
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE major_type AS ENUM ('CCNE', 'CIVIL_ENG', 'MIS', 'INDUSTRIAL_ENG');
CREATE TYPE section_type AS ENUM ('english', 'french');
CREATE TYPE day_type AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
CREATE TYPE schedule_status AS ENUM ('scheduled', 'cancelled', 'rescheduled');
CREATE TYPE notification_type AS ENUM (
  'schedule_change', 
  'schedule_cancellation',
  'room_change',
  'exam_announcement'
);
CREATE TYPE session_type AS ENUM ('TD', 'TP', 'Course');
-- Create tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- New table for class groups
CREATE TABLE class_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  year VARCHAR(10) NOT NULL,
  major major_type NOT NULL,
  section section_type NOT NULL,
  UNIQUE(year, major, section)
);
-- Student enrollment in class groups
CREATE TABLE student_enrollments (
  student_id INTEGER REFERENCES users(id) NOT NULL,
  class_group_id INTEGER REFERENCES class_groups(id) NOT NULL,
td_group VARCHAR(50),
tp_group VARCHAR(50),
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, class_group_id)
);
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
 description TEXT,
tp_total_hours INTEGER,  
td_total_hours INTEGER,  
course_total_hours INTEGER,  
year VARCHAR(4),  
semester VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Course offerings per class group
CREATE TABLE course_offerings (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) NOT NULL,
  class_group_id INTEGER REFERENCES class_groups(id) NOT NULL,
  UNIQUE(course_id, class_group_id)
);
CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  course_offering_id INTEGER REFERENCES course_offerings(id) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(50) NOT NULL,
  status schedule_status DEFAULT 'scheduled',
type session_type NOT NULL DEFAULT 'Course',
group_name VARCHAR(50), ---A or B…..
teacher_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Improved schedule changes tracking
CREATE TABLE schedule_changes (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES schedules(id) NOT NULL,
  original_day day_type NOT NULL,
  original_start_time TIME NOT NULL,
  original_end_time TIME NOT NULL,
  new_day day_type,
  new_start_time TIME,
  new_end_time TIME,
  status schedule_status NOT NULL,
  reason TEXT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by INTEGER REFERENCES users(id) NOT NULL,
  CHECK (
    (status = 'rescheduled' AND new_day IS NOT NULL AND new_start_time IS NOT NULL AND new_end_time IS NOT NULL) OR
    (status = 'cancelled' AND new_day IS NULL AND new_start_time IS NULL AND new_end_time IS NULL)
  )
);
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
 class_group_id INTEGER REFERENCES class_groups(id),
  schedule_id INTEGER REFERENCES schedules(id) ,
  type notification_type NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE notifications ALTER COLUMN class_group_id SET NOT NULL;
-- migrations/xxxx_create_password_reset_tokens_table.sql
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
/*CREATE TABLE student_schedule_groups (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_offering_id INTEGER NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  session_type session_type NOT NULL,  -- Course / TD / TP
  group_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_offering_id, session_type)
);
CREATE TABLE user_notifications (
  user_id INTEGER REFERENCES users(id) NOT NULL,
  notification_id INTEGER REFERENCES notifications(id) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  PRIMARY KEY (user_id, notification_id)
);*/
