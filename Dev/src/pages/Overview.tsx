import React from 'react';
import { KpiCard } from '../components/common/KpiCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Bot, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/translations';

const taskStatusData = [
  { name: 'Week 1', created: 40, done: 24 },
  { name: 'Week 2', created: 30, done: 35 },
  { name: 'Week 3', created: 20, done: 28 },
  { name: 'Week 4', created: 27, done: 30 },
];

export const Overview: React.FC = () => {
  const { t } = useTranslation();

  const assetUtilization = [
    { name: t('overview.borrowed'), value: 60, fill: '#002e6d' },
    { name: 'Available', value: 35, fill: '#10b981' },
    { name: 'Maintenance', value: 5, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-8 z-10 relative pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight dark:text-gray-100">{t('overview.welcome')}</h2>
          <p className="text-gray-500 mt-1 dark:text-gray-400">{t('overview.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white/40 hover:bg-white/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/60 shadow-sm text-sm font-medium text-gray-700 transition-colors dark:text-gray-200">
            <Calendar size={16} /> {t('overview.thisMonth')} ▾
          </button>
          <button className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary backdrop-blur-md px-4 py-2 rounded-xl border border-primary/20 shadow-sm text-sm font-medium transition-colors">
            <Bot size={16} /> {t('overview.aiSummary')}
          </button>
          <button className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl shadow-md text-sm font-medium transition-colors">
            <Download size={16} /> {t('overview.export')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title={t('overview.myTasks')} value="12" trend={5} colorTheme="primary" />
        <KpiCard title={t('overview.dueSoon')} value="5" trend={-2} colorTheme="warning" />
        <KpiCard title={t('overview.borrowed')} value="3" trend={1} colorTheme="info" />
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between h-40 relative overflow-hidden group transition-all hover:shadow-lg hover:-translate-y-1 bg-red-500/10 border-red-500/30">
           <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/20 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
           <div className="flex justify-between items-start relative z-10">
             <span className="text-sm font-semibold text-red-600 dark:text-red-400">{t('overview.overdue')}</span>
             <div className="p-1.5 rounded-xl bg-red-500/20 text-red-600 backdrop-blur-sm border border-red-500/30">
               <AlertCircle size={18} strokeWidth={2.5} />
             </div>
           </div>
           <div className="flex items-end justify-between mt-4 relative z-10">
             <h3 className="text-4xl font-bold text-red-600 tracking-tight dark:text-red-400">2</h3>
             <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-500/20 text-red-700 border border-red-500/30 animate-pulse dark:text-red-400">
               {t('overview.actionRequired')}
             </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 glass-panel p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-lg dark:text-gray-100">{t('overview.taskStatus')}</h3>
            <div className="flex gap-4 text-xs font-semibold dark:text-gray-300">
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
            {[
              { id: 'TK89', title: 'SALEKITS', priority: 'High', due: 'Oct 10', assignee: 'You', color: 'bg-orange-100 text-orange-700 border-orange-200' },
              { id: 'TK92', title: 'WEBSITE PHASE 1 RUN', priority: 'Medium', due: 'Oct 12', assignee: 'Luna', color: 'bg-blue-100 text-blue-700 border-blue-200' },
              { id: 'TK95', title: 'ECOM GUIDELINE', priority: 'Medium', due: 'Oct 15', assignee: 'Wendy', color: 'bg-blue-100 text-blue-700 border-blue-200' }
            ].map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 hover:shadow-md transition-shadow dark:bg-gray-800/50 dark:border-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs shadow-inner dark:bg-gray-700 dark:text-gray-300">
                    {task.id}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                      <span className={`px-2 py-0.5 rounded-md border ${task.color}`}>{task.priority}</span>
                      <span className="text-gray-500 flex items-center gap-1 dark:text-gray-400"><Clock size={12} /> {task.due}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs font-semibold bg-gray-100 px-3 py-1 rounded-full text-gray-600 border border-gray-200 shadow-sm dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                  👤 {task.assignee}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="font-bold text-gray-800 mb-6 text-lg dark:text-gray-100">{t('overview.recentBorrow')}</h3>
          <div className="space-y-4">
            {[
              { user: 'Bach Bao', asset: 'Lens Canon 24-70mm', due: 'Oct 12', status: 'pending' },
              { user: 'Tran Bach', asset: 'Canon 5D Mark 4', due: 'Oct 1', status: 'approved' }
            ].map((req, i) => (
              <div key={i} className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 hover:shadow-md transition-shadow flex flex-col justify-between h-full dark:bg-gray-800/50 dark:border-gray-700/50">
                <div className="mb-4">
                  <p className="text-sm text-gray-800 font-medium dark:text-gray-200">
                    <span className="font-bold text-primary">{req.user}</span> {t('overview.wantsToBorrow')} <br />
                    <span className="font-semibold">{req.asset}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 dark:text-gray-400"><Clock size={12} /> {t('overview.due')}: {req.due}</p>
                </div>
                
                {req.status === 'pending' ? (
                  <div className="flex gap-2 mt-auto">
                    <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors">{t('overview.approve')}</button>
                    <button className="flex-1 bg-white hover:bg-gray-50 text-gray-700 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 shadow-sm transition-colors dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">{t('overview.reject')}</button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-auto">
                    <button disabled className="flex-1 bg-emerald-50 text-emerald-600 border border-emerald-200 py-1.5 rounded-lg text-sm font-bold opacity-80 flex items-center justify-center gap-1 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                      <CheckCircle size={14} /> {t('overview.approved')}
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
