
import { 
  Notification, 
  NotificationType, 
  AcademicYear, 
  Major,
  Schedule
} from '../types';

const API_BASE_URL = 'http://localhost:8080/api/admin/notifications';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const fetchNotifications = async (
  search?: string,
  type?: NotificationType,
  year?: AcademicYear,
  major?: Major
): Promise<Notification[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (type) params.append('type', type);
  if (year) params.append('year', year);
  if (major) params.append('major', major);

  const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch notifications');
  }
  return response.json();
};

export const fetchClassGroups = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/class-groups`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch class groups');
  }
  return response.json();
};

export const fetchSchedules = async (classGroupId?: string): Promise<Schedule[]> => {
  const params = new URLSearchParams();
  if (classGroupId) params.append('classGroupId', classGroupId);

  const response = await fetch(`${API_BASE_URL}/schedules?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch schedules');
  }
  
  const schedules = await response.json();
  return schedules.map((schedule: any) => ({
    ...schedule,
    dayName: schedule.day_name,
    formattedDate: schedule.formatted_date
  }));
};

export const createNotification = async (notification: Omit<Notification, 'id'>): Promise<Notification> => {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(notification)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create notification');
  }
  return response.json();
};

export const updateNotification = async (id: string, notification: Partial<Notification>): Promise<Notification> => {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(notification)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update notification');
  }
  return response.json();
};

export const deleteNotification = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete notification');
  }
};

export const fetchStudentsInClassGroup = async (classGroupId: string) => {
  const response = await fetch(`${API_BASE_URL}/class-groups/${classGroupId}/students`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch students');
  }
  return response.json();
};