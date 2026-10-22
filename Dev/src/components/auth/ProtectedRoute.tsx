import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdmin, canViewTeamManagement } from '../../lib/roleScope';

const AuthLoading: React.FC<{ message: string }> = ({ message }) => (
  <div role="status" className="grid min-h-screen place-items-center bg-slate-50 text-sm text-gray-500 dark:bg-[#0b1120] dark:text-gray-400">
    <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />{message}</span>
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAuthStore();

  if (loading) return <AuthLoading message="Đang khởi tạo hệ thống…" />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, profile, loading } = useAuthStore();
  if (loading) return <AuthLoading message="Đang xác thực quyền Admin…" />;
  if (!user) return <Navigate to="/login" replace />;
  return isAdmin(profile) ? <>{children}</> : <Navigate to="/my-tasks" replace />;
};

export const TeamManagementRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, profile, loading } = useAuthStore();
  if (loading) return <AuthLoading message="Đang tải bảng điều khiển…" />;
  if (!user) return <Navigate to="/login" replace />;
  return canViewTeamManagement(profile) ? <>{children}</> : <Navigate to="/my-tasks" replace />;
};
