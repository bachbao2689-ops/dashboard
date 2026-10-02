
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { Overview } from './pages/Overview';
import { ProjectsKanban } from './pages/ProjectsKanban';
import { TaskList } from './pages/TaskList';
import { AssetInventory } from './pages/AssetInventory';
import { BorrowRequests } from './pages/BorrowRequests';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="projects" element={<ProjectsKanban />} />
          <Route path="assets" element={<AssetInventory />} />
          <Route path="borrow-requests" element={<BorrowRequests />} />
          <Route path="*" element={
            <div className="glass-panel p-10 m-8 rounded-3xl text-center flex flex-col items-center justify-center min-h-[300px]">
              <h2 className="text-2xl font-bold text-gray-800">Module Coming Soon</h2>
              <p className="text-gray-500 mt-2">This feature is planned for the next Phase.</p>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
