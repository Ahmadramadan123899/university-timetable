// src/services/authApi.ts
const API_BASE_URL = 'http://localhost:8080/api';

export const requestPasswordReset = async (email: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send reset email');
    }

    return data;
  } catch (error) {
    console.error('Error in requestPasswordReset:', error);
    throw error;
  }
};

export const resetPassword = async (token: string, newPassword: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to reset password');
    }

    return data;
  } catch (error) {
    console.error('Error in resetPassword:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string, rememberMe: boolean = false) => {
  try {
    console.log('Sending login request:', { email, rememberMe }); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/users/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        rememberMe 
      }),
    });

    console.log('Response status:', response.status); // Debug log
    console.log('Response ok:', response.ok); // Debug log

    const data = await response.json();
    console.log('Login response data:', data); // Debug log

    if (!response.ok) {
      // Handle backend error responses
      throw new Error(data.message || 'Login failed');
    }

    if (data.success === false) {
      throw new Error(data.message || 'Authentication failed');
    }

    // Check if we have the expected data structure
    if (!data.success || !data.data) {
      throw new Error('Invalid response format from server');
    }

    // Return the user data from the data property
    return data.data;
  } catch (error) {
    console.error('Error in loginUser:', error);
    throw error;
  }
};
