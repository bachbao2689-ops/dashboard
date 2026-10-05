import toast from "react-hot-toast";
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { Calendar, Bot, Download, CheckCircle, Clock, AlertCircle, XCircle, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import { useDashboard } from '../hooks/useDashboard';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

/* Shared design tokens (same as Dashboard / Departments 2) */
const INK = 'text-gray-900 dark:text-white';
const MUTED = 'text-gray-500 dark:text-gray-400';
const LINK = 'text-blue-600 dark:text-blue-400';
const PANEL = 'bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-slate-800 dark:border-slate-700';
const INNER = 'border border-gray-200 dark:border-slate-700';
const LABEL = 'text-xs font-bold tracking-[0.12em] uppercase text-gray-500 dark:text-gray-400';

const Ring: React.FC<{ pct: number; color: string; size?: number; track: string }> = ({ pct, color, size = 60, track }) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(pct, 100) / 100)} />
    </svg>
  );
};

const Trend: React.FC<{ v: number }> = ({ v }) => (
  <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${v >= 0 ? 'text-emerald-600 bg-emerald-600/10' : 'text-red-500 bg-red-500/10'}`}>
    {v >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{v >= 0 ? '+' : ''}{v}%
  </span>
);

export const Overview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useDashboard();
  const theme = useUiStore(state => state.theme);
  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.id === 'dev-admin-id' || user?.user_metadata?.role === 'admin';
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin';

  const [dateRange, setDateRange] = useState('');

  useEffect(() => {
    const el = document.getElementById('overview-date-range');
    const handleChange = (e: any) => setDateRange(e.target.value);
    el?.addEventListener('change', handleChange);
    return () => el?.removeEventListener('change', handleChange);
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    await supabase.from('borrow_requests').update({ approval_status: status }).eq('id', id);
    refetch();
    toast.success('Request updated');
  };

  const openCal = (e: React.MouseEvent) => {
    // @ts-ignore
    if (window.openCalendar) {
      // @ts-ignore
      window.openCalendar({ displayId: 'overview-date-range', mode: 'range' }, e);
    }
  };

  const assetUtilization = data.assetStatusData;

  /* Tasks due per day for the next 7 days */
  const weekData = useMemo(() => {
    const days: { name: string; count: number; today: boolean }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i);
      const real = data.tasks.filter(tk => tk.status !== 'done' && tk.due_date && new Date(tk.due_date).toDateString() === d.toDateString()).length;
      days.push({ name: d.toLocaleDateString('en-US', { weekday: 'short' }), count: real, today: i === 0 });
    }
    return days;
  }, [data.upcomingTasks]);

  const taskStatusData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((3 - index) * 7 + 6));
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((3 - index) * 7));
      const inWeek = (task: any) => new Date(task.created_at || task.start_date || 0) >= start && new Date(task.created_at || task.start_date || 0) <= end;
      return { name: `W${index + 1}`, created: data.tasks.filter(inWeek).length, done: data.tasks.filter(task => task.status === 'done' && inWeek(task)).length };
    });
  }, [data.tasks]);
  const created = data.tasks.length;
  const done = data.tasks.filter(task => task.status === 'done').length;
  const donePct = created ? Math.round((done / created) * 100) : 0;
  const pendingApprovals = data.recentRequests.filter(r => r.approval_status === 'pending').length;

  const grid = isDark ? '#334155' : '#e8eef8';
  const axis = isDark ? '#94a3b8' : '#6f84a1';
  const ringTrack = isDark ? '#334155' : '#eef3fb';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#093570', borderRadius: 10, border: 'none', color: '#fff', fontSize: 12, padding: '6px 10px',
  };

  if (loading) {
    return <div className={`p-8 text-center ${MUTED}`}>Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-4 w-full z-10 relative font-sans">
      {error && (
        <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-500/30 flex items-center gap-2">
          <AlertCircle size={16} />
          <span className="text-xs font-semibold">Running in Offline/Dev Mode: {error}</span>
        </div>
      )}

      {/* Header */}
      <div className={`${PANEL} px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${INK}`}>{t('overview.welcome')} {userName} 👋</h2>
          <p className={`text-sm mt-0.5 ${MUTED}`}>{t('overview.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${MUTED}`} />
            <input
              type="text" id="overview-date-range" readOnly onClick={openCal}
              value={dateRange || t('overview.thisMonth')}
              className={`pl-8 pr-7 py-2 w-44 bg-white dark:bg-slate-800 ${INNER} rounded-[10px] text-xs font-semibold ${INK} cursor-pointer outline-none text-center`}
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${MUTED}`}>▾</span>
          </div>
          <button className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 dark:bg-sky-500 hover:opacity-90 text-white rounded-[10px] text-xs font-semibold transition-opacity">
            <Bot size={14} /> {t('overview.aiSummary')}
          </button>
          <button className={`flex items-center justify-center w-9 h-9 bg-white dark:bg-slate-800 ${INNER} rounded-[10px] ${INK} hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors`}>
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* KPI row – each card is clickable and has a mini visual */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <button onClick={() => navigate('/my-tasks')} className={`${PANEL} p-4 text-left flex items-center justify-between gap-3 hover:shadow-md transition-shadow`}>
          <div className="space-y-1.5">
            <p className={LABEL}>{t('overview.myTasks')}</p>
            <p className={`text-4xl font-bold leading-none ${INK}`}>{data.myTasksCount}</p>
            <Trend v={5} />
          </div>
          <div className="relative grid place-items-center">
            <Ring pct={donePct} color="#093570" track={ringTrack} />
            <span className={`absolute text-xs font-bold ${INK}`}>{donePct}%</span>
          </div>
        </button>

        <button onClick={() => navigate('/tasks')} className={`${PANEL} p-4 text-left flex items-center justify-between gap-3 hover:shadow-md transition-shadow`}>
          <div className="space-y-1.5">
            <p className={LABEL}>{t('overview.dueSoon')}</p>
            <p className={`text-4xl font-bold leading-none ${INK}`}>{data.dueSoonCount}</p>
            <Trend v={-2} />
          </div>
          <div className="flex items-end gap-1 h-[60px]">
            {weekData.slice(0, 5).map((d, i) => (
              <i key={i} className="w-2 rounded-t bg-amber-400" style={{ height: `${Math.max(d.count, 0.4) / 5 * 100}%`, opacity: 0.4 + i * 0.15 }} />
            ))}
          </div>
        </button>

        <button onClick={() => navigate('/borrow-requests')} className={`${PANEL} p-4 text-left flex items-center justify-between gap-3 hover:shadow-md transition-shadow`}>
          <div className="space-y-1.5">
            <p className={LABEL}>{t('overview.borrowed')}</p>
            <p className={`text-4xl font-bold leading-none ${INK}`}>{data.borrowedCount}</p>
            <Trend v={1} />
          </div>
          <div className="relative grid place-items-center">
            <Ring pct={60} color="#3789f4" track={ringTrack} />
            <span className={`absolute text-xs font-bold ${INK}`}>60%</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/tasks')}
          className={`p-4 text-left rounded-[18px] border flex items-center justify-between gap-3 hover:shadow-md transition-shadow ${
            data.overdueCount > 0
              ? 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30'
              : `bg-white dark:bg-slate-800 ${INNER}`
          }`}
        >
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-red-500">{t('overview.overdue')}</p>
            <p className="text-4xl font-bold leading-none text-red-500">{data.overdueCount}</p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
              <AlertCircle size={12} /> {t('overview.actionRequired')}
            </span>
          </div>
          <ChevronRight size={22} className="text-red-500/60" />
        </button>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`${PANEL} p-5 xl:col-span-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <p className={LABEL}>{t('overview.taskStatus')}</p>
              <p className={`text-sm mt-1 ${INK}`}>
                <b className="text-2xl">{donePct}%</b> <span className={MUTED}>completed · {done}/{created} tasks</span>
              </p>
            </div>
            <div className={`flex items-center gap-4 text-xs font-semibold ${MUTED}`}>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-sky-400" />{t('overview.created')}</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-teal-500" />{t('overview.done')}</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={taskStatusData} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? '#38bdf8' : '#093570'} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={isDark ? '#38bdf8' : '#093570'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: axis, fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: axis, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="created" stroke={isDark ? '#38bdf8' : '#093570'} fill="url(#colorCreated)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="done" stroke="#45a894" fill="transparent" strokeDasharray="5 5" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${PANEL} p-5 flex flex-col`}>
          <p className={LABEL}>{t('overview.upcoming')}</p>
          <p className={`text-sm mt-1 ${MUTED}`}>Tasks due per day</p>
          <div className="h-40 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ left: -28, right: 4, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: axis, fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: axis, fontSize: 11 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: isDark ? '#1e293b' : '#f3f7fd' }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {weekData.map((d, i) => (
                    <Cell key={i} fill={d.today ? '#d9435a' : d.count >= 4 ? '#f5a524' : isDark ? '#38bdf8' : '#093570'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={`flex gap-3 mt-2 text-[10px] font-semibold ${MUTED}`}>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-red-500" />Today</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-amber-500" />Heavy</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-gray-900 dark:bg-sky-400" />Normal</span>
          </div>
        </div>
      </div>

      {/* Bottom row: only what needs action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Most urgent tasks */}
        <div className={`${PANEL} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <p className={LABEL}>Most urgent</p>
            <button onClick={() => navigate('/tasks')} className={`text-xs font-semibold ${LINK} flex items-center gap-0.5`}>All <ChevronRight size={12} /></button>
          </div>
          <div className="space-y-2">
            {data.upcomingTasks.length === 0 ? (
              <div className={`py-6 text-center text-sm ${MUTED}`}>No upcoming tasks!</div>
            ) : data.upcomingTasks.slice(0, 3).map(task => (
              <div key={task.id} className={`${INNER} rounded-[12px] px-3 py-2.5 flex items-center gap-3`}>
                <i className={`w-1.5 self-stretch rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${INK}`}>{task.title}</p>
                  <p className={`text-xs flex items-center gap-1 ${MUTED}`}>
                    <Clock size={11} /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'} · {task.assignee?.name || 'Unassigned'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asset utilisation */}
        <div className={`${PANEL} p-5`}>
          <p className={`${LABEL} mb-3`}>{t('overview.assetUtil')}</p>
          <div className="flex items-center gap-4">
            <div className="h-28 w-28 shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetUtilization} innerRadius={34} outerRadius={52} paddingAngle={3} dataKey="value" stroke="none">
                    {assetUtilization.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <span className={`text-lg font-bold ${INK}`}>60%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {assetUtilization.map(a => (
                <div key={a.name} className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${INK}`}><i className="w-2.5 h-2.5 rounded-full" style={{ background: a.fill }} />{a.name}</span>
                  <b className={INK}>{a.value}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Approvals */}
        <div className={`${PANEL} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <p className={LABEL}>{t('overview.recentBorrow')}</p>
            {pendingApprovals > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">{pendingApprovals} pending</span>
            )}
          </div>
          <div className="space-y-2">
            {data.recentRequests.length === 0 ? (
              <div className={`py-6 text-center text-sm ${MUTED}`}>No recent requests</div>
            ) : data.recentRequests.slice(0, 2).map((req, i) => (
              <div key={i} className={`${INNER} rounded-[12px] p-3`}>
                <p className={`text-sm ${INK}`}>
                  <b>{req.requester?.name}</b> {t('overview.wantsToBorrow')} <b>{req.asset?.name}</b>
                </p>
                <p className={`text-xs mt-0.5 flex items-center gap-1 ${MUTED}`}><Clock size={11} /> {t('overview.due')}: {new Date(req.due_date).toLocaleDateString()}</p>
                {req.approval_status === 'pending' && isAdmin ? (
                  <div className="flex gap-2 mt-2.5">
                    <button onClick={() => handleUpdateStatus(req.id, 'approved')} className="flex-1 bg-emerald-600 hover:opacity-90 text-white py-1.5 rounded-[8px] text-xs font-semibold transition-opacity">{t('overview.approve')}</button>
                    <button onClick={() => handleUpdateStatus(req.id, 'rejected')} className={`flex-1 bg-white dark:bg-slate-700 ${INNER} ${INK} py-1.5 rounded-[8px] text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors`}>{t('overview.reject')}</button>
                  </div>
                ) : req.approval_status === 'approved' ? (
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle size={13} /> {t('overview.approved')}</p>
                ) : req.approval_status === 'pending' ? (
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-600"><Clock size={13} /> Đang chờ duyệt</p>
                ) : (
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-red-500"><XCircle size={13} /> Rejected</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
