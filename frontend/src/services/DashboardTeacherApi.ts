
import { TeacherDashboardData, Teacher} from '../types';

export interface DashboardFilters {
  courseName?: string;
  sessionType?: string;
  year?: string;
  semester?: string;
}

export const fetchTeacherDashboard = async (
  filters?: DashboardFilters
): Promise<TeacherDashboardData[]> => {
  const params = new URLSearchParams();
  
  if (filters?.courseName) params.append('courseName', filters.courseName);
  if (filters?.sessionType) params.append('sessionType', filters.sessionType);
  if (filters?.year) params.append('year', filters.year);
  if (filters?.semester) params.append('semester', filters.semester);

  const response = await fetch(`http://localhost:8080/api/teachers/dashboard?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch teacher dashboard data');
  }
  return response.json();
};

export const fetchTeachersList = async (): Promise<Teacher[]> => {
  const response = await fetch('http://localhost:8080/api/teachers/teachers');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch teachers list');
  }
  return response.json();
};