
// services/userApi.ts
import { User, UserRole, AcademicYear, Major, Section } from '../types';

const API_BASE_URL = 'http://localhost:8080/api/admin';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const fetchUsers = async (
  search?: string,
  role?: UserRole,
  year?: AcademicYear,
  major?: Major,
  section?: Section,
  td_group?: string,
  tp_group?: string
): Promise<User[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (role) params.append('role', role);
  if (year) params.append('year', year);
  if (major) params.append('major', major);
  if (section) params.append('section', section);
  if (td_group) params.append('td_group', td_group);
  if (tp_group) params.append('tp_group', tp_group);

  const response = await fetch(`${API_BASE_URL}/users?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

// ... rest of userApi.ts remains the same ...
export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(user)
  });
  if (!response.ok) throw new Error('Failed to create user');
  return response.json();
};

export const updateUser = async (id: string, user: Partial<User>): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(user)
  });
  if (!response.ok) throw new Error('Failed to update user');
  return response.json();
};

export const deleteUser = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete user');
};