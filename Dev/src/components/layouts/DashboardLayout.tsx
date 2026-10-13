import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useUiStore } from '../../store/uiStore';

export const DashboardLayout: React.FC = () => {
  const isSidebarOpen = useUiStore(state => state.isSidebarOpen);

  return (
    <>
      <div className="liquid-bg-container">
        <div className="liquid-blob-1"></div>
        <div className="liquid-blob-2"></div>
        <div className="liquid-blob-3"></div>
      </div>
      
      <div className="flex h-[100dvh] min-h-[100dvh] bg-transparent text-gray-800">
        <div className={`hidden md:flex transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[272px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          <div className="w-[272px] flex-shrink-0 pl-4 py-4 pr-0 h-full">
             <Sidebar />
          </div>
        </div>
        <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden isolate">
          <Header />
          <main id="main-scroll-container" className="dashboard-scroll-surface h-full w-full min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 pt-[calc(60px+env(safe-area-inset-top,0px))] md:pt-[76px] pb-[calc(112px+env(safe-area-inset-bottom,0px))] md:pb-8 relative z-0">
            <Outlet />
          </main>
        </div>
        <MobileNav />
      </div>
    </>
  );
};
