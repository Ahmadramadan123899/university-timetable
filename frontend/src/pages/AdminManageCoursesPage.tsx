import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Course, AcademicYear, Major, Section } from '../types';
import AdminSidebar from '../components/AdminSidebar';
import Navbar from '../components/Navbar';
import {
  fetchCourses as apiFetchCourses,
  createCourse as apiCreateCourse,
  updateCourse as apiUpdateCourse,
  deleteCourse as apiDeleteCourse
} from '../services/api';

const AdminManageCoursesPage = () => {
  const { user: currentUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<AcademicYear | 'ALL'>('ALL');
  const [filterMajor, setFilterMajor] = useState<Major | 'ALL'>('ALL');
  const [filterSection, setFilterSection] = useState<Section | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditCourse, setCurrentEditCourse] = useState<Course | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const fetchCourses = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const courses = await apiFetchCourses(
        searchTerm,
        filterYear !== 'ALL' ? filterYear : undefined,
        filterMajor !== 'ALL' ? filterMajor : undefined,
        filterSection !== 'ALL' ? filterSection : undefined
      );
      setCourses(courses);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [currentUser, searchTerm, filterYear, filterMajor, filterSection]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreate = async (courseData: Omit<Course, 'id'>) => {
    try {
      setError(null);
      const newCourse = await apiCreateCourse(courseData);
      setCourses([...courses, newCourse]);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to create course:', err);
      setError(err instanceof Error ? err.message : 'Failed to create course');
    }
  };

  const handleUpdate = async (id: string, courseData: Partial<Course>) => {
    try {
      setError(null);
      const updatedCourse = await apiUpdateCourse(id, courseData);
      setCourses(courses.map(c => c.id === id ? updatedCourse : c));
      setCurrentEditCourse(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to update course:', err);
      setError(err instanceof Error ? err.message : 'Failed to update course');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      setError(null);
      await apiDeleteCourse(id);
      setCourses(courses.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete course:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete course');
    }
  };

  const openEditModal = (course: Course) => {
    setCurrentEditCourse(course);
    setIsModalOpen(true);
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="min-h-screen bg-gray-100 p-8">Unauthorized</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 p-4 md:p-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Courses</h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search courses..."
                    className="w-full p-2 border rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
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
              </div>
            </div>
          </div>

          <div className="mb-4">
            <button 
              onClick={() => {
                setCurrentEditCourse(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full md:w-auto"
            >
              + Add New Course
            </button>
          </div>

          {loading && <div className="text-center py-4">Loading courses...</div>}

          {!loading && (
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Year/Semester</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Class</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                          {searchTerm || filterYear !== 'ALL' || filterMajor !== 'ALL' || filterSection !== 'ALL'
                            ? 'No courses match your filters'
                            : 'No courses found'}
                        </td>
                      </tr>
                    ) : (
                      courses.map((course) => (
                        <tr key={course.id}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.code}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{course.name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                            <div className="text-xs">
                              {course.tp_total_hours && <div>TP: {course.tp_total_hours}h</div>}
                              {course.td_total_hours && <div>TD: {course.td_total_hours}h</div>}
                              {course.course_total_hours && <div>Course: {course.course_total_hours}h</div>}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                            {course.year && course.semester ? `${course.year} ${course.semester}` : '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                            {course.class_year && course.major && course.section 
                              ? `${course.class_year} ${course.major} ${course.section.toUpperCase()}`
                              : '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => openEditModal(course)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(course.id)}
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
            <CourseModal
              course={currentEditCourse}
              onClose={() => {
                setIsModalOpen(false);
                setCurrentEditCourse(null);
              }}
              onSubmit={currentEditCourse ? 
                (data) => handleUpdate(currentEditCourse.id, data) : 
                handleCreate}
            />
          )}
        </main>
      </div>
    </div>
  );
};

interface CourseModalProps {
  course: Course | null;
  onClose: () => void;
  onSubmit: (data: Omit<Course, 'id'>) => void;
}

const CourseModal = ({ course, onClose, onSubmit }: CourseModalProps) => {
  const [formData, setFormData] = useState({
    code: course?.code || '',
    name: course?.name || '',
    description: course?.description || '',
    tp_total_hours: course?.tp_total_hours?.toString() || '',
    td_total_hours: course?.td_total_hours?.toString() || '',
    course_total_hours: course?.course_total_hours?.toString() || '',
    year: course?.year || '',
    semester: course?.semester || 'S1',
    class_year: course?.class_year || '1',
    major: course?.major || 'CCNE',
    section: (course?.section || 'english') as Section
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      code: formData.code,
      name: formData.name,
      description: formData.description,
      tp_total_hours: formData.tp_total_hours ? parseInt(formData.tp_total_hours) : null,
      td_total_hours: formData.td_total_hours ? parseInt(formData.td_total_hours) : null,
      course_total_hours: formData.course_total_hours ? parseInt(formData.course_total_hours) : null,
      year: formData.year || null,
      semester: formData.semester || null,
      class_year: formData.class_year || null,
      major: formData.major || null,
      section: formData.section?.toLowerCase() as Section || null
    };
    
    onSubmit(submitData as Omit<Course, 'id'>);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {course ? 'Edit Course' : 'Add New Course'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Code*</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Name*</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TP Hours</label>
              <input
                type="number"
                name="tp_total_hours"
                value={formData.tp_total_hours}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TD Hours</label>
              <input
                type="number"
                name="td_total_hours"
                value={formData.td_total_hours}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Hours</label>
              <input
                type="number"
                name="course_total_hours"
                value={formData.course_total_hours}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="text"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="e.g., 2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="S1">S1</option>
                <option value="S2">S2</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Class Assignment (Optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Year</label>
                <select
                  name="class_year"
                  value={formData.class_year}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                >
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
                  name="major"
                  value={formData.major}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="CCNE">CCNE</option>
                  <option value="CIVIL_ENG">Civil Engineering</option>
                  <option value="MIS">MIS</option>
                  <option value="INDUSTRIAL_ENG">Industrial Engineering</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="english">English</option>
                  <option value="french">French</option>
                </select>
              </div>
            </div>
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 mb-2 sm:mb-0"
            >
              {course ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminManageCoursesPage;