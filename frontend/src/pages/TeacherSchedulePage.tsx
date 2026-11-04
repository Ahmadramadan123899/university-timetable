import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiScheduleWithDetails, Notification, AcademicYear } from '../types';
import Navbar from '../components/Navbar';
import NotificationBell from '../components/NotificationBell';
import { fetchTeacherSchedule, fetchTeacherNotifications, fetchTeacherClassGroups } from '../services/scheduleTeacherApi';

interface ClassGroup {
  id: string;
  name: string;
  year: string;
  major: string;
  section: string;
}

const TeacherSchedulePage = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ApiScheduleWithDetails[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  // Filter states with default values
  const [year, setYear] = useState<string>('2025');
  const [academicYear, setAcademicYear] = useState<AcademicYear | 'all'>('all');
  const [language, setLanguage] = useState<string>('english');
  const [classGroup, setClassGroup] = useState<string>('');
  const [weekRange, setWeekRange] = useState<[number, number]>([1, 1]);
  const [availableClassGroups, setAvailableClassGroups] = useState<ClassGroup[]>([]);
  const [tdGroup, setTdGroup] = useState<string>('all');
  const [tpGroup, setTpGroup] = useState<string>('all');

  // Time slots configuration
  const timeSlots = [
    { id: 'H1', start: '08:00', end: '09:30' },
    { id: 'H2', start: '09:30', end: '11:00' },
    { id: 'H3', start: '11:00', end: '00:30' },
    { id: 'H4', start: '13:00', end: '14:30' },
    { id: 'H5', start: '15:00', end: '16:30' }
  ];

  const normalizeTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr.split(':').slice(0, 2).join(':');
  };

  const getCurrentWeek = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  const getWeekDays = (weekNumber: number) => {
    const selectedYear = parseInt(year);
    const jan1 = new Date(selectedYear, 0, 1);
    const jan1Day = jan1.getDay();
    const daysToFirstMonday = jan1Day === 0 ? 1 : (8 - jan1Day);
    const targetMonday = new Date(selectedYear, 0, 1 + daysToFirstMonday + (weekNumber - 2) * 7);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(targetMonday);
      dayDate.setDate(targetMonday.getDate() + i);
      weekDays.push(dayDate);
    }
    return weekDays;
  };

  const generateWeeks = () => {
    return Array.from({ length: 52 }, (_, i) => i + 1);
  };

  const formatDayDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    const month = date.toLocaleString('default', { month: 'short' });
    return `${dayName} (${month} ${date.getDate()})`;
  };

  const findClassForSlot = (day: Date, timeSlot: typeof timeSlots[0]) => {
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(day.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayOfMonth}`;
    
    const foundClass = schedule.find(s => {
      const scheduleDate = s.formatted_date || s.date;
      const normalizedStartTime = normalizeTime(s.start_time);
      const normalizedEndTime = normalizeTime(s.end_time);
      
      const dateMatch = scheduleDate === dateStr;
      const timeMatch = normalizedStartTime === timeSlot.start && normalizedEndTime === timeSlot.end;
      
      return dateMatch && timeMatch;
    });
    
    return foundClass;
  };

  const fetchFilteredSchedule = useCallback(async () => {
    if (!user || !initialDataLoaded) return;

    try {
      setLoading(true);
      setError(null);

      const filters = {
        year: year,
        academicYear: academicYear === 'all' ? undefined : academicYear,
        language: language,
        classGroup: classGroup || undefined,
        fromWeek: weekRange[0],
        toWeek: weekRange[1],
        tdGroup: tdGroup === 'all' ? undefined : tdGroup,
        tpGroup: tpGroup === 'all' ? undefined : tpGroup
      };

      console.log('Applying filters:', filters); // Debug log

      const scheduleResponse = await fetchTeacherSchedule(user.id, filters);
      
      const formattedSchedule = Array.isArray(scheduleResponse) 
        ? scheduleResponse.map(s => ({
            ...s,
            day_name: s.day_name || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(s.date).getDay()],
            formatted_date: s.formatted_date || new Date(s.date).toISOString().split('T')[0]
          }))
        : [];

      setSchedule(formattedSchedule);
    } catch (err) {
      console.error('Failed to fetch filtered schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [user, year, academicYear, language, classGroup, weekRange, tdGroup, tpGroup, initialDataLoaded]);

  // Initial data loading effect
  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Set current week as default
        const currentWeek = getCurrentWeek();
        setWeekRange([currentWeek, currentWeek]);
        
        // Fetch notifications and class groups
        const [notificationsResponse, classGroupsResponse] = await Promise.all([
          fetchTeacherNotifications(user.id),
          fetchTeacherClassGroups(user.id)
        ]);
        
        setNotifications(Array.isArray(notificationsResponse) ? notificationsResponse : []);
        setAvailableClassGroups(Array.isArray(classGroupsResponse) ? classGroupsResponse : []);
        
        // Mark initial data as loaded
        setInitialDataLoaded(true);
        
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load initial data');
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  // Schedule fetching effect - only runs after initial data is loaded
  useEffect(() => {
    if (initialDataLoaded) {
      fetchFilteredSchedule();
    }
  }, [fetchFilteredSchedule, initialDataLoaded]);

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
  };

  const handleAcademicYearChange = (newAcademicYear: AcademicYear | 'all') => {
    setAcademicYear(newAcademicYear);
    setClassGroup('');
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setClassGroup('');
  };

  const handleClassGroupChange = (newClassGroup: string) => {
    setClassGroup(newClassGroup);
  };

  const getFilteredClassGroups = () => {
    if (academicYear === 'all') {
      return availableClassGroups.filter(group => group.section === language);
    }
    return availableClassGroups.filter(group => {
      const matchesYear = group.year === academicYear;
      const matchesLanguage = group.section === language;
      return matchesYear && matchesLanguage;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const weeksInRange = Array.from(
    { length: weekRange[1] - weekRange[0] + 1 },
    (_, i) => weekRange[0] + i
  );

  const filteredClassGroups = getFilteredClassGroups();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm sm:rounded-lg">
            <div className="p-6 bg-white border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Teaching Schedule</h1>

              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Notifications</h2>
                <NotificationBell notifications={notifications} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={year}
                    onChange={(e) => handleYearChange(e.target.value)}
                  >
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={academicYear}
                    onChange={(e) => handleAcademicYearChange(e.target.value as AcademicYear | 'all')}
                  >
                    <option value="all">All Years</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="M1">Master 1</option>
                    <option value="M2">Master 2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    <option value="english">English</option>
                    <option value="french">French</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Group</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={classGroup}
                    onChange={(e) => handleClassGroupChange(e.target.value)}
                  >
                    <option value="">All Groups</option>
                    {filteredClassGroups.map(group => (
                      <option key={group.id} value={group.name}>{group.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TD Group</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={tdGroup}
                    onChange={(e) => setTdGroup(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TP Group</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={tpGroup}
                    onChange={(e) => setTpGroup(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Week</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={weekRange[0]}
                    onChange={(e) => setWeekRange([parseInt(e.target.value), weekRange[1]])}
                  >
                    {generateWeeks().map(week => (
                      <option key={`from-${week}`} value={week}>Week {week}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Week</label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={weekRange[1]}
                    onChange={(e) => setWeekRange([weekRange[0], parseInt(e.target.value)])}
                  >
                    {generateWeeks().filter(w => w >= weekRange[0]).map(week => (
                      <option key={`to-${week}`} value={week}>Week {week}</option>
                    ))}
                  </select>
                </div>
              </div>

              {schedule.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No schedule found for the selected filters.</p>
                </div>
              ) : (
                <>
                  {weeksInRange.map(week => (
                    <div key={`week-${week}`} className="mb-8">
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">Week {week}</h2>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border border-gray-200 p-2 text-left">Day</th>
                              {timeSlots.map(slot => (
                                <th key={slot.id} className="border border-gray-200 p-2 text-center">
                                  {slot.id}<br />
                                  <span className="text-xs text-gray-500">
                                    {slot.start}-{slot.end}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {getWeekDays(week).map(day => (
                              <tr key={day.toISOString()}>
                                <td className="border border-gray-200 p-2 font-medium">
                                  {formatDayDate(day)}
                                </td>
                                {timeSlots.map(slot => {
                                  const classItem = findClassForSlot(day, slot);
                                  return (
                                    <td key={slot.id} className="border border-gray-200 p-2">
                                      {classItem ? (
                                        <div className="text-sm">
                                          <div className="font-medium text-blue-800">{classItem.course_name}</div>
                                          <div className="text-gray-700">{classItem.course_code}</div>
                                          <div className="text-gray-600">Group: {classItem.class_group_name}</div>
                                          <div className="text-gray-600">Room: {classItem.room}</div>
                                          <div className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded mt-1 inline-block">
                                            {classItem.type} {classItem.group_name ? `(${classItem.group_name})` : ''}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-gray-400 text-sm text-center">-</div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSchedulePage;