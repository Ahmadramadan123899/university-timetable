import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { fetchDashboardData } from '../services/dashboardApi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { DashboardData } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardData();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Unauthorized Access
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <p className="font-bold">Error Loading Dashboard</p>
          <p className="mt-2 text-sm">{error}</p>
          <button 
            onClick={loadData}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No dashboard data available
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: dashboardData.activityData.map(item => new Date(item.day).toLocaleDateString()),
    datasets: [
      {
        label: 'Schedule Changes',
        data: dashboardData.activityData.map(item => item.schedule_changes),
        backgroundColor: 'rgba(79, 70, 229, 0.6)',
      },
      {
        label: 'Cancellations',
        data: dashboardData.activityData.map(item => item.cancellations),
        backgroundColor: 'rgba(220, 38, 38, 0.6)',
      },
      {
        label: 'Room Changes',
        data: dashboardData.activityData.map(item => item.room_changes),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
      },
      {
        label: 'Exam Announcements',
        data: dashboardData.activityData.map(item => item.exams),
        backgroundColor: 'rgba(245, 158, 11, 0.6)',
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Activity Over Last 30 Days',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Activities'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-4 md:p-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow">
              <h3 className="text-md md:text-lg font-medium text-gray-900">Total Users</h3>
              <p className="mt-2 text-2xl md:text-3xl font-bold text-indigo-600">
                {dashboardData.stats.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-lg shadow">
              <h3 className="text-md md:text-lg font-medium text-gray-900">Active Courses</h3>
              <p className="mt-2 text-2xl md:text-3xl font-bold text-indigo-600">
                {dashboardData.stats.activeCourses.toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-lg shadow">
              <h3 className="text-md md:text-lg font-medium text-gray-900">Recent Schedule Changes</h3>
              <p className="mt-2 text-2xl md:text-3xl font-bold text-indigo-600">
                {dashboardData.stats.scheduleChanges.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
            {/* Recent Password Resets */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow">
              <h3 className="text-md md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Recent Password Resets</h3>
              {dashboardData.recentResets.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {dashboardData.recentResets.map((reset, index) => (
                    <div key={index} className="border-b pb-3 md:pb-4 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">{reset.name}</p>
                        <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(reset.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{reset.email}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No recent password resets</p>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow">
              <h3 className="text-md md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Recent Activity</h3>
              <div className="space-y-3 md:space-y-4">
                {dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="border-b pb-3 md:pb-4 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">By: {activity.changed_by}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Histogram */}
          <div className="mt-6 md:mt-8 bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-md md:text-lg font-medium text-gray-900 mb-3 md:mb-4">System Activity</h3>
            <div className="h-64 md:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;