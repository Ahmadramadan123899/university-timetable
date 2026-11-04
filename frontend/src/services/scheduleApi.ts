
import { 
  AcademicYear, 
  Major, 
  Section, 
  SessionType
} from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

interface Teacher {
  id: string;
  name: string;
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
}

interface ApiScheduleWithDetails extends ApiSchedule {
  course_name: string;
  course_code: string;
  teacher_name: string | null;
  class_year: string;
  class_major: string;
  class_section: string;
  class_group_name: string;
  day_name: string;
  formatted_date: string;
}

interface ApiScheduleOption {
  offering_id: number;
  course_id: number;
  course_name: string;
  course_code: string;
  class_group_id: string;
  class_group_name: string;
}

export const fetchSchedules = async (
  year?: string,
  major?: string,
  section?: string,
  teacher_id?: string,
  startDate?: string,
  endDate?: string
): Promise<ApiScheduleWithDetails[]> => {
  const params = new URLSearchParams();
  if (year && year !== 'ALL') params.append('year', year);
  if (major && major !== 'ALL') params.append('major', major);
  if (section && section !== 'ALL') params.append('section', section);
  if (teacher_id && teacher_id !== 'ALL') params.append('teacher_id', teacher_id);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await fetch(`${API_BASE_URL}/schedules?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch schedules');
  return response.json();
};

export const fetchTeachers = async (): Promise<Teacher[]> => {
  const response = await fetch(`${API_BASE_URL}/schedules/teachers`);
  if (!response.ok) throw new Error('Failed to fetch teachers');
  return response.json();
};

export const fetchScheduleOptions = async (): Promise<ApiScheduleOption[]> => {
  const response = await fetch(`${API_BASE_URL}/schedules/options`);
  if (!response.ok) throw new Error('Failed to fetch schedule options');
  return response.json();
};

export const createSchedule = async (scheduleData: {
  course_offering_id: number;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  type: SessionType;
  teacher_id?: string | null;
  group_name?: string | null;
}): Promise<ApiScheduleWithDetails> => {
  const response = await fetch(`${API_BASE_URL}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create schedule');
  }
  return response.json();
};

export const updateSchedule = async (
  id: string,
  scheduleData: {
    date: string;
    start_time: string;
    end_time: string;
    room: string;
    type: SessionType;
    teacher_id?: string | null;
    group_name?: string | null;
  }
): Promise<ApiScheduleWithDetails> => {
  const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update schedule');
  }
  return response.json();
};

export const deleteSchedule = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete schedule');
  }
};