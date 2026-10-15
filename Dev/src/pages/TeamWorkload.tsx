import React, { useState } from 'react';
import { useTeamWorkload } from '../hooks/useTeamWorkload';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTranslation } from '../i18n/translations';
import { useNavigate } from 'react-router-dom';
import {taskLink} from '../lib/taskTracking';
import { Users, AlertTriangle, Activity, Calendar } from 'lucide-react';

export const TeamWorkload: React.FC = () => {
  const { t } = useTranslation();
  const navigate=useNavigate();
  const { workloads, isLoading, error } = useTeamWorkload();
  const [selectedMemberId, setSelectedMemberId] = useState<string|null>(null);
  const selectedMember=workloads.find(w=>w.id===selectedMemberId);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading team workload...</div>;
  }

  const totalMembers = workloads.length;
  const totalTasks = workloads.reduce((sum, w) => sum + w.activeTasksCount, 0);
  const averageLoad = totalMembers > 0 ? (totalTasks / totalMembers).toFixed(1) : '0';
  const overloadedCount = workloads.filter(w => w.capacityPercentage > 100).length;

  const chartData = workloads.map(w => ({
    name: w.name,
    tasks: w.activeTasksCount,
    created: w.created,
    doing: w.doing,
    done: w.done,
    status: w.status
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overloaded': return '#ef4444'; // red-500
      case 'high': return '#f97316'; // orange-500
      case 'warning': return '#eab308'; // yellow-500
      default: return '#22c55e'; // green-500
    }
  };

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('workload.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('workload.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('workload.weekOf')} {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      <p className="text-xs text-gray-500">Tải ước tính: 5 công việc đang mở tương ứng 100%; chưa có dữ liệu giờ làm thực tế.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('workload.totalMembers')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMembers}</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('workload.avgTasks')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageLoad}</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('workload.overloaded')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overloadedCount}</p>
          </div>
        </div>
      </div>

      {totalMembers === 0 ? (
        <div className="glass-panel p-8 text-center text-gray-500 dark:text-gray-400 rounded-xl">
          {t('members.noMembers')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('workload.tasksPerPerson')}</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    content={({active,payload})=>active && payload?.[0] ? <div className="rounded-xl border bg-white p-3 text-xs text-gray-900 dark:bg-slate-800 dark:text-white"><b>{payload[0].payload.name}</b><p>Created: {payload[0].payload.created}</p><p>Doing: {payload[0].payload.doing}</p><p>Done: {payload[0].payload.done}</p></div> : null}
                    cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
                  />
                  <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl overflow-y-auto max-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('workload.capacityBreakdown')}</h2>
            <div className="space-y-4">
              {workloads.map(member => (
                <div 
                  key={member.id} 
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedMember?.id === member.id ? 'bg-gray-50 dark:bg-gray-800 border-blue-500' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  onClick={() => setSelectedMemberId(member.id === selectedMemberId ? null : member.id)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{member.activeTasksCount} tasks</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(member.capacityPercentage, 100)}%`,
                        backgroundColor: getStatusColor(member.status)
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span title="Ước tính 8 giờ/task, 40 giờ/tuần" className="text-xs text-gray-500 dark:text-gray-400">{member.capacityPercentage}% capacity (ước tính)</span>
                    {member.capacityPercentage >= 80 && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {t('workload.warning')}
                      </span>
                    )}
                  </div>
                  
                  {selectedMember?.id === member.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('dashboard.openTasks')}</h4>
                      {member.tasks.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.noUpcoming')}</p>
                      ) : (
                        <ul className="space-y-2">
                          {member.tasks.map(task => (
                            <li key={task.id} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#002e6d]" />
                              <button type="button" onClick={e=>{e.stopPropagation();navigate(taskLink(task.id));}} className="truncate text-left">{task.title}</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
