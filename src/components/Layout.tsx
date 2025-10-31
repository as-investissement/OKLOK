import React from 'react';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import WeeklySubmissionNotification from './WeeklySubmissionNotification';
import WeeklyReminderNotification from './WeeklyReminderNotification';

const Layout: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const isCalendarPage = location.pathname === '/calendar';
  const isDashboardPage = location.pathname === '/dashboard';
  const isTimesheetDetailPage = location.pathname.startsWith('/timesheets/') && location.pathname !== '/timesheets';
  const isProfilePage = location.pathname === '/profile';
  
  // Appliquer le mode sombre au chargement et gérer les changements
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkModeEnabled');
    if (savedDarkMode === 'true') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    
    // Écouter les changements de mode sombre
    const handleDarkModeChange = (event: CustomEvent) => {
      if (event.detail.enabled) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    };
    
    window.addEventListener('darkModeChanged', handleDarkModeChange as EventListener);
    
    return () => {
      window.removeEventListener('darkModeChanged', handleDarkModeChange as EventListener);
    };
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className={`${isCalendarPage || isDashboardPage || isTimesheetDetailPage || isProfilePage ? 'h-screen h-[100dvh] overflow-hidden' : 'min-h-screen min-h-[100dvh]'} bg-white dark:bg-gray-900 flex flex-col transition-colors duration-200`}>
      <Navbar />
      <main className={`flex-1 bg-white dark:bg-gray-900 transition-colors duration-200 ${isCalendarPage || isDashboardPage || isTimesheetDetailPage || isProfilePage ? 'overflow-hidden p-0' : 'p-3 sm:p-4 md:p-6'}`}>
        <div className={isCalendarPage || isDashboardPage || isTimesheetDetailPage || isProfilePage ? 'h-full overflow-hidden' : 'max-w-7xl mx-auto'}>
          <Outlet />
        </div>
      </main>
      <WeeklySubmissionNotification />
      <WeeklyReminderNotification />
    </div>
  );
};

export default Layout;