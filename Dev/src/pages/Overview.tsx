import React from 'react';
import { KpiCard } from '../components/common/KpiCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Bot, Download, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import { useDashboard } from '../hooks/useDashboard';

const taskStatusData = [
  { name: 'Week 1', created: 40, done: 24 },
  { name: 'Week 2', created: 30, done: 35 },
  { name: 'Week 3', created: 20, done: 28 },
  { name: 'Week 4', created: 27, done: 30 },
];

export const Overview: React.FC = () => {
  const { t } = useTranslation();
  const { data, loading } = useDashboard();

  const assetUtilization = [
    { name: t('overview.borrowed'), value: 60, fill: '#002e6d' },
    { name: 'Available', value: 35, fill: '#10b981' },
    { name: 'Maintenance', value: 5, fill: '#ef4444' },
  ];

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto z-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-md dark:bg-gray-800/40 dark:border-gray-700/50">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight dark:text-gray-100">{t('overview.welcome')}</h2>
          <p className="text-gray-500 mt-1 dark:text-gray-400">{t('overview.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors dark:bg-gray-700/60 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
            <Calendar size={16} /> {t('overview.thisMonth')} ▾
          </button>
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 text-white rounded-xl text-sm font-medium shadow-lg shadow-primary/30 transition-all">
            <Bot size={16} /> {t('overview.aiSummary')}
          </button>
          <button className="flex items-center justify-center w-10 h-10 bg-white/60 hover:bg-white border border-gray-200 rounded-xl text-gray-700 transition-colors dark:bg-gray-700/60 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t('overview.myTasks')} value={data.myTasksCount.toString()} trend={5} colorTheme="primary" />
        <KpiCard title={t('overview.dueSoon')} value={data.dueSoonCount.toString()} trend={-2} colorTheme="warning" />
        <KpiCard title={t('overview.borrowed')} value={data.borrowedCount.toString()} trend={1} colorTheme="info" />
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <p className="text-sm font-medium text-gray-500 mb-2 dark:text-gray-400">
             <span className="text-sm font-semibold text-red-600 dark:text-red-400">{t('overview.overdue')}</span>
          </p>
          <h3 className="text-4xl font-black text-gray-800 tracking-tight dark:text-gray-100">{data.overdueCount}</h3>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full dark:bg-red-900/30 dark:text-red-400">
              <AlertCircle size={14} />
              {t('overview.actionRequired')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-800 text-lg dark:text-gray-100">{t('overview.taskStatus')}</h3>
            <div className="flex items-center gap-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,46,109,0.5)]"></div>{t('overview.created')}</span>
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>{t('overview.done')}</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={taskStatusData}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#002e6d" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#002e6d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.2)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.8)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} />
                <Area type="monotone" dataKey="created" stroke="#002e6d" fillOpacity={1} fill="url(#colorCreated)" strokeWidth={3} />
                <Area type="monotone" dataKey="done" stroke="#10b981" fill="transparent" strokeDasharray="5 5" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden">
          <h3 className="font-bold text-gray-800 mb-2 absolute top-6 left-6 text-lg dark:text-gray-100">{t('overview.assetUtil')}</h3>
          <div className="flex flex-col items-center justify-center gap-6 mt-12 relative z-10">
            <div className="h-40 w-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetUtilization} innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" stroke="rgba(255,255,255,0.1)" strokeWidth={2}>
                    {assetUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.8)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-3 px-4">
              {assetUtilization.map(loc => (
                <div key={loc.name} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shadow-sm border border-white" style={{backgroundColor: loc.fill}}></div>
                    <span className="text-gray-700 font-medium dark:text-gray-300">{loc.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{loc.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="font-bold text-gray-800 mb-6 text-lg dark:text-gray-100">{t('overview.upcoming')}</h3>
          <div className="space-y-4">
            {data.upcomingTasks.length === 0 ? (
               <div className="p-4 text-center text-gray-500">No upcoming tasks!</div>
            ) : data.upcomingTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 hover:shadow-md transition-shadow dark:bg-gray-800/50 dark:border-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs shadow-inner dark:bg-gray-700 dark:text-gray-300">
                    #{task.task_ref}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                      <span className={`px-2 py-0.5 rounded-md border ${task.priority === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                        {task.priority || 'Medium'}
                      </span>
                      <span className="text-gray-500 flex items-center gap-1 dark:text-gray-400"><Clock size={12} /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs font-semibold bg-gray-100 px-3 py-1 rounded-full text-gray-600 border border-gray-200 shadow-sm dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                  👤 {task.assignee?.name || 'Unassigned'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="font-bold text-gray-800 mb-6 text-lg dark:text-gray-100">{t('overview.recentBorrow')}</h3>
          <div className="space-y-4">
            {data.recentRequests.length === 0 ? (
               <div className="p-4 text-center text-gray-500">No recent requests</div>
            ) : data.recentRequests.map((req, i) => (
              <div key={i} className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 hover:shadow-md transition-shadow flex flex-col justify-between h-full dark:bg-gray-800/50 dark:border-gray-700/50">
                <div className="mb-4">
                  <p className="text-sm text-gray-800 font-medium dark:text-gray-200">
                    <span className="font-bold text-primary">{req.requester?.name}</span> {t('overview.wantsToBorrow')} <br />
                    <span className="font-semibold">{req.asset?.name}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 dark:text-gray-400"><Clock size={12} /> {t('overview.due')}: {new Date(req.due_date).toLocaleDateString()}</p>
                </div>
                
                {req.approval_status === 'pending' ? (
                  <div className="flex gap-2 mt-auto">
                    <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors">{t('overview.approve')}</button>
                    <button className="flex-1 bg-white hover:bg-gray-50 text-gray-700 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 shadow-sm transition-colors dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">{t('overview.reject')}</button>
                  </div>
                ) : req.approval_status === 'approved' ? (
                  <div className="flex gap-2 mt-auto">
                    <button disabled className="flex-1 bg-emerald-50 text-emerald-600 border border-emerald-200 py-1.5 rounded-lg text-sm font-bold opacity-80 flex items-center justify-center gap-1 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                      <CheckCircle size={14} /> {t('overview.approved')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-auto">
                    <button disabled className="flex-1 bg-red-50 text-red-600 border border-red-200 py-1.5 rounded-lg text-sm font-bold opacity-80 flex items-center justify-center gap-1 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                      <XCircle size={14} /> Rejected
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
