import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchTeacherDashboard } from '../services/DashboardTeacherApi';
import { TeacherDashboardData } from '../types';
import AdminSidebar from '../components/AdminSidebar';
import Navbar from '../components/Navbar';

const AdminTeacherDashboard = () => {
  const { user: currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    courseName: '',
    sessionType: '',
    year: '',
    semester: '',
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchTeacherDashboard(filters);
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to load teacher dashboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      courseName: '',
      sessionType: '',
      year: '',
      semester: '',
    });
  };

  const getRatioClass = (scheduled: number, total: number) => {
    if (total === 0) return 'text-gray-500';
    const percentage = (scheduled / total) * 100;
    if (percentage < 50) return 'text-red-600 font-bold';
    if (percentage < 80) return 'text-yellow-600 font-bold';
    return 'text-green-600 font-bold';
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="min-h-screen bg-gray-100 p-4">Unauthorized</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Course Sessions Dashboard</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Filters Section */}
          <div className="mb-4 bg-white p-3 md:p-4 rounded-lg shadow">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                <input
                  type="text"
                  name="courseName"
                  value={filters.courseName}
                  onChange={handleFilterChange}
                  placeholder="Search courses..."
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                <select
                  name="sessionType"
                  value={filters.sessionType}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="">All Types</option>
                  <option value="TP">TP</option>
                  <option value="TD">TD</option>
                  <option value="Course">Course</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="text"
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  placeholder="e.g., 2023"
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select
                  name="semester"
                  value={filters.semester}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="">All</option>
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300 text-sm"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {loading && <div className="text-center py-4">Loading dashboard data...</div>}

          {!loading && dashboardData.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No session data found matching your filters
            </div>
          )}

          {!loading && dashboardData.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Group</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year/Sem</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TP</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TD</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-3 whitespace-normal min-w-[200px]">
                          <div className="text-xs md:text-sm font-medium text-gray-900">{item.course.code}</div>
                          <div className="text-xs md:text-sm text-gray-500 break-words">
                            {item.course.name}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-xs md:text-sm text-gray-900">
                            {item.class.year} {item.class.major} {item.class.section.toUpperCase()}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-xs md:text-sm text-gray-500">
                            {item.course.year || '-'} {item.course.semester || ''}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div 
                            className="text-xs md:text-sm"
                            dangerouslySetInnerHTML={{ __html: item.stats.tp.display }}
                          />
                          <div className={`text-2xs md:text-xs ${getRatioClass(item.stats.tp.scheduled, item.stats.tp.total)}`}>
                            Total: {item.stats.tp.ratio}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div 
                            className="text-xs md:text-sm"
                            dangerouslySetInnerHTML={{ __html: item.stats.td.display }}
                          />
                          <div className={`text-2xs md:text-xs ${getRatioClass(item.stats.td.scheduled, item.stats.td.total)}`}>
                            Total: {item.stats.td.ratio}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`text-xs md:text-sm ${getRatioClass(item.stats.course.scheduled, item.stats.course.total)}`}>
                            {item.stats.course.ratio}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminTeacherDashboard;