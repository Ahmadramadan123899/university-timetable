import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole, AcademicYear, Major, Section } from '../types';
import AdminSidebar from '../components/AdminSidebar';
import Navbar from '../components/Navbar';
import {
  fetchUsers as apiFetchUsers,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser
} from '../services/userApi';

const AdminManageUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
  const [filterYear, setFilterYear] = useState<AcademicYear | 'ALL'>('ALL');
  const [filterMajor, setFilterMajor] = useState<Major | 'ALL'>('ALL');
  const [filterSection, setFilterSection] = useState<Section | 'ALL'>('ALL');
  const [filterTdGroup, setFilterTdGroup] = useState<string | 'ALL'>('ALL');
  const [filterTpGroup, setFilterTpGroup] = useState<string | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditUser, setCurrentEditUser] = useState<User | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const users = await apiFetchUsers(
        searchTerm,
        filterRole !== 'ALL' ? filterRole : undefined,
        filterYear !== 'ALL' ? filterYear : undefined,
        filterMajor !== 'ALL' ? filterMajor : undefined,
        filterSection !== 'ALL' ? filterSection : undefined,
        filterTdGroup !== 'ALL' ? filterTdGroup : undefined,
        filterTpGroup !== 'ALL' ? filterTpGroup : undefined
      );
      setUsers(users);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentUser, searchTerm, filterRole, filterYear, filterMajor, filterSection, filterTdGroup, filterTpGroup]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (userData: Omit<User, 'id'>) => {
    try {
      setError(null);
      const newUser = await apiCreateUser(userData);
      setUsers([...users, newUser]);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to create user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleUpdate = async (id: string, userData: Partial<User>) => {
    try {
      setError(null);
      const updatedUser = await apiUpdateUser(id, userData);
      setUsers(users.map(u => u.id === id ? updatedUser : u));
      setCurrentEditUser(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setError(null);
      await apiDeleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const openEditModal = (user: User) => {
    setCurrentEditUser(user);
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
        <main className="flex-1 p-4 md:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Users</h1>
          
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full p-2 border rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as UserRole | 'ALL')}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
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
                {filterRole === 'student' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TD Group</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={filterTdGroup}
                        onChange={(e) => setFilterTdGroup(e.target.value)}
                      >
                        <option value="ALL">All TD Groups</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TP Group</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={filterTpGroup}
                        onChange={(e) => setFilterTpGroup(e.target.value)}
                      >
                        <option value="ALL">All TP Groups</option>
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <button 
              onClick={() => {
                setCurrentEditUser(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full md:w-auto"
            >
              + Add New User
            </button>
          </div>

          {loading && <div className="text-center py-4">Loading users...</div>}

          {!loading && (
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Year</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Major</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Section</th>
                      {filterRole === 'student' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">TD Group</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">TP Group</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={filterRole === 'student' ? 9 : 6} className="px-4 py-4 text-center text-gray-500">
                          {searchTerm || filterRole !== 'ALL' || filterYear !== 'ALL' || filterMajor !== 'ALL' || filterSection !== 'ALL' || filterTdGroup !== 'ALL' || filterTpGroup !== 'ALL'
                            ? 'No users match your filters'
                            : 'No users found'}
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{user.year || '-'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{user.major || '-'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{user.section || '-'}</td>
                          {filterRole === 'student' && (
                            <>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">{user.td_group || '-'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">{user.tp_group || '-'}</td>
                            </>
                          )}
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => openEditModal(user)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(user.id)}
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
            <UserModal
              user={currentEditUser}
              onClose={() => {
                setIsModalOpen(false);
                setCurrentEditUser(null);
              }}
              onSubmit={currentEditUser ? 
                (data) => handleUpdate(currentEditUser.id, data) : 
                handleCreate}
            />
          )}
        </main>
      </div>
    </div>
  );
};

interface UserModalProps {
  user: User | null;
  onClose: () => void;
  onSubmit: (data: Omit<User, 'id'>) => void;
}

const UserModal = ({ user, onClose, onSubmit }: UserModalProps) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'student',
    year: user?.year || '1',
    major: user?.major || 'CCNE',
    section: (user?.section || 'ENGLISH') as Section,
    td_group: user?.td_group || 'A',
    tp_group: user?.tp_group || 'A1',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user && formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    
    const submitData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      ...(formData.role === 'student' && {
        year: formData.year,
        major: formData.major,
        section: formData.section.toLowerCase() as Section,
        td_group: formData.td_group,
        tp_group: formData.tp_group
      }),
      ...(!user && {
        password: formData.password
      })
    };
    
    onSubmit(submitData as Omit<User, 'id'>);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Role*</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          {formData.role === 'student' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year*</label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="M1">Master 1</option>
                    <option value="M2">Master 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major*</label>
                  <select
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="CCNE">CCNE</option>
                    <option value="CIVIL_ENG">Civil Eng</option>
                    <option value="MIS">MIS</option>
                    <option value="INDUSTRIAL_ENG">Industrial Eng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section*</label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="ENGLISH">English</option>
                    <option value="FRENCH">French</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TD Group*</label>
                  <select
                    name="td_group"
                    value={formData.td_group}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TP Group*</label>
                  <select
                    name="tp_group"
                    value={formData.tp_group}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                  </select>
                </div>
              </div>
            </>
          )}
          
          {!user && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password*</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                  minLength={6}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password*</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </>
          )}
          
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
              {user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminManageUsersPage;