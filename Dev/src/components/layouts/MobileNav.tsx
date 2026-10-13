import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CheckSquare, Package, User, Layers } from 'lucide-react';
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
  
  const canViewDashboard = ['admin', 'manager', 'leader'].includes(role.toLowerCase()) || (profile?.employment_level || '').toLowerCase() === 'leader';
  
  const navItems = [
    { name: t('nav.dashboard'), path: '/ui-dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.8} />, hidden: !canViewDashboard },
    { name: t('nav.home'), path: '/workflow', icon: <Layers size={20} strokeWidth={1.8} /> },
    { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={20} strokeWidth={1.8} /> },
    { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={20} strokeWidth={1.8} /> },
    { name: t('nav.assets'), path: '/assets', icon: <Package size={20} strokeWidth={1.8} /> },
    { name: t('nav.profile'), path: '/my-tasks', icon: <User size={20} strokeWidth={1.8} /> },
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
        html:not(.dark) .mobile-nav-mask {
          display: none !important;
        }
        .mobile-nav-mask {
          height: calc(120px + env(safe-area-inset-bottom));
          background: linear-gradient(to top, rgba(237,246,255,0.76) 0%, rgba(237,246,255,0.50) 68%, transparent 100%);
          backdrop-filter: blur(32px) saturate(165%);
          -webkit-backdrop-filter: blur(32px) saturate(165%);
          mask-image: linear-gradient(to top, #000 0%, #000 68%, transparent 100%);
          -webkit-mask-image: linear-gradient(to top, #000 0%, #000 68%, transparent 100%);
          transition: opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dark .mobile-nav-mask {
          background: linear-gradient(to top, rgba(5,18,38,0.84) 0%, rgba(5,18,38,0.58) 68%, transparent 100%);
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
      
      {/* Background Mask (Dark mode only) */}
      <div 
        className={cn(
          "hidden dark:md:hidden dark:fixed dark:bottom-0 dark:left-0 dark:right-0 pointer-events-none z-[98] mobile-nav-mask backdrop-blur-[32px] backdrop-saturate-[165%]",
          isHidden && "nav-hidden"
        )}
      />

      {/* Nav Pill */}
      <div 
        className={cn(
          "md:hidden fixed left-3 right-3 mobile-liquid-glass rounded-full z-[99] flex items-center justify-between overflow-x-auto p-1.5 mobile-nav-container backdrop-blur-xl",
          isHidden && "nav-hidden"
        )}
      >
        {navItems.filter(item => !(item as any).hidden).map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            aria-label={item.name}
            title={item.name}
            className={({ isActive }) => cn(
              'relative flex min-w-11 flex-1 shrink-0 h-11 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary',
              isActive
                ? 'bg-slate-900/[0.07] text-gray-900 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:bg-gradient-to-b dark:from-blue-500/35 dark:to-cyan-500/15 dark:!text-blue-100 dark:ring-blue-300/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_3px_10px_rgba(30,90,170,.18)]'
                : 'text-gray-600 dark:text-slate-300 hover:text-primary dark:hover:text-white'
            )}
          >
            {({ isActive }) => <>
              {item.icon}
              {isActive && <span aria-hidden="true" className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-600 dark:bg-cyan-300" />}
            </>}
          </NavLink>
        ))}
      </div>
    </>
  );
};
