import { Course } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

export const fetchCourses = async (
  search?: string,
  year?: string,
  major?: string,
  section?: string
): Promise<Course[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (year && year !== 'ALL') params.append('year', year);
  if (major && major !== 'ALL') params.append('major', major);
  if (section && section !== 'ALL') params.append('section', section.toLowerCase());

  const response = await fetch(`${API_BASE_URL}/courses?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch courses');
  return response.json();
};

export const createCourse = async (course: Omit<Course, 'id'>): Promise<Course> => {
  const response = await fetch(`${API_BASE_URL}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...course,
      // Ensure section is lowercase when sending to the backend
      section: course.section?.toLowerCase()
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create course');
  }
  return response.json();
};

export const updateCourse = async (id: string, course: Partial<Course>): Promise<Course> => {
  const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...course,
      // Ensure section is lowercase when sending to the backend
      section: course.section?.toLowerCase()
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update course');
  }
  return response.json();
};

export const deleteCourse = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete course');
  }
};