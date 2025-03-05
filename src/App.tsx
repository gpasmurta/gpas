import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard.new';
import { Header } from './components/Header';
import { DailyPlanner } from './components/DailyPlanner';
import { UserMenu } from './components/auth/UserMenu';
import { Menu, Loader2 } from 'lucide-react';
import { useTimeAuditStore } from './store/timeAuditStore';
import { useAuth } from './context/AuthContext';

type View = 'dashboard' | 'planner';

function AppContent() {
  const [view, setView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { fetchUserTasks, setUserId, isLoading } = useTimeAuditStore();

  // Fetch user tasks when the user is authenticated
  useEffect(() => {
    if (user) {
      setUserId(user.id);
      fetchUserTasks(user.id);
    }
  }, [user, fetchUserTasks, setUserId]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu Button - only visible on small screens */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md text-gray-700"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      
      {/* Sidebar - hidden on mobile by default, shown when toggled */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 transition-transform duration-300 ease-in-out`}>
        <Sidebar currentView={view} onViewChange={(newView) => {
          setView(newView);
          setSidebarOpen(false); // Close sidebar on mobile when view changes
        }} />
      </div>
      
      { /* Sidebar - hidden on mobile by default, shown when toggled */}
      
      {/* Overlay to close sidebar on mobile */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <Header 
          title={view === 'dashboard' ? 'Insights Dashboard' : 'Daily Planner'} 
          view={view}
          onMenuClick={toggleSidebar}
        >
          <UserMenu />
        </Header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-4">
          {view === 'dashboard' ? <Dashboard /> : <DailyPlanner />}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppContent />} />
          </Route>
          
          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;