import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiScheduleWithDetails, AcademicYear } from '../types';
import Navbar from '../components/Navbar';
import NotificationBell from '../components/NotificationBell';
import { 
  fetchUserSchedule, 
  fetchClassGroupNotifications, 
  getUserClassGroup, 
  fetchAllClassGroups, 
  fetchScheduleByClassGroup,
  fetchUserEnrollment
} from '../services/scheduleuserApi';

interface ClassGroup {
  id: string;
  name: string;
  year: string;
  major: string;
  section: string;
}

interface StudentEnrollment {
  student_id: string;
  class_group_id: string;
  td_group: string;
  tp_group: string;
}

const UserSchedulePage = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ApiScheduleWithDetails[]>([]);
  const [filteredSchedule, setFilteredSchedule] = useState<ApiScheduleWithDetails[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<string>('2025');
  const [academicYear, setAcademicYear] = useState<AcademicYear>('1');
  const [language, setLanguage] = useState<string>('english');
  const [classGroup, setClassGroup] = useState<string>('');
  const [classGroupId, setClassGroupId] = useState<string>('');
  const [weekRange, setWeekRange] = useState<[number, number]>([1, 1]);
  const [availableClassGroups, setAvailableClassGroups] = useState<ClassGroup[]>([]);
  const [userClassGroup, setUserClassGroup] = useState<ClassGroup | null>(null);
  const [tdGroup, setTdGroup] = useState<string>('');
  const [tpGroup, setTpGroup] = useState<string>('');
  const [userEnrollment, setUserEnrollment] = useState<StudentEnrollment | null>(null);

  const timeSlots = [
    { id: 'H1', start: '08:00', end: '09:30' },
    { id: 'H2', start: '09:30', end: '11:00' },
    { id: 'H3', start: '11:00', end: '00:30' },
    { id: 'H4', start: '13:00', end: '14:30' },
    { id: 'H5', start: '15:00', end: '16:30' }
  ];

  const normalizeTime = (timeStr: string) => {
    if (!timeStr) return '';
    // Handle both HH:MM and HH:MM:SS formats
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      return `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
    }
    return timeStr;
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

  // Updated function to find ALL classes for a time slot with better time matching
  const findClassesForSlot = (day: Date, timeSlot: typeof timeSlots[0]) => {
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(day.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayOfMonth}`;
    
    const foundClasses = filteredSchedule.filter(s => {
      const scheduleDate = s.formatted_date || s.date;
      const normalizedStartTime = normalizeTime(s.start_time);
      const normalizedEndTime = normalizeTime(s.end_time);
      const slotStartTime = normalizeTime(timeSlot.start);
      const slotEndTime = normalizeTime(timeSlot.end);
      
      const dateMatch = scheduleDate === dateStr;
      const timeMatch = normalizedStartTime === slotStartTime && normalizedEndTime === slotEndTime;
      
      // Debug logging for H3 slot specifically
      if (timeSlot.id === 'H3' && dateMatch) {
        console.log(`H3 Debug - Schedule item:`, {
          courseCode: s.course_code,
          startTime: s.start_time,
          normalizedStartTime,
          endTime: s.end_time,
          normalizedEndTime,
          slotStart: slotStartTime,
          slotEnd: slotEndTime,
          timeMatch
        });
      }
      
      return dateMatch && timeMatch;
    });
    
    return foundClasses;
  };

  // Helper function to apply group filtering
  const applyGroupFiltering = (scheduleData: ApiScheduleWithDetails[], currentTdGroup: string, currentTpGroup: string) => {
    return scheduleData.filter(item => {
      // Always show Course type classes
      if (item.type === 'Course') return true;
      
      // For TD classes - must match selected TD group
      if (item.type === 'TD') {
        return item.group_name === currentTdGroup;
      }
      
      // For TP classes - must match selected TP group
      if (item.type === 'TP') {
        return item.group_name === currentTpGroup;
      }
      
      return true;
    });
  };

  const fetchSchedule = async (groupId: string, selectedYear?: string, currentTdGroup?: string, currentTpGroup?: string) => {
    try {
      setLoading(true);
      const yearToUse = selectedYear || year;
      const tdGroupToUse = currentTdGroup || tdGroup;
      const tpGroupToUse = currentTpGroup || tpGroup;
      
      const scheduleResponse = await fetchScheduleByClassGroup(groupId);
      const scheduleData = Array.isArray(scheduleResponse) ? scheduleResponse : [];
      
      // Debug log all schedule data
      console.log('All schedule data:', scheduleData);
      
      const yearFilteredData = scheduleData.filter(item => {
        const itemDate = item.formatted_date || item.date;
        if (itemDate) {
          const itemYear = itemDate.split('-')[0];
          return itemYear === yearToUse;
        }
        return true;
      });
      
      // Debug log year filtered data
      console.log('Year filtered data:', yearFilteredData);
      
      // Apply group filtering with current or provided TD/TP groups
      const groupFilteredData = applyGroupFiltering(yearFilteredData, tdGroupToUse, tpGroupToUse);
      
      // Debug log group filtered data
      console.log('Group filtered data:', groupFilteredData);
      
      setSchedule(yearFilteredData);
      setFilteredSchedule(groupFilteredData);
      
      const notificationsResponse = await fetchClassGroupNotifications(groupId);
      setNotifications(Array.isArray(notificationsResponse) ? notificationsResponse : []);
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    if (classGroupId) {
      fetchSchedule(classGroupId, newYear);
    }
  };

  const handleAcademicYearChange = (newAcademicYear: AcademicYear) => {
    setAcademicYear(newAcademicYear);
    const filteredGroups = availableClassGroups.filter(g => g.year === newAcademicYear);
    if (filteredGroups.length > 0 && !filteredGroups.find(g => g.name === classGroup)) {
      const firstGroup = filteredGroups[0];
      setClassGroup(firstGroup.name);
      setClassGroupId(firstGroup.id);
      fetchSchedule(firstGroup.id);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    const filteredGroups = availableClassGroups.filter(g => g.section === newLanguage);
    if (filteredGroups.length > 0 && !filteredGroups.find(g => g.name === classGroup)) {
      const firstGroup = filteredGroups[0];
      setClassGroup(firstGroup.name);
      setClassGroupId(firstGroup.id);
      fetchSchedule(firstGroup.id);
    }
  };

  const handleClassGroupChange = (newClassGroup: string) => {
    const selectedGroup = availableClassGroups.find(g => g.name === newClassGroup);
    if (selectedGroup) {
      setClassGroup(selectedGroup.name);
      setClassGroupId(selectedGroup.id);
      setAcademicYear(selectedGroup.year as AcademicYear);
      setLanguage(selectedGroup.section);
      fetchSchedule(selectedGroup.id);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const currentWeek = getCurrentWeek();
        setWeekRange([currentWeek, currentWeek]);
        
        const [classGroupResponse, classGroupsResponse] = await Promise.all([
          getUserClassGroup(user.id),
          fetchAllClassGroups()
        ]);
        
        setUserClassGroup(classGroupResponse);
        setAvailableClassGroups(Array.isArray(classGroupsResponse) ? classGroupsResponse : []);
        
        if (classGroupResponse) {
          setClassGroup(classGroupResponse.name);
          setClassGroupId(classGroupResponse.id);
          setAcademicYear(classGroupResponse.year as AcademicYear);
          setLanguage(classGroupResponse.section);
          
          // Fetch user's enrollment data first
          const enrollmentData = await fetchUserEnrollment(user.id, classGroupResponse.id);
          setUserEnrollment(enrollmentData);
          
          // Set TD and TP groups with default values if enrollment data exists
          const userTdGroup = enrollmentData?.td_group || 'A';
          const userTpGroup = enrollmentData?.tp_group || 'A1';
          
          setTdGroup(userTdGroup);
          setTpGroup(userTpGroup);
          
          // Fetch schedule with the user's TD/TP groups for immediate filtering
          fetchSchedule(classGroupResponse.id, year, userTdGroup, userTpGroup);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Effect to re-filter schedule when TD/TP groups change
  useEffect(() => {
    if (schedule.length > 0) {
      const groupFilteredData = applyGroupFiltering(schedule, tdGroup, tpGroup);
      setFilteredSchedule(groupFilteredData);
    }
  }, [tdGroup, tpGroup, schedule]);

  const getFilteredClassGroups = () => {
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
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Schedule</h1>

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
                    onChange={(e) => handleAcademicYearChange(e.target.value as AcademicYear)}
                  >
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
                              {slot.id}<br/>
                              <span className="text-xs text-gray-500">{slot.start}-{slot.end}</span>
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
                              const classItems = findClassesForSlot(day, slot);
                              return (
                                <td key={slot.id} className="border border-gray-200 p-2">
                                  {classItems.length > 0 ? (
                                    <div className="space-y-2">
                                      {classItems.map((classItem, index) => (
                                        <div key={`${classItem.id}-${index}`} className="text-sm border-l-4 border-blue-400 pl-2 py-1 bg-blue-50">
                                          <div className="font-medium text-blue-800">{classItem.course_name}</div>
                                          <div className="text-gray-700 text-xs">{classItem.course_code}</div>
                                          <div className="text-gray-600 text-xs">{classItem.teacher_name || 'No teacher assigned'}</div>
                                          <div className="text-gray-600 text-xs">Room: {classItem.room}</div>
                                          <div className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded mt-1 inline-block">
                                            {classItem.type} {classItem.group_name ? `(${classItem.group_name})` : ''}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                            {normalizeTime(classItem.start_time)}-{normalizeTime(classItem.end_time)}
                                          </div>
                                        </div>
                                      ))}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSchedulePage;