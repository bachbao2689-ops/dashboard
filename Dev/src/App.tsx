import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import {initializeDevicePush,resetDevicePush} from './store/devicePushStore';
import { ProtectedRoute, AdminRoute, TeamManagementRoute } from './components/auth/ProtectedRoute';
import {canViewTeamManagement} from './lib/roleScope';
import {userCache} from './lib/userCache';
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
const MainReadOnly=lazy(()=>import('./pages/MainReadOnly'));
import { useLocation } from 'react-router-dom';
import { LoadingSplashScreen } from './components/common/LoadingSplashScreen';

function RootRedirect() {
  const profile = useAuthStore(state => state.profile);
  const loading = useAuthStore(state => state.loading);
  const location = useLocation();

  if (loading) {
    return <LoadingSplashScreen message="Đang khởi tạo hệ thống..." />;
  }

  // Preserve query params if coming with project/campaign links
  if (location.search && (location.search.includes('project=') || location.search.includes('campaign='))) {
    return <Navigate to={`/workflow${location.search}`} replace />;
  }

  if (canViewTeamManagement(profile)) {
    return <Navigate to="/ui-dashboard" replace />;
  }

  // Regular staff / Nhân viên -> Profile (my-tasks)
  return <Navigate to="/my-tasks" replace />;
}

function App() {
  const initialize = useAuthStore(state => state.initialize);
  const session = useAuthStore(state => state.session);
  const profileId = useAuthStore(state => state.profile?.id);
  const authLoading = useAuthStore(state => state.loading);

  // App Startup Intro State (Plays ~3.5s cinematic logo animation before entering app)
  const [introStarted] = useState(() => Date.now());
  const [introCompleted, setIntroCompleted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleFinishIntro = useCallback(() => {
    setIsFadingOut(true);
    const fadeTimer = setTimeout(() => {
      setIntroCompleted(true);
    }, 450);
    return () => clearTimeout(fadeTimer);
  }, []);

  // Ensure minimum 3500ms for intro animation
  useEffect(() => {
    if (introCompleted) return;

    const elapsed = Date.now() - introStarted;
    const remainingTime = Math.max(0, 3500 - elapsed);

    const timer = setTimeout(() => {
      if (!useAuthStore.getState().loading) {
        handleFinishIntro();
      }
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [introCompleted, introStarted, handleFinishIntro]);

  // If auth was still loading at 3500ms, complete immediately once auth finishes
  useEffect(() => {
    if (introCompleted || authLoading) return;
    const elapsed = Date.now() - introStarted;
    if (elapsed >= 3500) {
      handleFinishIntro();
    }
  }, [authLoading, introCompleted, introStarted, handleFinishIntro]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (userId) {
      void initializeDevicePush(userId,true);
    } else resetDevicePush();
  }, [session?.user?.id, session?.access_token]);

  useEffect(() => {
    if (profileId == null) return;
    void userCache.sync(profileId);
    const refresh = () => { if (document.visibilityState === 'visible') void userCache.sync(profileId); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      userCache.cancelPending(profileId);
    };
  }, [profileId]);

  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Suspense fallback={<LoadingSplashScreen message="Đang tải dữ liệu..." />}><Routes>
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
            <Route path="overview" element={<AdminRoute><Overview /></AdminRoute>} />
            <Route path="ui-dashboard" element={<TeamManagementRoute><Dashboard /></TeamManagementRoute>} />
            <Route path="tasks" element={<TaskList />} />
            <Route path="projects" element={<Projects />} />
            <Route path="main-view" element={<MainReadOnly />} />
            <Route path="my-tasks" element={<MyTasks />} />
                        <Route path="departments-2" element={<Departments2 />} />
            <Route path="assets" element={<AssetInventory />} />
            <Route path="borrow-requests" element={<BorrowRequests />} />
            <Route path="team" element={<TeamWorkload />} />
            <Route path="reports" element={<TeamManagementRoute><Reports /></TeamManagementRoute>} />
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

      {/* Startup Intro Splash Overlay (Plays ~3.5s cinematic logo story before entering app) */}
      {!introCompleted && (
        <LoadingSplashScreen
          isIntro={true}
          isExiting={isFadingOut}
          onSkip={handleFinishIntro}
        />
      )}
    </>
  );
}

export default App;
