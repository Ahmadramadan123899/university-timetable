import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Notification, NotificationType, AcademicYear, Major, SessionType, Schedule } from '../types';
import AdminSidebar from '../components/AdminSidebar';
import Navbar from '../components/Navbar';
import {
  fetchNotifications as apiFetchNotifications,
  createNotification as apiCreateNotification,
  updateNotification as apiUpdateNotification,
  deleteNotification as apiDeleteNotification,
  fetchClassGroups,
  fetchSchedules as apiFetchSchedules,
  fetchStudentsInClassGroup as apiFetchStudentsInClassGroup
} from '../services/notificationsApi';
import { sendEmail, fetchTeacherDetails } from '../services/emailApi';

// Email template functions
const getEmailSubject = (type: NotificationType, title: string): string => {
  switch(type) {
    case 'schedule_change':
      return `Schedule Change: ${title}`;
    case 'schedule_cancellation':
      return `Class Cancellation: ${title}`;
    case 'room_change':
      return `Room Change: ${title}`;
    case 'exam_announcement':
      return `Exam Announcement: ${title}`;
    default:
      return `Notification: ${title}`;
  }
};

const formatTime = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hourNum = parseInt(hours, 10);
  return `${hourNum > 12 ? hourNum - 12 : hourNum}:${minutes} ${hourNum >= 12 ? 'PM' : 'AM'}`;
};

const getEmailBody = (
  notification: Omit<Notification, 'id'>,
  schedule: Schedule | undefined,
  classGroupName: string
): string => {
  let body = `<h2>${notification.title}</h2>`;
  body += `<p>${notification.message}</p>`;
  
  if (schedule) {
    body += `<h3>Schedule Details:</h3>`;
    body += `<ul>`;
    body += `<li><strong>Course:</strong> ${schedule.courseName || 'N/A'}</li>`;
    body += `<li><strong>Date:</strong> ${new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>`;
    body += `<li><strong>Time:</strong> ${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</li>`;
    body += `<li><strong>Room:</strong> ${schedule.room || 'N/A'}</li>`;
    body += `<li><strong>Type:</strong> ${schedule.type || 'N/A'}</li>`;
    body += `<li><strong>Teacher:</strong> ${schedule.teacherName || 'N/A'}</li>`;
    body += `</ul>`;
  }

  body += `<p><strong>Class Group:</strong> ${classGroupName}</p>`;
  body += `<p>This is an automated notification. Please do not reply to this email.</p>`;
  
  return body;
};

const getDayName = (date: string): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dateObj = new Date(date);
  return days[dateObj.getDay()];
};

const formatDate = (date: string): string => {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const AdminManageNotificationsPage = () => {
  const { user: currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [classGroups, setClassGroups] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<NotificationType | 'ALL'>('ALL');
  const [filterYear, setFilterYear] = useState<AcademicYear | 'ALL'>('ALL');
  const [filterMajor, setFilterMajor] = useState<Major | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditNotification, setCurrentEditNotification] = useState<Notification | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [notificationsData, groupsData] = await Promise.all([
        apiFetchNotifications(
          searchTerm,
          filterType !== 'ALL' ? filterType : undefined,
          filterYear !== 'ALL' ? filterYear : undefined,
          filterMajor !== 'ALL' ? filterMajor : undefined
        ),
        fetchClassGroups()
      ]);
      
      setNotifications(notificationsData);
      setClassGroups(groupsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentUser, searchTerm, filterType, filterYear, filterMajor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (notificationData: Omit<Notification, 'id'>) => {
    try {
      setError(null);
      setEmailStatus(null);
      const newNotification = await apiCreateNotification(notificationData);
      setNotifications(prev => [...prev, newNotification]);
      setIsModalOpen(false);

      if (newNotification.emailStatus) {
        setEmailStatus(newNotification.emailStatus.message);
      }
    } catch (err) {
      console.error('Failed to create notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to create notification');
    }
  };

  const handleUpdate = async (id: string, notificationData: Partial<Notification>) => {
    try {
      setError(null);
      setEmailStatus(null);
      const updatedNotification = await apiUpdateNotification(id, notificationData);
      setNotifications(prev => prev.map(n => n.id === id ? updatedNotification : n));
      setCurrentEditNotification(null);
      setIsModalOpen(false);

      if (updatedNotification.emailStatus) {
        setEmailStatus(updatedNotification.emailStatus.message);
      }
    } catch (err) {
      console.error('Failed to update notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to update notification');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;

    try {
      setError(null);
      await apiDeleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
    }
  };

  const openEditModal = (notification: Notification) => {
    setCurrentEditNotification(notification);
    setIsModalOpen(true);
  };

  const loadSchedules = async (classGroupId: string) => {
    try {
      const schedulesData = await apiFetchSchedules(classGroupId);
      setSchedules(schedulesData);
    } catch (err) {
      console.error('Failed to load schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    }
  };

  const formatNotificationType = (type: NotificationType) => {
    if (!type) return '-';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="min-h-screen bg-gray-100 p-8">Unauthorized</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 p-4 md:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Notifications</h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {emailStatus && (
            <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
              {emailStatus}
            </div>
          )}

          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <div className="md:hidden mb-4">
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="w-full flex justify-between items-center p-2 bg-gray-100 rounded"
              >
                <span>Filters</span>
                <svg
                  className={`h-5 w-5 transform ${isFiltersOpen ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className={`${isFiltersOpen ? 'block' : 'hidden'} md:block`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    className="w-full p-2 border rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as NotificationType | 'ALL')}
                  >
                    <option value="ALL">All Types</option>
                    <option value="schedule_change">Schedule Change</option>
                    <option value="schedule_cancellation">Schedule Cancellation</option>
                    <option value="room_change">Room Change</option>
                    <option value="exam_announcement">Exam Announcement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value as AcademicYear | 'ALL')}
                  >
                    <option value="ALL">All Years</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="M1">Master 1</option>
                    <option value="M2">Master 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={filterMajor}
                    onChange={(e) => setFilterMajor(e.target.value as Major | 'ALL')}
                  >
                    <option value="ALL">All Majors</option>
                    <option value="CCNE">CCNE</option>
                    <option value="CIVIL_ENG">Civil Eng</option>
                    <option value="MIS">MIS</option>
                    <option value="INDUSTRIAL_ENG">Industrial Eng</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <button 
              onClick={() => {
                setCurrentEditNotification(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full md:w-auto"
            >
              + Add New Notification
            </button>
          </div>

          {loading && <div className="text-center py-4">Loading notifications...</div>}

          {!loading && (
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Class Group</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Teacher</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {notifications.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                          {searchTerm || filterType !== 'ALL' || filterYear !== 'ALL' || filterMajor !== 'ALL'
                            ? 'No notifications match your filters'
                            : 'No notifications found'}
                        </td>
                      </tr>
                    ) : (
                      notifications.map((notification) => (
                        <tr key={notification.id}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {notification.title}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatNotificationType(notification.type)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                            {notification.classGroupName || '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                            {notification.teacherName || '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => openEditModal(notification)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(notification.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isModalOpen && (
            <NotificationModal
              notification={currentEditNotification}
              classGroups={classGroups}
              schedules={schedules}
              onClose={() => {
                setIsModalOpen(false);
                setCurrentEditNotification(null);
                setSchedules([]);
              }}
              onSubmit={currentEditNotification ? 
                (data) => handleUpdate(currentEditNotification.id, data) : 
                handleCreate}
              loadSchedules={loadSchedules}
            />
          )}
        </main>
      </div>
    </div>
  );
};

interface NotificationModalProps {
  notification: Notification | null;
  classGroups: any[];
  schedules: Schedule[];
  onClose: () => void;
  onSubmit: (data: Omit<Notification, 'id'>) => void;
  loadSchedules: (classGroupId: string) => Promise<void>;
}

const NotificationModal = ({ 
  notification, 
  classGroups, 
  schedules,
  onClose, 
  onSubmit,
  loadSchedules
}: NotificationModalProps) => {
  const [formData, setFormData] = useState({
    title: notification?.title || '',
    message: notification?.message || '',
    type: notification?.type || 'schedule_change',
    classGroupId: notification?.classGroupId || '',
    scheduleId: notification?.scheduleId || '',
    date: notification?.date || new Date().toISOString().split('T')[0],
    startTime: notification?.startTime || '',
    endTime: notification?.endTime || '',
    sessionType: notification?.sessionType || 'Course',
    teacherName: notification?.teacherName || ''
  });

  useEffect(() => {
    if (notification && notification.classGroupId && formData.classGroupId) {
      loadSchedules(formData.classGroupId);
    }
  }, [notification]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'classGroupId' && value) {
      await loadSchedules(value);
    }

    if (name === 'type' && value === 'exam_announcement') {
      setFormData(prev => ({ ...prev, scheduleId: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.type !== 'exam_announcement' && !formData.scheduleId) {
      alert('Please select a schedule');
      return;
    }

    const submitData = {
      title: formData.title,
      message: formData.message,
      type: formData.type as NotificationType,
      classGroupId: formData.classGroupId,
      scheduleId: formData.type === 'exam_announcement' ? null : formData.scheduleId,
      ...(['schedule_change', 'schedule_cancellation', 'room_change'].includes(formData.type) && {
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        sessionType: formData.sessionType as SessionType
      })
    };
    
    onSubmit(submitData as Omit<Notification, 'id'>);
  };

  const shouldShowScheduleDropdown = formData.type !== 'exam_announcement';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {notification ? 'Edit Notification' : 'Add New Notification'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type*</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="schedule_change">Schedule Change</option>
                <option value="schedule_cancellation">Schedule Cancellation</option>
                <option value="room_change">Room Change</option>
                <option value="exam_announcement">Exam Announcement</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Group*</label>
            <select
              name="classGroupId"
              value={formData.classGroupId}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select a class group</option>
              {classGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.year} {group.major} {group.section})
                </option>
              ))}
            </select>
          </div>

          {shouldShowScheduleDropdown && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule*</label>
              <select
                name="scheduleId"
                value={formData.scheduleId}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                disabled={!formData.classGroupId}
              >
                <option value="">
                  {!formData.classGroupId 
                    ? "Select a class group first" 
                    : schedules.length === 0 
                      ? "No schedules available" 
                      : "Select a schedule"
                  }
                </option>
                {schedules.map(schedule => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.dayName || getDayName(schedule.date)}, {formatDate(schedule.date)} - {schedule.startTime}-{schedule.endTime} ({schedule.type}) - {schedule.teacherName || 'No teacher'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Message*</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows={4}
              required
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              {notification ? 'Update Notification' : 'Create Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminManageNotificationsPage;