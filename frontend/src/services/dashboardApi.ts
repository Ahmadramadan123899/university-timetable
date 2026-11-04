import { DashboardData } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch dashboard data');
    }

    return data.data;
  } catch (error) {
    console.error('Error in fetchDashboardData:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'An unknown error occurred while fetching dashboard data'
    );
  }
};