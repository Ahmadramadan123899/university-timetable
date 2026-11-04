// src/context/AuthContext.tsx
import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { loginUser } from '../services/authApi';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing logout timer
  const clearLogoutTimer = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  // Function to set up automatic logout timer
  const setupLogoutTimer = (expiresAt: string) => {
    clearLogoutTimer(); // Clear any existing timer first
    
    const timeUntilExpiry = new Date(expiresAt).getTime() - Date.now();
    
    if (timeUntilExpiry > 0) {
      console.log(`Session will expire in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
      
      logoutTimerRef.current = setTimeout(() => {
        console.log('Session expired - logging out automatically');
        logout();
      }, timeUntilExpiry);
    } else {
      // Session already expired
      logout();
    }
  };

  // Check for existing session and validate expiry on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        
        // Check if session has expired
        if (userData.expiresAt) {
          const expiryTime = new Date(userData.expiresAt);
          const currentTime = new Date();
          
          if (currentTime > expiryTime) {
            // Session expired, logout user
            console.log('Stored session expired, clearing...');
            localStorage.removeItem('user');
            navigate('/login');
            return;
          }
          
          // Session is still valid, set up the timer
          setupLogoutTimer(userData.expiresAt);
        }
        
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearLogoutTimer();
    };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      console.log('AuthContext login called with:', { email, rememberMe }); // Debug log
      
      // Clear any existing timer before new login
      clearLogoutTimer();
      
      // First check for admin login
      if (email === 'admin@admin.com' && password === 'admin123') {
        const now = new Date();
        const expiresAt = rememberMe 
          ? new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)) // 1 month
          : new Date(now.getTime() + (3 * 60 * 60 * 1000)); // 3 hours

        const adminUser = {
          id: '1',
          name: 'Admin',
          email: 'admin@admin.com',
          role: 'admin' as UserRole,
          expiresAt: expiresAt.toISOString(),
          rememberMe
        };
        
        setUser(adminUser);
        localStorage.setItem('user', JSON.stringify(adminUser));
        setupLogoutTimer(adminUser.expiresAt);
        
        console.log(`Admin logged in with ${rememberMe ? '1 month' : '3 hour'} session`);
        navigate('/admin');
        return;
      }

      // Regular user login
      console.log('Calling loginUser API...'); // Debug log
      const userData = await loginUser(email, password, rememberMe);
      console.log('API returned userData:', userData); // Debug log
      
      const user = {
        id: userData.id.toString(),
        name: userData.name,
        email: userData.email,
        role: userData.role as UserRole,
        year: userData.year,
        major: userData.major,
        section: userData.section,
        expiresAt: userData.expiresAt,
        rememberMe: userData.rememberMe
      };
      
      console.log('Setting user in context:', user); // Debug log
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      setupLogoutTimer(user.expiresAt);
      
      console.log(`User ${user.name} logged in with ${rememberMe ? '1 month' : '3 hour'} session`);
      
      // Redirect based on role
      console.log('Navigating based on role:', user.role); // Debug log
      if (user.role === 'student') {
        navigate('/schedule');
      } else if (user.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/');
      }
      
      console.log('Navigation completed'); // Debug log
    } catch (error) {
      console.error('Login failed in AuthContext:', error);
      throw error; // This will be caught in the LoginPage
    }
  };

  const logout = () => {
    clearLogoutTimer();
    setUser(null);
    localStorage.removeItem('user');
    console.log('User logged out');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};