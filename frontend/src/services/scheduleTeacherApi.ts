
import { ApiScheduleWithDetails, Notification, ClassGroup } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

interface ScheduleFilters {
  year?: string;
  academicYear?: string;
  language?: string;
  classGroup?: string;
  fromWeek?: number;
  toWeek?: number;
  tdGroup?: string;
  tpGroup?: string;
}

export const fetchTeacherSchedule = async (
  teacherId: string, 
  filters?: ScheduleFilters
): Promise<ApiScheduleWithDetails[]> => {
  let url = `${API_BASE_URL}/teachers/${teacherId}/schedule`;
  
  // Add query parameters if filters are provided
  if (filters) {
    const queryParams = new URLSearchParams();
    
    if (filters.year) queryParams.append('year', filters.year);
    if (filters.academicYear) queryParams.append('academicYear', filters.academicYear);
    if (filters.language) queryParams.append('language', filters.language);
    if (filters.classGroup) queryParams.append('classGroup', filters.classGroup);
    if (filters.fromWeek) queryParams.append('fromWeek', filters.fromWeek.toString());
    if (filters.toWeek) queryParams.append('toWeek', filters.toWeek.toString());
    if (filters.tdGroup) queryParams.append('tdGroup', filters.tdGroup);
    if (filters.tpGroup) queryParams.append('tpGroup', filters.tpGroup);
    
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch teacher schedule');
  }

  const data = await response.json();
  return data.data;
};
export const fetchTeacherNotifications = async (teacherId: string): Promise<Notification[]> => {
  const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}/notifications`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch teacher notifications');
  }

  const data = await response.json();
  return data.data;
};

export const fetchTeacherClassGroups = async (teacherId: string): Promise<ClassGroup[]> => {
  const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}/class-groups`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch teacher class groups');
  }

  const data = await response.json();
  return data.data;
};