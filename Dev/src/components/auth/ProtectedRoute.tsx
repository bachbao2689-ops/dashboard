import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
