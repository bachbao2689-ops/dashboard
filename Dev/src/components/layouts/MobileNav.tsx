import {useOverlayStore} from '../../store/overlayStore';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { CheckSquare, Package, User, Users, Layers } from 'lucide-react';
import { FolderKanban, TrendingUp, LayoutDashboard } from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';
import {canViewTeamManagement} from '../../lib/roleScope';

export const MobileNav: React.FC<{scrollHidden?:boolean}> = ({scrollHidden=false}) => {
  const { t } = useTranslation();
  const taskDetailsOpen=useOverlayStore(state=>state.taskDetails>0);
  const isHidden=scrollHidden||taskDetailsOpen;
  const profile = useAuthStore(s => s.profile);
  const isLeader = canViewTeamManagement(profile);
  const badges = useSidebarBadges();
  
  const canViewDashboard = isLeader;
  
  const navItems = [
    { name: t('nav.dashboard'), path: '/ui-dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.8} />, hidden: !canViewDashboard },
    { name: t('nav.home'), path: '/workflow', icon: <Layers size={20} strokeWidth={1.8} />, badgeCount: badges.workflowCount },
    { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={20} strokeWidth={1.8} /> },
    { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={20} strokeWidth={1.8} />, badgeCount: badges.projectCount },
    { name: t('nav.assets'), path: '/assets', icon: <Package size={20} strokeWidth={1.8} />, badgeCount: badges.borrowCount },
    { name: t('nav.team'), path: '/team', icon: <Users size={20} strokeWidth={1.8} /> },
    { name: t('nav.profile'), path: '/my-tasks', icon: <User size={20} strokeWidth={1.8} /> },
    { name: t('nav.reports'), path: '/reports', icon: <TrendingUp size={20} strokeWidth={1.8} />, hidden: !isLeader },
  ];


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
          "hidden dark:xl:hidden dark:fixed dark:bottom-0 dark:left-0 dark:right-0 pointer-events-none z-[98] mobile-nav-mask backdrop-blur-[32px] backdrop-saturate-[165%]",
          isHidden && "nav-hidden",
          taskDetailsOpen && "nav-detail-hidden"
        )}
      />

      {/* Nav Pill */}
      <div 
        inert={isHidden}
        aria-hidden={isHidden}
        className={cn(
          "xl:hidden fixed left-3 right-3 mobile-liquid-glass rounded-full z-[99] flex items-center justify-between overflow-x-auto p-1.5 mobile-nav-container backdrop-blur-xl",
          isHidden && "nav-hidden",
          taskDetailsOpen && "nav-detail-hidden"
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
                ? 'bg-gradient-to-b from-blue-100/95 to-blue-200/70 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_3px_10px_rgba(30,90,170,.18)] ring-1 ring-blue-300/80 dark:bg-gradient-to-b dark:from-blue-500/35 dark:to-cyan-500/15 dark:!text-blue-100 dark:ring-blue-300/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_3px_10px_rgba(30,90,170,.18)]'
                : 'text-gray-600 dark:text-slate-300 hover:text-primary dark:hover:text-white'
            )}
          >
            {({ isActive }) => <>
              <div className="relative">
                {item.icon}
                {Boolean((item as any).badgeCount > 0) && (
                  item.path.includes('borrow-requests') || item.path.includes('assets') ? (
                    <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white border border-white dark:border-slate-800">
                      {(item as any).badgeCount > 99 ? '99+' : (item as any).badgeCount}
                    </span>
                  ) : (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-red-500 border border-white dark:border-slate-800" />
                  )
                )}
              </div>
              {isActive && <span aria-hidden="true" className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-600 dark:bg-cyan-300" />}
            </>}
          </NavLink>
        ))}
      </div>
    </>
  );
};
