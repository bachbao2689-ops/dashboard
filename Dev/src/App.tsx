import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { Overview } from './pages/Overview';
import { Dashboard } from './pages/Dashboard';
import { Departments2 } from './pages/Departments2';
import { TaskList } from './pages/TaskList';
import { AssetInventory } from './pages/AssetInventory';
import { BorrowRequests } from './pages/BorrowRequests';
import { MyTasks } from './pages/MyTasks';
import { Project } from './pages/Project';
import { TeamWorkload } from './pages/TeamWorkload';
import { Reports } from './pages/Reports';
import { MemberManagement } from './pages/MemberManagement';

function App() {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Overview />} />
            <Route path="ui-dashboard" element={<Dashboard />} />
            <Route path="tasks" element={<TaskList />} />
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="project" element={<Project />} />
            <Route path="departments-2" element={<Departments2 />} />
            <Route path="assets" element={<AssetInventory />} />
            <Route path="borrow-requests" element={<BorrowRequests />} />
            <Route path="team" element={<TeamWorkload />} />
            <Route path="reports" element={<Reports />} />
            <Route path="members" element={<MemberManagement />} />
            <Route path="*" element={
              <div className="glass-panel p-10 m-8 rounded-3xl text-center flex flex-col items-center justify-center min-h-[300px]">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Module Coming Soon</h2>
                <p className="text-gray-500 mt-2">This feature is planned for the next Phase.</p>
              </div>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
