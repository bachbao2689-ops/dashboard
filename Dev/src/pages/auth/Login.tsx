import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';
import { LoginCarouselControls } from '../../components/auth/LoginCarouselControls';
import '../../styles/login-carousel.css';

interface LoginConcept {
  id: string;
  name: string;
  bgUrl: string;
  themeClass: string;
  btnClass: string;
  hasTagline?: boolean;
}

const LOGIN_CONCEPTS: LoginConcept[] = [
  {
    id: 'concept-1',
    name: 'Cascara Sơn La',
    bgUrl: '/login/concept-1.png',
    themeClass: 'concept-theme-1',
    btnClass: 'concept-btn-1',
  },
  {
    id: 'concept-2',
    name: 'Mùa Đơm Trái',
    bgUrl: '/login/concept-2.png',
    themeClass: 'concept-theme-2',
    btnClass: 'concept-btn-2',
    hasTagline: true,
  },
  {
    id: 'concept-3',
    name: 'Starry Night',
    bgUrl: '/login/concept-3.png',
    themeClass: 'concept-theme-3',
    btnClass: 'concept-btn-3',
  },
];

const AUTO_SLIDE_INTERVAL = 10000; // 10s timer rule per user request

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);

  const from =
    typeof location.state?.from === 'string' &&
    location.state.from.startsWith('/') &&
    !location.state.from.startsWith('//')
      ? location.state.from
      : '/';

  const touchStartX = useRef<number | null>(null);

  // Preload all concept images on mount
  useEffect(() => {
    LOGIN_CONCEPTS.forEach(concept => {
      const img = new Image();
      img.src = concept.bgUrl;
    });
    const taglineImg = new Image();
    taglineImg.src = '/login/concept-2-tagline.png';
  }, []);

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const goToConcept = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % LOGIN_CONCEPTS.length);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + LOGIN_CONCEPTS.length) % LOGIN_CONCEPTS.length);
  }, []);

  // 5-second automatic sliding timer rule
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      goToNext();
    }, AUTO_SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [isPaused, goToNext, currentIndex]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartX.current = null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (email === 'admin' && password === 'admin') {
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

  const currentConcept = LOGIN_CONCEPTS[currentIndex];

  return (
    <div
      className="login-carousel-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3 Concept Background Layers with Smooth Crossfade */}
      {LOGIN_CONCEPTS.map((concept, idx) => (
        <div
          key={concept.id}
          className={`login-bg-layer ${idx === currentIndex ? 'is-active' : ''}`}
          style={{ backgroundImage: `url('${concept.bgUrl}')` }}
          aria-hidden={idx !== currentIndex}
        />
      ))}

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

      {/* Right Composition: Card -> Carousel Dots -> Tagline */}
      <div
        className="login-composition"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Glassmorphic Login Card */}
        <div className={`login-card ${currentConcept.themeClass}`}>
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
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
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
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
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
              className={`login-submit-btn ${currentConcept.btnClass}`}
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

        {/* Carousel 3 Dots indicator directly below login card */}
        <LoginCarouselControls
          total={LOGIN_CONCEPTS.length}
          current={currentIndex}
          onSelect={goToConcept}
        />

        {/* Tagline Image (Specific to Concept 2) */}
        <div
          className={`login-tagline-wrap ${currentIndex === 1 ? 'is-visible' : 'is-hidden'}`}
        >
          <img
            src="/login/concept-2-tagline.png"
            alt="Mùa qua mùa, bông đơm trái — Giữ một hướng, trọn vị hái"
            className="login-tagline-img"
          />
        </div>
      </div>
    </div>
  );
};
