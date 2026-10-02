import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

export const DashboardLayout: React.FC = () => {
  return (
    <>
      <div className="liquid-bg-container">
        <div className="liquid-blob-1"></div>
        <div className="liquid-blob-2"></div>
        <div className="liquid-blob-3"></div>
      </div>
      
      <div className="flex h-screen bg-transparent text-gray-800">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
          <Header />
          <main className="flex-1 overflow-auto p-4 md:p-8 scrollbar-hide">
            <Outlet />
          </main>
        </div>
        <MobileNav />
      </div>
    </>
  );
};
