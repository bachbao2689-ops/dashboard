import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Navigate,useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {isAdmin,canViewTeamManagement} from '../../lib/roleScope';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location=useLocation();
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#002e6d] dark:bg-gray-900 flex items-center justify-center">
        <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center border border-white/20 backdrop-blur-md">
          <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
          <p className="text-white text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{from:location.pathname+location.search}} replace />;
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, profile, loading } = useAuthStore();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return isAdmin(profile) ? <>{children}</> : <Navigate to="/my-tasks" replace />;
};

export const TeamManagementRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, profile, loading } = useAuthStore();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return canViewTeamManagement(profile) ? <>{children}</> : <Navigate to="/my-tasks" replace />;
};
