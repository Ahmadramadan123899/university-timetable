import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import UserSchedulePage from './pages/UserSchedulePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminManageSchedulesPage from './pages/AdminManageSchedulesPage';
import AdminManageCoursesPage from './pages/AdminManageCoursesPage';
import AdminManageUsersPage from './pages/AdminManageUsersPage';
import AdminManageNotificationsPage from './pages/AdminManageNotificationsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TeacherSchedulePage from './pages/TeacherSchedulePage';
import AdminTeacherDashboard from './pages/AdminTeacherDashboard';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      {user ? (
        <>
          {user.role === 'admin' ? (
            <>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/Teacherdashboard" element={<AdminTeacherDashboard />} />
              <Route path="/admin/schedules" element={<AdminManageSchedulesPage />} />
              <Route path="/admin/courses" element={<AdminManageCoursesPage />} />
              <Route path="/admin/users" element={<AdminManageUsersPage />} />
              <Route path="/admin/notifications" element={<AdminManageNotificationsPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </>
          ) : user.role === 'teacher' ? (
            <>
              <Route path="/teacher-dashboard" element={<TeacherSchedulePage />} />
              <Route path="*" element={<Navigate to="/teacher-dashboard" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<UserSchedulePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;