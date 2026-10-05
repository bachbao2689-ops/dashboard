import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const navigate = useNavigate();



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // OFFLINE DEV BYPASS
      if (email === 'admin' && password === 'admin') {
        useAuthStore.getState().devLogin(rememberMe);
        toast.success('Logged in via Offline Mode (Local Admin)');
        navigate('/');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success('Successfully logged in!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002e6d] to-[#00173d] flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/20 backdrop-blur-md bg-white/10 shadow-2xl">
        <div className="text-center mb-8">
          {isForgotPassword ? (
            <>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Cấp Lại Mật Khẩu</h1>
              <p className="text-gray-500">Yêu cầu quyền truy cập từ quản trị viên</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
              <p className="text-gray-500">Sign in to your K COFFEE dashboard</p>
            </>
          )}
        </div>

        
        {isForgotPassword ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Lock className="w-8 h-8 text-[#002e6d]" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Quên mật khẩu?</h3>
            <p className="text-gray-600 text-sm">
              Vì lý do bảo mật, vui lòng liên hệ <strong>Quản lý</strong> hoặc <strong>Admin IT</strong> để được cấp lại mật khẩu mới.
            </p>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mt-6">
              <p className="text-sm font-medium text-gray-800">Liên hệ Admin:</p>
              <a href="mailto:admin@kcoffee.com" className="text-[#002e6d] hover:underline font-bold text-lg mt-1 block">admin@kcoffee.com</a>
            </div>
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="mt-8 w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
            >
              &larr; Quay lại đăng nhập
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white/50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                placeholder="admin@kcoffee.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white/50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 bg-white text-primary focus:ring-primary/50"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <button type="button" onClick={() => setIsForgotPassword(true)} className="font-medium text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#002e6d] hover:bg-[#002e6d]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002e6d] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center">
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </span>
            )}
          </button>
        </form>
        )}
      </div>
    </div>
  );
};
