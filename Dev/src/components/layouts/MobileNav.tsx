import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CheckSquare, Package, User } from 'lucide-react';
import { FolderKanban, TrendingUp, LayoutDashboard } from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';

export const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  const [isHidden, setIsHidden] = useState(false);
  const profile = useAuthStore(s => s.profile);
  const role = profile?.role || 'member';
  const isLeader = (profile?.employment_level || '').toLowerCase() === 'leader' || role.toLowerCase() === 'leader';
  
  // Track scroll travel logic to avoid jitter
  const travelRef = useRef(0);
  const lastYRef = useRef(0);
  
  const navItems = [
    { name: t('nav.home'), path: '/', icon: <Home size={20} strokeWidth={1.8} />, hidden: role !== 'admin' },
    { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={20} strokeWidth={1.8} /> },
    { name: 'Projects', path: '/projects', icon: <FolderKanban size={20} strokeWidth={1.8} /> },
    { name: 'Dashboard', path: '/ui-dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.8} />, isCenter: true },
    { name: t('nav.assets'), path: '/assets', icon: <Package size={20} strokeWidth={1.8} /> },
    { name: 'Profile', path: '/my-tasks', icon: <User size={20} strokeWidth={1.8} /> },
    { name: t('nav.reports'), path: '/reports', icon: <TrendingUp size={20} strokeWidth={1.8} />, hidden: !isLeader },
  ];

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      // Only process scroll events from large containers (e.g. main page areas)
      if (!target || !target.clientHeight || target.clientHeight < 300) return;

      const y = Math.max(0, target.scrollTop);
      const delta = y - lastYRef.current;
      
      if (y <= 20) {
        setIsHidden(false);
        travelRef.current = 0;
      } else {
        if (delta && Math.sign(delta) !== Math.sign(travelRef.current)) {
          travelRef.current = 0;
        }
        travelRef.current += delta;
        
        if (travelRef.current > 15 && y > 60) {
          setIsHidden(true);
          travelRef.current = 0;
        } else if (travelRef.current < -15) {
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
          height: calc(120px + env(safe-area-inset-bottom));
          background: linear-gradient(to top, rgba(255,255,255,0.85), rgba(255,255,255,0));
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          mask-image: linear-gradient(to top, #000 25%, transparent 100%);
          -webkit-mask-image: linear-gradient(to top, #000 25%, transparent 100%);
          transition: opacity 0.3s ease;
        }
        .dark .mobile-nav-mask {
          background: linear-gradient(to top, rgba(17,24,39,0.9), rgba(17,24,39,0));
        }
        .mobile-nav-container {
          max-width: 400px;
          margin: 0 auto;
          bottom: calc(24px + env(safe-area-inset-bottom));
          transform-origin: bottom center;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .mobile-nav-container.nav-hidden {
          transform: translateY(calc(100% + 40px + env(safe-area-inset-bottom)));
          opacity: 0;
          pointer-events: none;
        }
        .mobile-nav-mask.nav-hidden {
          opacity: 0;
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
          "md:hidden fixed left-4 right-4 bg-white dark:bg-slate-800 rounded-full z-[99] flex items-center justify-between p-1.5 shadow-lg border border-gray-200 dark:border-slate-700 mobile-nav-container",
          isHidden && "nav-hidden"
        )}
      >
        {navItems.filter(item => !(item as any).hidden).map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center transition-all duration-300 relative",
              (item as any).isCenter 
                ? "w-[48px] h-[48px] rounded-full bg-primary text-white shadow-lg -translate-y-2 hover:scale-105" 
                : "flex-1 h-[44px] rounded-full",
              !((item as any).isCenter) && isActive ? "text-primary bg-primary/10 dark:bg-slate-700 scale-105" : "",
              !((item as any).isCenter) && !isActive ? "text-gray-500 hover:text-primary dark:text-gray-400" : ""
            )}
          >
            {item.icon}
          </NavLink>
        ))}
      </div>
    </>
  );
};
