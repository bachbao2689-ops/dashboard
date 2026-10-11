import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Package, User } from 'lucide-react';
import { FolderKanban, TrendingUp, LayoutDashboard } from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';

export const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  const [isHidden, setIsHidden] = useState(false);
  const location = useLocation();
  const profile = useAuthStore(s => s.profile);
  const role = profile?.role || 'member';
  const isLeader = (profile?.employment_level || '').toLowerCase() === 'leader' || ['leader', 'manager', 'admin'].includes(role.toLowerCase());
  
  // Track scroll travel logic to avoid jitter
  const travelRef = useRef(0);
  const lastYRef = useRef(0);
  const scrollTargetRef = useRef<EventTarget | null>(null);
  
  const navItems = [
    { name: t('nav.home'), path: '/', icon: <Home size={20} strokeWidth={1.8} />, hidden: role !== 'admin' },
    { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={20} strokeWidth={1.8} /> },
    { name: 'Projects', path: '/projects', icon: <FolderKanban size={20} strokeWidth={1.8} /> },
    { name: 'Dashboard', path: '/ui-dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.8} /> },
    { name: t('nav.assets'), path: '/assets', icon: <Package size={20} strokeWidth={1.8} /> },
    { name: 'Profile', path: '/my-tasks', icon: <User size={20} strokeWidth={1.8} /> },
    { name: t('nav.reports'), path: '/reports', icon: <TrendingUp size={20} strokeWidth={1.8} />, hidden: !isLeader },
  ];

  useEffect(() => {
    setIsHidden(false);
    travelRef.current = 0;
    lastYRef.current = 0;
    scrollTargetRef.current = null;
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      // Only process scroll events from large containers (e.g. main page areas)
      if (!target || !target.clientHeight || target.clientHeight < 300) return;

      const y = Math.max(0, target.scrollTop);
      if (target !== scrollTargetRef.current) {
        scrollTargetRef.current = target;
        lastYRef.current = y;
        travelRef.current = 0;
        return;
      }
      const delta = y - lastYRef.current;
      
      if (y <= 20) {
        setIsHidden(false);
        travelRef.current = 0;
      } else {
        if (delta && Math.sign(delta) !== Math.sign(travelRef.current)) {
          travelRef.current = 0;
        }
        travelRef.current += delta;
        
        if (travelRef.current > 32 && y > 80) {
          setIsHidden(true);
          travelRef.current = 0;
        } else if (travelRef.current < -24) {
          setIsHidden(false);
          travelRef.current = 0;
        }
      }
      lastYRef.current = y;
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  return (
    <>
      <style>{`
        .mobile-nav-mask {
          height: calc(104px + env(safe-area-inset-bottom));
          background: linear-gradient(to top, rgba(237,246,255,0.66), rgba(237,246,255,0));
          backdrop-filter: blur(18px) saturate(155%);
          -webkit-backdrop-filter: blur(18px) saturate(155%);
          mask-image: linear-gradient(to top, #000 18%, transparent 100%);
          -webkit-mask-image: linear-gradient(to top, #000 18%, transparent 100%);
          transition: opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dark .mobile-nav-mask {
          background: linear-gradient(to top, rgba(5,18,38,0.7), rgba(5,18,38,0));
        }
        .mobile-nav-container {
          max-width: 440px;
          margin: 0 auto;
          bottom: calc(16px + env(safe-area-inset-bottom));
          transform-origin: bottom center;
          will-change: transform, opacity;
          transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .mobile-nav-container.nav-hidden {
          transform: translateY(calc(100% + 40px + env(safe-area-inset-bottom)));
          opacity: 0;
          pointer-events: none;
        }
        .mobile-nav-mask.nav-hidden {
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-nav-container, .mobile-nav-mask { transition-duration: 0.01ms; }
        }
      `}</style>
      
      {/* Background Mask */}
      <div 
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 pointer-events-none z-[98] mobile-nav-mask",
          isHidden && "nav-hidden"
        )}
      />

      {/* Nav Pill */}
      <div 
        className={cn(
          "md:hidden fixed left-3 right-3 mobile-liquid-glass rounded-full z-[99] flex items-center justify-between p-1.5 mobile-nav-container",
          isHidden && "nav-hidden"
        )}
      >
        {navItems.filter(item => !(item as any).hidden).map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            aria-label={item.name}
            title={item.name}
            className="flex min-w-0 flex-1 h-11 items-center justify-center rounded-full text-gray-600 dark:text-slate-300 hover:text-primary dark:hover:text-white focus-visible:outline-2 focus-visible:outline-primary transition-colors"
          >
            {item.icon}
          </NavLink>
        ))}
      </div>
    </>
  );
};
