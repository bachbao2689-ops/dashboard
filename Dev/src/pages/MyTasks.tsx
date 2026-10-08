import React, { useState } from 'react';

import { ProfileHeader } from '../components/features/profile/ProfileHeader';
import { ActivityTaskCard } from '../components/features/profile/ActivityTaskCard';
import { TaskDetailPanel } from '../components/features/tasks/TaskDetailPanel';
import { useAuthStore } from '../store/authStore';

export const MyTasks: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const isManager = profile?.role === 'admin' || profile?.role === 'manager' || profile?.employment_level === 'Leader';
  const role = isManager ? 'manager' : 'staff';
  const [selectedTask, setSelectedTask] = useState<any>(null);

  return (
    <div className="relative flex h-full min-h-0 min-w-0">
      <div className="min-w-0 flex-1 space-y-6 overflow-y-auto custom-scrollbar pb-6 pr-0 lg:pr-4">
        <ProfileHeader role={role} />
        <ActivityTaskCard onOpenTask={setSelectedTask} />
      </div>
      <TaskDetailPanel task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} onTaskUpdated={updated => { if (updated) setSelectedTask((current: any) => ({ ...current, ...updated })); }} />
    </div>
  );
};
