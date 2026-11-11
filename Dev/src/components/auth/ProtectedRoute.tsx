import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdmin, canViewTeamManagement } from '../../lib/roleScope';
import {ActionButton} from '../common/ActionButton';
import {RefreshCw,LogOut} from 'lucide-react';

const AuthLoading: React.FC<{ message: string }> = ({ message }) => (
  <div role="status" className="grid min-h-screen place-items-center bg-slate-50 text-sm text-gray-500 dark:bg-[#0b1120] dark:text-gray-400">
    <span className="grid grid-flow-col auto-cols-max items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />{message}</span>
  </div>
);

const AuthUnavailable=()=>{
  const {authError,retrySession,signOut}=useAuthStore();
  return <div role="alert" className="grid min-h-screen place-items-center bg-slate-50 p-6 text-gray-700 dark:bg-[#0b1120] dark:text-gray-200">
    <div className="grid max-w-md gap-4 text-center">
      <h1 className="text-xl font-bold text-primary dark:text-white">Chưa kết nối được hệ thống</h1>
      <p>{authError||'Chưa xác nhận được hồ sơ và quyền truy cập. Vui lòng thử lại.'}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionButton icon={<RefreshCw size={16}/>} className="rounded-xl bg-primary px-4 py-3 text-white" onClick={()=>void retrySession()}>Thử lại</ActionButton>
        <ActionButton icon={<LogOut size={16}/>} className="rounded-xl border border-gray-300 px-4 py-3 dark:border-gray-600" onClick={()=>void signOut()}>Đăng nhập lại</ActionButton>
      </div>
    </div>
  </div>;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { user,profile,loading,authError } = useAuthStore();

  if (loading) return <AuthLoading message="Đang khởi tạo hệ thống…" />;

  const searchParams = new URLSearchParams(location.search);
  const isAssetScanBypass = location.pathname === '/assets' && (searchParams.has('code') || searchParams.has('asset'));
  if((authError||user&&!profile)&&!isAssetScanBypass)return <AuthUnavailable/>;

  if (!user && !isAssetScanBypass) {
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
