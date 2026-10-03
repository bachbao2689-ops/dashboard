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
      
      <div className="flex h-screen bg-transparent text-gray-800">
        <div className={`hidden md:flex transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          <div className="w-72 flex-shrink-0 p-4 h-full">
             <Sidebar />
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
          <Header />
          <main id="main-scroll-container" className="flex-1 overflow-auto px-4 md:px-8 pt-4 md:pt-8 pb-4 scrollbar-hide relative">
            <Outlet />
          </main>
        </div>
        <MobileNav />
      </div>
    </>
  );
};
