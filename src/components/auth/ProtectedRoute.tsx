import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTimeAuditStore } from '../../store/timeAuditStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  redirectPath?: string;
}

export function ProtectedRoute({ redirectPath = '/login' }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { setUserId } = useTimeAuditStore();
  
  // Clear user ID when logging out
  useEffect(() => {
    if (!user && !loading) {
      setUserId(null);
    }
  }, [user, loading, setUserId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to={redirectPath} replace />;
  }
  
  return <Outlet />;
}