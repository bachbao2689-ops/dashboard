import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';
import '../../styles/login-carousel.css';

interface LoginConcept {
  bgUrl: string;
  themeClass: string;
  btnClass: string;
}

const LOGIN_CONCEPT: LoginConcept = {
  bgUrl: '/login/concept-2.png',
  themeClass: 'concept-theme-2',
  btnClass: 'concept-btn-2',
};

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);

  const from =
    typeof location.state?.from === 'string' &&
    location.state.from.startsWith('/') &&
    !location.state.from.startsWith('//')
      ? location.state.from
      : '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Offline local dev mode: only allowed in local development on localhost/127.0.0.1
      if (
        import.meta.env.DEV &&
        (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) &&
        email === 'admin' &&
        password === 'admin'
      ) {
        useAuthStore.getState().devLogin(rememberMe);
        toast.success('Logged in via Offline Mode (Local Admin)');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success('Successfully logged in!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="login-carousel-page">
      <div
        className="login-bg-layer is-active"
        style={{ backgroundImage: `url('${LOGIN_CONCEPT.bgUrl}')` }}
        aria-hidden="true"
      />

      {/* Brand Marks */}
      <img
        src="/login-logo.svg"
        alt="Logo K Coffee"
        className="login-brand-logo"
      />
      <img
        src="/login-30.svg"
        alt="3 Không"
        className="login-brand-badge"
      />

      {/* Single retained login screen: Mùa Đơm Trái */}
      <div className="login-composition">
        {/* Glassmorphic Login Card */}
        <div className={`login-card ${LOGIN_CONCEPT.themeClass}`}>
          <div className="text-center mb-7">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight drop-shadow-lg">
              Welcome Back
            </h1>
            <p className="text-xs md:text-sm text-gray-200 font-medium drop-shadow-md">
              Sign in to your K COFFEE dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-bold text-white mb-2 drop-shadow-md"
              >
                Email Address
              </label>
              <div className="login-input-wrap">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-white/80" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="login-input-field"
                  placeholder="admin@kcoffee.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-white mb-2 drop-shadow-md"
              >
                Password
              </label>
              <div className="login-input-wrap">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-white/80" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="login-input-field"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div
                className="flex items-center group cursor-pointer"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/50 bg-black/30 text-blue-500 focus:ring-white/50 cursor-pointer transition-colors"
                  onClick={e => e.stopPropagation()}
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2.5 block text-xs text-gray-200 font-semibold cursor-pointer group-hover:text-white transition-colors drop-shadow-md"
                >
                  Remember me
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`login-submit-btn ${LOGIN_CONCEPT.btnClass}`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2 drop-shadow-md">
                  <LogIn className="w-4 h-4" />
                  SIGN IN
                </span>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
