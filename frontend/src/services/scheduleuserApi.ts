
import { ApiScheduleWithDetails, Notification as AppNotification } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

export const getUserClassGroup = async (userId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}/class-group`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch user class group');
  }

  const data = await response.json();
  return data.data || data;
};

export const fetchAllClassGroups = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/schedules/class-groups`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch class groups');
  }

  const data = await response.json();
  if (data.success && Array.isArray(data.data)) {
    return data.data;
  } else if (Array.isArray(data)) {
    return data;
  } else if (data.data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
};

export const fetchUserSchedule = async (userId: string): Promise<ApiScheduleWithDetails[]> => {
  const response = await fetch(`${API_BASE_URL}/schedules/user/${userId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch schedule');
  }

  const data = await response.json();
  
  if (data.success && Array.isArray(data.data)) {
    return data.data;
  } else if (Array.isArray(data)) {
    return data;
  }
  
  return [];
};

export const fetchScheduleByClassGroup = async (classGroupId: string): Promise<ApiScheduleWithDetails[]> => {
  const response = await fetch(`${API_BASE_URL}/schedules/class/${classGroupId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch class group schedule');
  }

  const data = await response.json();
  
  if (data.success && Array.isArray(data.data)) {
    return data.data;
  } else if (Array.isArray(data)) {
    return data;
  }
  
  return [];
};

export const fetchClassGroupNotifications = async (classGroupId: string): Promise<AppNotification[]> => {
  const response = await fetch(`${API_BASE_URL}/notifications/class-group/${classGroupId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch notifications');
  }

  const data = await response.json();
  
  if (data.success && Array.isArray(data.data)) {
    return data.data;
  } else if (Array.isArray(data.data)) {
    return data.data;
  } else if (Array.isArray(data)) {
    return data;
  }
  
  return [];
};

export const fetchUserEnrollment = async (userId: string, classGroupId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/schedules/student-enrollment/${userId}/${classGroupId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch user enrollment');
  }

  const data = await response.json();
  return data.data || data;
};