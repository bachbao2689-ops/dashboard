import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdmin, canViewTeamManagement } from '../../lib/roleScope';
import { LoadingSplashScreen } from '../common/LoadingSplashScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAuthStore();

  if (loading) {
    return <LoadingSplashScreen message="Đang khởi tạo hệ thống..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, profile, loading } = useAuthStore();
  if (loading) return <LoadingSplashScreen message="Đang xác thực quyền Admin..." />;
  if (!user) return <Navigate to="/login" replace />;
  return isAdmin(profile) ? <>{children}</> : <Navigate to="/my-tasks" replace />;
};

export const TeamManagementRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, profile, loading } = useAuthStore();
  if (loading) return <LoadingSplashScreen message="Đang tải bảng điều khiển..." />;
  if (!user) return <Navigate to="/login" replace />;
  return canViewTeamManagement(profile) ? <>{children}</> : <Navigate to="/my-tasks" replace />;
};
