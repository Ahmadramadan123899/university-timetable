export const sendEmail = async (to: string, subject: string, body: string) => {
  try {
    const response = await fetch('http://localhost:8080/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ to, subject, body })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send email');
    }
    return response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const fetchStudentsInClassGroup = async (classGroupId: string) => {
  try {
    const response = await fetch(`http://localhost:8080/api/admin/notifications/class-groups/${classGroupId}/students`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch students');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
};

export const fetchTeacherDetails = async (teacherId: string) => {
  try {
    const response = await fetch(`http://localhost:8080/api/users/${teacherId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch teacher details');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching teacher details:', error);
    throw error;
  }
};