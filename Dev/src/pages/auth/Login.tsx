import React, { useState, useEffect } from 'react';
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
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // OFFLINE DEV BYPASS
      if (email === 'admin' && password === 'admin') {
        useAuthStore.getState().devLogin(rememberMe);
        toast.success('Logged in via Offline Mode (Local Admin)');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: `url('/bg-login-new.png')` }}
    >
      {/* Logos */}
      <img src="/login-logo.svg" alt="Logo K Coffee" className="absolute top-10 left-1/2 -translate-x-1/2 md:top-12 md:left-12 md:translate-x-0 w-40 md:w-64 drop-shadow-xl z-0" />
      <img src="/login-30.svg" alt="3 Không" className="absolute bottom-10 left-1/2 -translate-x-1/2 md:bottom-12 md:left-12 md:translate-x-0 w-48 md:w-64 drop-shadow-xl z-0" />

      {/* Login Box */}
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-[8%] lg:right-[10%] w-[90%] max-w-[420px] md:max-w-none md:w-[520px] lg:w-[580px] p-8 md:p-10 lg:p-14 rounded-[2.5rem] border border-white/30 backdrop-blur-2xl bg-gradient-to-br from-white/20 via-white/10 to-transparent shadow-[0_32px_80px_-15px_rgba(0,0,0,0.5)] z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight drop-shadow-lg">Welcome Back</h1>
          <p className="text-sm md:text-base text-gray-200 font-medium drop-shadow-md">Sign in to your K COFFEE dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 md:space-y-7">
          <div>
            <label className="block text-sm font-bold text-white mb-3 drop-shadow-md">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-white/70" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-14 pr-5 py-4 text-base border border-white/50 rounded-2xl bg-white/20 text-white placeholder-white/60 italic font-light focus:outline-none focus:ring-2 focus:ring-white/70 focus:bg-white/30 shadow-inner backdrop-blur-md transition-all duration-300"
                placeholder="admin@kcoffee.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-3 drop-shadow-md">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-white/70" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-14 pr-5 py-4 text-base border border-white/50 rounded-2xl bg-white/20 text-white placeholder-white/60 italic font-light focus:outline-none focus:ring-2 focus:ring-white/70 focus:bg-white/30 shadow-inner backdrop-blur-md transition-all duration-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center group cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-5 w-5 rounded-md border-white/50 bg-black/30 text-blue-500 focus:ring-white/50 cursor-pointer transition-colors"
                onClick={(e) => e.stopPropagation()}
              />
              <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-200 font-bold cursor-pointer group-hover:text-white transition-colors drop-shadow-md">
                Remember me
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-4 px-4 border border-white/20 rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] text-base font-extrabold text-white tracking-widest uppercase bg-gradient-to-r from-[#193266] to-[#0d1a36] hover:from-[#21438a] hover:to-[#152a56] focus:outline-none focus:ring-2 focus:ring-white/50 hover:-translate-y-1 active:translate-y-0 active:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
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
              <span className="flex items-center drop-shadow-md">
                <LogIn className="w-5 h-5 mr-3" />
                SIGN IN
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
