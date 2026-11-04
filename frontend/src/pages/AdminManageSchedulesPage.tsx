import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import Navbar from '../components/Navbar';
import { 
  fetchSchedules, 
  fetchScheduleOptions, 
  fetchTeachers,
  createSchedule, 
  updateSchedule, 
  deleteSchedule 
} from '../services/scheduleApi';
import { AcademicYear, Major, Section, SessionType } from '../types';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Teacher {
  id: string;
  name: string;
}

interface ApiSchedule {
  id: string;
  course_offering_id: number;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  type: SessionType;
  teacher_id: string | null;
  group_name: string | null;
}

interface ApiScheduleWithDetails extends ApiSchedule {
  course_name: string;
  course_code: string;
  teacher_name: string | null;
  class_year: string;
  class_major: string;
  class_section: string;
  class_group_name: string;
  day_name: string;
  formatted_date: string;
}

interface ScheduleOption {
  offering_id: number;
  course_name: string;
  course_code: string;
  class_group_id: string;
  class_group_name: string;
}

const AdminManageSchedulesPage = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ApiScheduleWithDetails[]>([]);
  const [options, setOptions] = useState<ScheduleOption[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<ApiSchedule | null>(null);
  const [filterYear, setFilterYear] = useState<AcademicYear | 'ALL'>('ALL');
  const [filterMajor, setFilterMajor] = useState<Major | 'ALL'>('ALL');
  const [filterSection, setFilterSection] = useState<Section | 'ALL'>('ALL');
  const [filterTeacher, setFilterTeacher] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [schedulesData, optionsData, teachersData] = await Promise.all([
          fetchSchedules(
            filterYear, 
            filterMajor, 
            filterSection, 
            filterTeacher,
            startDate?.toISOString().split('T')[0],
            endDate?.toISOString().split('T')[0]
          ),
          fetchScheduleOptions(),
          fetchTeachers()
        ]);
        setSchedules(schedulesData as ApiScheduleWithDetails[]);
        setOptions(optionsData);
        setTeachers(teachersData);
      } catch (error) {
        console.error('Failed to load data:', error);
        alert('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, filterYear, filterMajor, filterSection, filterTeacher, startDate, endDate]);

  const handleCreate = async (scheduleData: {
    course_offering_id: number;
    date: string;
    start_time: string;
    end_time: string;
    room: string;
    type: SessionType;
    teacher_id?: string | null;
    group_name?: string | null;
  }) => {
    try {
      const newSchedule = await createSchedule(scheduleData);
      setSchedules([...schedules, newSchedule as ApiScheduleWithDetails]);
      setIsModalOpen(false);
      alert('Schedule created successfully');
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert(error instanceof Error ? error.message : 'Failed to create schedule');
    }
  };

  const handleUpdate = async (id: string, scheduleData: {
    date: string;
    start_time: string;
    end_time: string;
    room: string;
    type: SessionType;
    teacher_id?: string | null;
    group_name?: string | null;
  }) => {
    try {
      const updatedSchedule = await updateSchedule(id, scheduleData);
      setSchedules(schedules.map(s => s.id === id ? updatedSchedule as ApiScheduleWithDetails : s));
      setCurrentSchedule(null);
      setIsModalOpen(false);
      alert('Schedule updated successfully');
    } catch (error) {
      console.error('Failed to update schedule:', error);
      alert(error instanceof Error ? error.message : 'Failed to update schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteSchedule(id);
        setSchedules(schedules.filter(s => s.id !== id));
        alert('Schedule deleted successfully');
      } catch (error) {
        console.error('Failed to delete schedule:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete schedule');
      }
    }
  };
const openEditModal = (schedule: ApiScheduleWithDetails) => {
  setCurrentSchedule({
    id: schedule.id,
    course_offering_id: schedule.course_offering_id,
    date: schedule.date,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    room: schedule.room,
    type: schedule.type as SessionType,
    teacher_id: schedule.teacher_id,
    group_name: schedule.group_name || ''
  });
  setIsModalOpen(true);
};
  const renderSchedules = () => {
    if (schedules.length === 0) {
      return <p className="text-sm text-gray-500">No classes scheduled for the selected period.</p>;
    }

    const schedulesByDate = schedules.reduce((acc, schedule) => {
      const date = schedule.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(schedule);
      return acc;
    }, {} as Record<string, ApiScheduleWithDetails[]>);

    const sortedDates = Object.keys(schedulesByDate).sort();

    return (
      <div className="space-y-8">
        {sortedDates.map(date => (
          <div key={date} className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 p-4 bg-gray-50">
              {schedulesByDate[date][0].day_name}, {schedulesByDate[date][0].formatted_date}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Group</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Teacher</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedulesByDate[date].map((sched) => (
                    <tr key={sched.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{sched.start_time} - {sched.end_time}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="font-medium">{sched.course_code}</div>
                        <div className="text-xs text-gray-500">{sched.course_name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                        {sched.class_group_name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {sched.type}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {sched.group_name || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                        {sched.teacher_name || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sched.room}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditModal(sched)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(sched.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!user || user.role !== 'admin') {
    return <div className="min-h-screen bg-gray-100 p-8">Unauthorized</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Schedules</h1>
          
          {/* Filters */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    <option value="CCNE">Computer Networks</option>
                    <option value="CIVIL_ENG">Civil Engineering</option>
                    <option value="MIS">Management Info Systems</option>
                    <option value="INDUSTRIAL_ENG">Industrial Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value as Section | 'ALL')}
                  >
                    <option value="ALL">All Sections</option>
                    <option value="ENGLISH">English</option>
                    <option value="FRENCH">French</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                  >
                    <option value="ALL">All Teachers</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <div className="flex space-x-2">
                    <DatePicker
                      selected={startDate}
                      onChange={(date) => setStartDate(date || undefined)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      placeholderText="Start Date"
                      className="w-full p-2 border rounded text-sm"
                    />
                    <DatePicker
                      selected={endDate}
                      onChange={(date) => setEndDate(date || undefined)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      placeholderText="End Date"
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add New Schedule Button */}
          <div className="mb-4">
            <button 
              onClick={() => {
                setCurrentSchedule(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full md:w-auto"
            >
              + Add New Schedule
            </button>
          </div>

          {/* Loading State */}
          {loading && <div className="text-center py-4">Loading schedules...</div>}

          {/* Schedules List */}
          {!loading && (
            <div className="bg-white shadow-sm rounded-lg p-4 md:p-6">
              {renderSchedules()}
            </div>
          )}

          {/* Schedule Modal */}
          {isModalOpen && (
            <ScheduleModal
              schedule={currentSchedule}
              options={options}
              teachers={teachers}
              onClose={() => {
                setIsModalOpen(false);
                setCurrentSchedule(null);
              }}
              onSubmit={currentSchedule ? 
                (data) => handleUpdate(currentSchedule.id, data) : 
                handleCreate}
            />
          )}
        </main>
      </div>
    </div>
  );
};

interface ScheduleModalProps {
  schedule: ApiSchedule | null;
  options: ScheduleOption[];
  teachers: Teacher[];
  onClose: () => void;
  onSubmit: (data: {
    course_offering_id: number;
    date: string;
    start_time: string;
    end_time: string;
    room: string;
    type: SessionType;
    teacher_id?: string | null;
    group_name?: string | null;
  }) => void;
}
const ScheduleModal = ({ schedule, options, teachers, onClose, onSubmit }: ScheduleModalProps) => {
  const [formData, setFormData] = useState({
    course_offering_id: 0,
    date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '09:00',
    room: '',
    type: 'Course' as SessionType,
    teacher_id: '',
    group_name: ''
  });

  // This effect runs when the schedule prop changes
  useEffect(() => {
    if (schedule) {
      setFormData({
        course_offering_id: schedule.course_offering_id,
        date: schedule.date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        room: schedule.room,
        type: schedule.type,
        teacher_id: schedule.teacher_id || '',
        group_name: schedule.group_name || ''
      });
    } else {
      setFormData({
        course_offering_id: 0,
        date: new Date().toISOString().split('T')[0],
        start_time: '08:00',
        end_time: '09:00',
        room: '',
        type: 'Course',
        teacher_id: '',
        group_name: ''
      });
    }
  }, [schedule]);

  // ... rest of the component remains the same ...

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_offering_id) {
      alert('Please select a course');
      return;
    }
    onSubmit(formData);
  };

  const renderGroupDropdown = () => {
    if (formData.type === 'TP') {
      return (
        <select
          name="group_name"
          value={formData.group_name || ''}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value="">All TP Groups</option>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
        </select>
      );
    } else if (formData.type === 'TD') {
      return (
        <select
          name="group_name"
          value={formData.group_name || ''}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value="">All TD Groups</option>
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {schedule ? 'Edit Schedule' : 'Add New Schedule'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Course*</label>
           <select
  name="course_offering_id"
  value={formData.course_offering_id}
  onChange={handleChange}
  className="w-full p-2 border rounded"
  required
>
  <option value={0}>Select a course</option>
  {options.map(option => (
    <option 
      key={option.offering_id} 
      value={option.offering_id}
      selected={schedule?.course_offering_id === option.offering_id}
    >
      {option.course_name} ({option.course_code}) - {option.class_group_name}
    </option>
  ))}
</select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
            <select
              name="teacher_id"
              value={formData.teacher_id || ''}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a teacher</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date*</label>
            <DatePicker
              selected={formData.date ? new Date(formData.date) : null}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Type*</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="Course">Course</option>
              <option value="TD">TD</option>
              <option value="TP">TP</option>
            </select>
          </div>
          {formData.type !== 'Course' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.type === 'TP' ? 'TP Group' : 'TD Group'}
              </label>
              {renderGroupDropdown()}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time*</label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time*</label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Room*</label>
            <input
              type="text"
              name="room"
              value={formData.room}
              onChange={handleChange}
              className="w-full p-2 border rounded"
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
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminManageSchedulesPage;