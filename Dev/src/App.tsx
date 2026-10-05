import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { Overview } from './pages/Overview';
import { Dashboard } from './pages/Dashboard';
import { Departments2 } from './pages/Departments2';
import { TaskList } from './pages/TaskList';
import { AssetInventory } from './pages/AssetInventory';
import { BorrowRequests } from './pages/BorrowRequests';
import { MyTasks } from './pages/MyTasks';
import { TeamWorkload } from './pages/TeamWorkload';
import { Reports } from './pages/Reports';
import { MemberManagement } from './pages/MemberManagement';
import { Projects } from './pages/Projects';

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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Overview />} />
            <Route path="ui-dashboard" element={<Dashboard />} />
            <Route path="tasks" element={<TaskList />} />
            <Route path="projects" element={<Projects />} />
            <Route path="my-tasks" element={<MyTasks />} />
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
