import {MobileActionHint} from '../common/MobileActionHint';
import '../../styles/mobile-actions.css';
import '../../styles/cockpit-entrance.css';
import {useMobileChrome} from '../../hooks/useMobileChrome';
import React, { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useUiStore } from '../../store/uiStore';
import {PageErrorBoundary} from '../common/PageErrorBoundary';
import {NotificationPopupStack} from '../features/notifications/NotificationPopupStack';

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const isMobileHome = location.pathname === '/mobile-home';

  const mobileChromeHidden = useMobileChrome();
  const isSidebarCollapsed = useUiStore(state => state.isSidebarCollapsed);
  const introFinished = useUiStore(state => state.introFinished);
  const isScanMode = useUiStore(state => state.isScanMode);
  const [dockingActive, setDockingActive] = useState(false);

  useEffect(() => {
    if (!introFinished) return;
    setDockingActive(true);
    const timer = setTimeout(() => setDockingActive(false), 850);
    return () => clearTimeout(timer);
  }, [introFinished]);

  return (
    <>
      <div className="liquid-bg-container">
        <div className="liquid-blob-1"></div>
        <div className="liquid-blob-2"></div>
        <div className="liquid-blob-3"></div>
      </div>
      
      <div className="flex h-[100dvh] min-h-[100dvh] bg-transparent text-gray-800">
        {/* Left Sidebar: Collapsed (80px) or Expanded (--sidebar-width, default 272px) - Desktop only */}
        <div
          style={{ width: isSidebarCollapsed ? 80 : "var(--sidebar-width, 272px)" }}
          className={`hidden xl:block transition-[width] duration-320 ease-[cubic-bezier(0.25,1,0.5,1)] shrink-0 overflow-hidden ${!introFinished ? "cockpit-dock-waiting" : dockingActive ? "cockpit-dock-left" : ""}`}
        >
          <div className={`w-full min-w-0 ${isSidebarCollapsed ? "px-2.5" : "pl-3.5 pr-0"} py-3.5 h-full transition-[padding] duration-320 ease-[cubic-bezier(0.25,1,0.5,1)]`}>
             <Sidebar />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
          {/* Top Sidebar (Header) completely removed on mobile per brief: "- Và ko có thanh sidebar top nữa, tối ưu hiển thị nội dung cho staff." */}
          <NotificationPopupStack />
          <MobileActionHint />
          <main
            id="main-scroll-container"
            className={`dashboard-scroll-surface h-full w-full min-h-0 overflow-y-auto overflow-x-auto ${
              isScanMode || isMobileHome
                ? "px-0 pt-0 pb-0 xl:px-4 xl:pt-3 xl:pb-8"
                : "px-3 sm:px-4 pt-[calc(10px+env(safe-area-inset-top,0px))] xl:pt-3 xl:px-4 pb-[calc(100px+env(safe-area-inset-bottom,0px))] xl:pb-8"
            } relative z-0 ${!introFinished ? "cockpit-dock-waiting" : dockingActive ? "cockpit-dock-main" : ""}`}
          >
            <PageErrorBoundary>
              <Suspense fallback={<div className="p-8 animate-pulse text-gray-500" role="status">Đang tải…</div>}>
                <Outlet />
              </Suspense>
            </PageErrorBoundary>
          </main>
        </div>
        {!isMobileHome && <MobileNav scrollHidden={mobileChromeHidden || isScanMode} />}
      </div>
    </>
  );
};

export default DashboardLayout;
