import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import {syncPush} from './services/pushNotifications';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
const Login=lazy(()=>import('./pages/auth/Login').then(module=>({default:module.Login})));
const Register=lazy(()=>import('./pages/auth/Register').then(module=>({default:module.Register})));
import { DashboardLayout } from './components/layouts/DashboardLayout';
const Overview=lazy(()=>import('./pages/Overview').then(module=>({default:module.Overview})));
const WorkflowManagement=lazy(()=>import('./pages/WorkflowManagement').then(module=>({default:module.WorkflowManagement})));
const Dashboard=lazy(()=>import('./pages/Dashboard').then(module=>({default:module.Dashboard})));
const Departments2=lazy(()=>import('./pages/Departments2').then(module=>({default:module.Departments2})));
const TaskList=lazy(()=>import('./pages/TaskList').then(module=>({default:module.TaskList})));
const AssetInventory=lazy(()=>import('./pages/AssetInventory').then(module=>({default:module.AssetInventory})));
const BorrowRequests=lazy(()=>import('./pages/BorrowRequests').then(module=>({default:module.BorrowRequests})));
const MyTasks=lazy(()=>import('./pages/MyTasks').then(module=>({default:module.MyTasks})));
const TeamWorkload=lazy(()=>import('./pages/TeamWorkload').then(module=>({default:module.TeamWorkload})));
const Reports=lazy(()=>import('./pages/Reports').then(module=>({default:module.Reports})));
const MemberManagement=lazy(()=>import('./pages/MemberManagement').then(module=>({default:module.MemberManagement})));
const Projects=lazy(()=>import('./pages/Projects').then(module=>({default:module.Projects})));
import { useLocation } from 'react-router-dom';

function RootRedirect() {
  const profile = useAuthStore(state => state.profile);
  const loading = useAuthStore(state => state.loading);
  const location = useLocation();

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  // Preserve query params if coming with project/campaign links
  if (location.search && (location.search.includes('project=') || location.search.includes('campaign='))) {
    return <Navigate to={`/workflow${location.search}`} replace />;
  }

  const role = (profile?.role || '').toLowerCase();
  const level = (profile?.employment_level || '').toLowerCase();
  const isLeader = role === 'leader' || level === 'leader';
  const isAdminOrManager = ['admin', 'manager'].includes(role) || ['admin', 'manager'].includes(level);

  if (isLeader || isAdminOrManager) {
    return <Navigate to="/ui-dashboard" replace />;
  }

  // Regular staff / Nhân viên -> Profile (my-tasks)
  return <Navigate to="/my-tasks" replace />;
}

function App() {
  const initialize = useAuthStore(state => state.initialize);
  const session=useAuthStore(state=>state.session);

  useEffect(() => {
    initialize();
  }, [initialize]);
  useEffect(()=>{if(session?.user.id)void syncPush(session.user.id).catch(()=>{});},[session?.user.id,session?.access_token]);

  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Suspense fallback={<div className="p-8 animate-pulse text-gray-500" role="status">Đang tải…</div>}><Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<RootRedirect />} />
            <Route path="workflow" element={<WorkflowManagement />} />
            <Route path="workflow-management-2" element={<Navigate to="/workflow" replace />} />
            <Route path="overview" element={<Overview />} />
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
        </Routes></Suspense>
      </BrowserRouter>
    </>
  );
}

export default App;
