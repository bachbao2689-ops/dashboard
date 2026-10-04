import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar as RechartsBar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, PieChart, Pie } from 'recharts';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Clock, Mail, Plus, Search, Shuffle, Users, Zap, Camera, Laptop, KeyRound,
} from 'lucide-react';

/* Design tokens shared with the Dashboard tab */
const INK = 'text-gray-900 dark:text-white';
const MUTED = 'text-gray-500 dark:text-gray-400';
const LINK = 'text-blue-600 dark:text-blue-400';
const PANEL = 'bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-slate-800 dark:border-slate-700';
const INNER = 'border border-gray-200 dark:border-slate-700';
const LABEL = 'text-sm font-semibold text-gray-500 dark:text-gray-400';

type Dept = 'ecommerce' | 'design' | 'all';
type Tab = 'overview' | 'projects' | 'capacity' | 'timeline' | 'resources';
type Status = 'ok' | 'risk' | 'overdue';

interface Project {
  id: string; name: string; dept: Dept; platform: string; manager: string; budget: number; spent: number;
  done: number; total: number; status: Status; due: string; members: string[];
  breakdown: { label: string; done: number; total: number }[];
  milestones: { label: string; date: string; state: 'done' | 'next' | 'todo' }[];
  start: number; len: number; progress: number; delayDays: number;
}

const PROJECTS: Project[] = [
  { id: 'p1', name: 'Campaign tháng 10', dept: 'ecommerce', platform: 'ECOMMERCE', manager: 'Louis', budget: 50, spent: 33, done: 20, total: 30, status: 'risk', due: 'Oct 15', members: ['Luna', 'Wendy'],
    breakdown: [{ label: 'Design', done: 8, total: 10 }, { label: 'Content', done: 7, total: 8 }, { label: 'Dev', done: 5, total: 12 }],
    milestones: [{ label: 'Concept', date: 'Sep 25', state: 'done' }, { label: 'Launch', date: 'Oct 15', state: 'next' }, { label: 'Review', date: 'Oct 30', state: 'todo' }],
    start: 0, len: 62, progress: 67, delayDays: 0 },
  { id: 'p2', name: 'Website Launch', dept: 'ecommerce', platform: 'WEB', manager: 'Louis', budget: 48, spent: 11, done: 7, total: 30, status: 'overdue', due: 'Overdue', members: ['Bach', 'Tran'],
    breakdown: [{ label: 'Design', done: 6, total: 9 }, { label: 'Dev', done: 1, total: 15 }, { label: 'QA', done: 0, total: 6 }],
    milestones: [{ label: 'Wireframe', date: 'Sep 10', state: 'done' }, { label: 'Beta', date: 'Oct 05', state: 'next' }, { label: 'Go-live', date: 'Oct 28', state: 'todo' }],
    start: 0, len: 92, progress: 23, delayDays: 3 },
  { id: 'p3', name: 'ECOM Redesign', dept: 'ecommerce', platform: 'APP', manager: 'Tran', budget: 30, spent: 25, done: 11, total: 22, status: 'risk', due: 'Nov 02', members: ['Luna', 'Tran'],
    breakdown: [{ label: 'Planning', done: 6, total: 6 }, { label: 'Design', done: 4, total: 8 }, { label: 'Dev', done: 1, total: 8 }],
    milestones: [{ label: 'Planning', date: 'Sep 20', state: 'done' }, { label: 'Execution', date: 'Oct 20', state: 'next' }, { label: 'Handover', date: 'Nov 02', state: 'todo' }],
    start: 22, len: 78, progress: 50, delayDays: 5 },
  { id: 'p4', name: 'Campaign tháng 8', dept: 'ecommerce', platform: 'SOCIAL', manager: 'Louis', budget: 20, spent: 9, done: 12, total: 16, status: 'ok', due: 'Oct 20', members: ['Wendy', 'Bach'],
    breakdown: [{ label: 'Design', done: 5, total: 6 }, { label: 'Content', done: 7, total: 10 }],
    milestones: [{ label: 'Brief', date: 'Sep 30', state: 'done' }, { label: 'Publish', date: 'Oct 20', state: 'next' }],
    start: 10, len: 55, progress: 75, delayDays: 0 },
  { id: 'p5', name: 'Brand Identity 2026', dept: 'design', platform: 'BRAND', manager: 'Luna', budget: 35, spent: 14, done: 9, total: 24, status: 'ok', due: 'Nov 10', members: ['Luna', 'Mai'],
    breakdown: [{ label: 'Logo', done: 4, total: 6 }, { label: 'Guideline', done: 5, total: 18 }],
    milestones: [{ label: 'Moodboard', date: 'Oct 02', state: 'done' }, { label: 'Final', date: 'Nov 10', state: 'todo' }],
    start: 15, len: 70, progress: 38, delayDays: 0 },
  { id: 'p6', name: 'Packaging Q4', dept: 'design', platform: 'PRINT', manager: 'Mai', budget: 18, spent: 16, done: 5, total: 14, status: 'overdue', due: 'Overdue', members: ['Mai'],
    breakdown: [{ label: 'Concept', done: 5, total: 7 }, { label: 'Production', done: 0, total: 7 }],
    milestones: [{ label: 'Concept', date: 'Sep 28', state: 'done' }, { label: 'Print', date: 'Oct 08', state: 'next' }],
    start: 5, len: 50, progress: 36, delayDays: 4 },
];

const MEMBERS = [
  { name: 'Luna', role: 'Designer', dept: 'ecommerce' as Dept, assigned: 12, cap: 15 },
  { name: 'Wendy', role: 'Dev', dept: 'ecommerce' as Dept, assigned: 18, cap: 12 },
  { name: 'Bach', role: 'Content', dept: 'ecommerce' as Dept, assigned: 8, cap: 10 },
  { name: 'Tran', role: 'PM', dept: 'ecommerce' as Dept, assigned: 6, cap: 8 },
  { name: 'Mai', role: 'Designer', dept: 'design' as Dept, assigned: 14, cap: 14 },
  { name: 'Hana', role: 'Designer', dept: 'design' as Dept, assigned: 5, cap: 12 },
];

const PLATFORM_DIST = [
  { label: 'Web', pct: 45, color: '#153454' }, { label: 'App', pct: 25, color: '#3789f4' },
  { label: 'Social', pct: 20, color: '#45a894' }, { label: 'Other', pct: 10, color: '#a8b7cc' },
];

const STATUS_STYLE: Record<Status, { dot: string; text: string; label: string }> = {
  ok: { dot: 'bg-emerald-600', text: 'text-emerald-600', label: 'On track' },
  risk: { dot: 'bg-amber-400', text: 'text-amber-500', label: 'At risk' },
  overdue: { dot: 'bg-red-500', text: 'text-red-500', label: 'Overdue' },
};

const barColor = (pct: number) => (pct > 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-400' : 'bg-teal-500');

const Bar: React.FC<{ pct: number; color?: string }> = ({ pct, color }) => (
  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
    <div className={`h-full rounded-full ${color ?? 'bg-gray-900 dark:bg-sky-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
  </div>
);

const Kpi: React.FC<{ value: string; label: string; tone?: string; icon?: React.ReactNode }> = ({ value, label, tone, icon }) => (
  <div className={`${INNER} rounded-[14px] px-4 py-3 bg-gray-50 dark:bg-none flex flex-col gap-1`}>
    <span className={LABEL}>{label}</span>
    <span className={`flex items-center gap-1.5 text-2xl font-bold leading-none ${tone ?? INK}`}>{icon}{value}</span>
  </div>
);

export const Departments2: React.FC = () => {
  const [dept, setDept] = useState<Dept>('ecommerce');
  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [members, setMembers] = useState(MEMBERS);

  const projects = useMemo(() => PROJECTS.filter(p => dept === 'all' || p.dept === dept), [dept]);
  const team = useMemo(() => members.filter(m => dept === 'all' || m.dept === dept), [members, dept]);

  const totals = useMemo(() => {
    const tasks = projects.reduce((s, p) => s + p.total, 0);
    const done = projects.reduce((s, p) => s + p.done, 0);
    const overdue = projects.filter(p => p.status === 'overdue').length * 6 + projects.filter(p => p.status === 'risk').length * 2;
    return { active: projects.length, tasks, overdue, health: Math.round((done / Math.max(tasks, 1)) * 100), ontime: dept === 'design' ? 84 : 92, members: team.length };
  }, [projects, team, dept]);

  
  const statusData = useMemo(() => [
    { name: 'On track', value: projects.filter(p => p.status === 'ok').length, fill: '#279561' },
    { name: 'At risk', value: projects.filter(p => p.status === 'risk').length, fill: '#f5a524' },
    { name: 'Overdue', value: projects.filter(p => p.status === 'overdue').length, fill: '#d9435a' },
  ].filter(d => d.value > 0), [projects]);

  const capacityData = useMemo(() => team.map(m => ({
    name: m.name,
    load: Math.round((m.assigned / m.cap) * 100)
  })), [team]);

  const progressData = useMemo(() => [...projects].sort((a,b)=>b.progress-a.progress).slice(0, 5).map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    progress: p.progress,
    fill: p.status === 'ok' ? '#153454' : p.status === 'risk' ? '#f5a524' : '#d9435a'
  })), [projects]);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) &&
    (platform === 'All' || p.platform === platform) &&
    (statusFilter === 'all' || p.status === statusFilter));

  const rebalance = (from: string) => {
    const target = [...team].filter(m => m.name !== from).sort((a, b) => a.assigned / a.cap - b.assigned / b.cap)[0];
    if (!target) return;
    setMembers(ms => ms.map(m => m.name === from ? { ...m, assigned: m.assigned - 2 } : m.name === target.name ? { ...m, assigned: m.assigned + 2 } : m));
    toast.success(`Task reassigned from ${from} to ${target.name}`);
  };

  const TABS: [Tab, string][] = [['overview', 'Overview'], ['projects', 'Projects'], ['capacity', 'Team Capacity'], ['timeline', 'Timeline'], ['resources', 'Resources & Budget']];
  const DEPTS: [Dept, string][] = [['ecommerce', 'E-Commerce'], ['design', 'Design'], ['all', 'All Depts']];
  const title = DEPTS.find(d => d[0] === dept)![1].toUpperCase();

  return (
    <div className="w-full space-y-4 font-sans">
      {/* Header */}
      <div className={`${PANEL} px-5 py-4 flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <span className={LABEL}>Team Management</span>
          <h1 className={`text-xl font-bold leading-tight ${INK}`}>{title} TEAM</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`${INNER} rounded-[10px] p-0.5 flex bg-gray-50 dark:bg-slate-900`}>
            {DEPTS.map(([k, l]) => (
              <button key={k} onClick={() => setDept(k)}
                className={`px-3 py-1.5 rounded-[8px] text-sm font-semibold transition-colors ${dept === k ? 'bg-gray-900 text-white dark:bg-sky-500' : `${MUTED} hover:text-gray-900 dark:hover:text-white`}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => toast.success('New project draft created')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-gray-900 dark:bg-sky-500 text-white text-sm font-semibold hover:opacity-90">
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`${PANEL} px-5 pt-2`}>
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative py-2.5 text-sm font-semibold whitespace-nowrap ${tab === k ? INK : MUTED}`}>
              {l}
              <span className={`absolute left-0 right-0 -bottom-px h-[3px] rounded-full bg-gray-900 dark:bg-sky-400 transition-opacity ${tab === k ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className={`${PANEL} p-5`}>
            <p className={`${LABEL} mb-3`}>Executive Summary</p>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Kpi value={String(totals.active)} label="Active Proj" />
              <Kpi value={String(totals.tasks)} label="Tasks Total" />
              <Kpi value={String(totals.overdue)} label="Overdue" tone="text-red-500" icon={<AlertTriangle size={18} />} />
              <Kpi value={`${totals.health}%`} label="Health Score" />
              <Kpi value={`${totals.ontime}%`} label="On-time Rate" tone="text-emerald-600" />
              <Kpi value={String(totals.members)} label="Members" icon={<Users size={18} />} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className={`${PANEL} p-5 xl:col-span-2`}>
              <div className="flex items-center justify-between mb-4">
                <p className={LABEL}>Project Progress</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressData} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6f84a1', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6f84a1', fontSize: 11 }} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#153454', borderRadius: '10px', color: '#fff', border: 'none', fontSize: '12px' }} />
                    <RechartsBar dataKey="progress" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {progressData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </RechartsBar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${PANEL} p-5`}>
              <p className={`${LABEL} mb-3`}>Project Health</p>
              <div className="h-40 relative mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#153454', borderRadius: '10px', color: '#fff', border: 'none', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className={`text-xl font-black ${INK}`}>{projects.length}</span>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-6">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs font-semibold"><i className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />{d.name} ({d.value})</div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className={`${PANEL} p-5`}>
              <p className={`${LABEL} mb-3`}>Team Workload Map</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capacityData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide domain={[0, 'dataMax + 20']} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#153454', fontSize: 12, fontWeight: 600 }} width={60} />
                    <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ backgroundColor: '#153454', borderRadius: '10px', color: '#fff', border: 'none', fontSize: '12px' }} />
                    <RechartsBar dataKey="load" radius={[0, 4, 4, 0]} barSize={20}>
                      {capacityData.map((d, i) => (
                        <Cell key={i} fill={d.load > 100 ? '#d9435a' : d.load > 85 ? '#f5a524' : '#45a894'} />
                      ))}
                    </RechartsBar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${PANEL} p-5`}>
              <div className="flex items-center gap-2 mb-4"><Zap size={15} className="text-amber-500" /><p className={LABEL}>Quick Actions</p></div>
              <div className="space-y-2">
                {[
                  { icon: <Shuffle size={16} className="text-amber-500" />, label: 'Auto-balance capacity', sub: 'Wendy is overloaded (150%)', action: () => toast.success('Rebalancing workload') },
                  { icon: <Mail size={16} className="text-blue-500" />, label: 'Email overdue reminders', sub: '2 projects are late', action: () => toast.success('Emails sent') },
                  { icon: <CheckCircle2 size={16} className="text-emerald-600" />, label: 'Approve pending requests', sub: '5 items pending', action: () => toast.success('Requests approved') },
                ].map(a => (
                  <button key={a.label} onClick={a.action} className={`w-full ${INNER} rounded-[12px] p-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors`}>
                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center shrink-0">{a.icon}</div>
                    <div className="flex-1"><p className={`text-sm font-bold ${INK}`}>{a.label}</p><p className={`text-xs ${MUTED}`}>{a.sub}</p></div>
                    <ChevronRight size={16} className={MUTED} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJECTS */}
      {tab === 'projects' && (
        <div className="space-y-4">
          <div className={`${PANEL} px-4 py-3 flex flex-wrap items-center gap-3`}>
            <div className={`${INNER} rounded-[10px] flex items-center gap-2 px-3 py-1.5 flex-1 min-w-[180px]`}>
              <Search size={14} className={MUTED} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className={`bg-transparent outline-none text-sm w-full ${INK}`} />
            </div>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className={`bg-white dark:bg-slate-700 ${INNER} rounded-[10px] px-3 py-1.5 text-sm font-semibold ${INK} outline-none`}>
              {['All', ...Array.from(new Set(PROJECTS.map(p => p.platform)))].map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | Status)} className={`bg-white dark:bg-slate-700 ${INNER} rounded-[10px] px-3 py-1.5 text-sm font-semibold ${INK} outline-none`}>
              <option value="all">Status: All</option><option value="ok">On track</option><option value="risk">At risk</option><option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map(p => (
              <div key={p.id} className={`${PANEL} p-5 space-y-3`}>
                <div className="flex justify-between items-start">
                  <h3 className={`text-base font-bold ${INK}`}>{p.name}</h3>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_STYLE[p.status].text}`}><i className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[p.status].dot}`} />{STATUS_STYLE[p.status].label}</span>
                </div>
                <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${MUTED}`}>
                  <span>Platform: <b className={INK}>{p.platform}</b></span><span>Manager: <b className={INK}>{p.manager}</b></span><span>Budget: <b className={INK}>₫{p.budget}M</b></span>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className={MUTED}>Progress</span><span className={`font-bold ${INK}`}>{Math.round(p.done / p.total * 100)}% ({p.done}/{p.total} tasks done)</span></div>
                  <Bar pct={p.done / p.total * 100} />
                </div>
                <div className={`${INNER} rounded-[12px] p-3 space-y-1.5`}>
                  <p className={LABEL}>Tasks Breakdown</p>
                  {p.breakdown.map(b => (
                    <div key={b.label} className="flex items-center gap-2 text-sm">
                      <span className={`w-16 ${INK}`}>{b.label}</span>
                      <div className="flex-1"><Bar pct={b.done / b.total * 100} color={b.done / b.total < 0.5 ? 'bg-amber-400' : 'bg-teal-500'} /></div>
                      <span className={`w-10 text-right font-semibold ${INK}`}>{b.done}/{b.total}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {p.milestones.map(m => (
                    <span key={m.label} className={`${INNER} rounded-full px-2.5 py-1 font-semibold ${m.state === 'done' ? 'text-emerald-600' : m.state === 'next' ? 'text-amber-500' : MUTED}`}>
                      {m.state === 'done' ? '✅' : m.state === 'next' ? '⏳' : '🔜'} {m.label} ({m.date})
                    </span>
                  ))}
                </div>
                <div className="flex gap-4 pt-1 text-sm font-semibold">
                  <button className={LINK} onClick={() => toast('Opening tasks…')}>View All Tasks</button>
                  <button className={LINK} onClick={() => setTab('capacity')}>Manage Team</button>
                  <button className={LINK} onClick={() => setTab('timeline')}>Timeline View</button>
                </div>
              </div>
            ))}
            {!filtered.length && <div className={`${PANEL} p-10 text-center text-sm ${MUTED} xl:col-span-2`}>No projects match your filters.</div>}
          </div>
        </div>
      )}

      {/* CAPACITY */}
      {tab === 'capacity' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className={`${PANEL} p-5 xl:col-span-2`}>
            <p className={`${LABEL} mb-3`}>Team Capacity</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className={`text-left ${MUTED} text-xs uppercase tracking-wider`}>
                  <th className="pb-2 font-bold">Member</th><th className="pb-2 font-bold">Role</th><th className="pb-2 font-bold">Assigned</th><th className="pb-2 font-bold w-1/4">Load</th><th className="pb-2 font-bold">Health</th><th />
                </tr></thead>
                <tbody>
                  {team.map(m => {
                    const pct = (m.assigned / m.cap) * 100;
                    const over = m.assigned > m.cap;
                    return (
                      <tr key={m.name} className={`border-t ${INNER} border-x-0 border-b-0`}>
                        <td className={`py-2.5 font-bold ${INK}`}>{m.name}</td>
                        <td className={MUTED}>{m.role}</td>
                        <td className={`font-semibold ${INK}`}>{m.assigned}/{m.cap}</td>
                        <td className="pr-3"><Bar pct={pct} color={barColor(pct)} /></td>
                        <td className={`font-semibold ${over ? 'text-red-500' : 'text-emerald-600'}`}>{over ? '● OVERLOAD' : '● OK'}</td>
                        <td className="text-right">{over && <button onClick={() => rebalance(m.name)} className={`text-xs font-semibold ${LINK}`}>Rebalance</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={`${INNER} rounded-[12px] p-3 mt-4 flex items-center gap-2 text-sm ${INK}`}>
              <Clock size={14} className="text-amber-500" /><b>Forecast next week:</b> Dự kiến nhận 8 task mới → Cần phân bổ thêm 2 người
            </div>
          </div>
          <div className={`${PANEL} p-5`}>
            <p className={`${LABEL} mb-3`}>Task Distribution by Platform</p>
            <div className="space-y-3">
              {PLATFORM_DIST.map(d => (
                <div key={d.label}>
                  <div className="flex justify-between text-sm mb-1"><span className={INK}>{d.label}</span><span className={`font-bold ${INK}`}>{d.pct}%</span></div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700"><div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE */}
      {tab === 'timeline' && (
        <div className={`${PANEL} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <p className={LABEL}>Timeline View</p>
            <span className={`text-xs ${MUTED}`}>Zoom: Week</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-y-3 items-center">
            <span />
            <div className={`grid grid-cols-4 text-xs font-semibold ${MUTED}`}>{['Oct 8', 'Oct 15', 'Oct 22', 'Oct 29'].map(d => <span key={d}>{d}</span>)}</div>
            {projects.map(p => (
              <React.Fragment key={p.id}>
                <span className={`text-sm font-bold ${INK}`}>{p.name}</span>
                <div className="relative h-6 rounded-md bg-gray-100 dark:bg-slate-900">
                  <div className={`absolute top-0 h-6 rounded-md ${p.status === 'overdue' ? 'bg-red-500/25' : 'bg-gray-900/15 dark:bg-sky-400/20'}`} style={{ left: `${p.start}%`, width: `${p.len}%` }} />
                  <div className={`absolute top-0 h-6 rounded-md ${p.status === 'overdue' ? 'bg-red-500' : 'bg-gray-900 dark:bg-sky-400'}`} style={{ left: `${p.start}%`, width: `${p.len * p.progress / 100}%` }} />
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className={`flex gap-5 mt-5 text-xs ${MUTED}`}>
            <span className="flex items-center gap-1.5"><i className="w-3 h-2 rounded bg-gray-900" />Active</span>
            <span className="flex items-center gap-1.5"><i className="w-3 h-2 rounded bg-gray-900/20" />Remaining</span>
            <span className="flex items-center gap-1.5"><i className="w-3 h-2 rounded bg-red-500" />Delayed</span>
          </div>
        </div>
      )}

      {/* RESOURCES */}
      {tab === 'resources' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: <Camera size={16} />, title: 'Camera', name: 'Canon 5D', state: 'Borrowed', note: 'Due: Oct 12', tone: 'text-amber-500' },
              { icon: <Laptop size={16} />, title: 'Computers', name: 'MacBook Pro', state: 'Available', note: '2 available', tone: 'text-emerald-600' },
              { icon: <KeyRound size={16} />, title: 'Software', name: 'Photoshop', state: 'License OK', note: 'Exp: Dec 2026', tone: 'text-emerald-600' },
            ].map(r => (
              <div key={r.title} className={`${PANEL} p-5`}>
                <div className={`flex items-center gap-2 ${LABEL}`}>{r.icon}{r.title}</div>
                <p className={`mt-3 text-base font-bold ${INK}`}>{r.name}</p>
                <p className={`text-sm font-semibold ${r.tone}`}>● {r.state}</p>
                <p className={`text-xs ${MUTED}`}>{r.note}</p>
              </div>
            ))}
          </div>
          <div className={`${PANEL} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <p className={LABEL}>Budget Tracking</p>
              <button onClick={() => toast.success('Export started')} className={`text-sm font-semibold ${LINK}`}>Export</button>
            </div>
            <div className="space-y-4">
              {projects.map(p => {
                const pct = Math.round((p.spent / p.budget) * 100);
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-semibold ${INK}`}>{p.name}</span>
                      <span className={`font-bold ${pct >= 80 ? 'text-amber-500' : INK}`}>{pct}% used (₫{p.spent}M/₫{p.budget}M){pct >= 80 && ' ⚠️'}</span>
                    </div>
                    <Bar pct={pct} color={barColor(pct)} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => toast('Opening budget report…')} className={`${INNER} rounded-[10px] px-3 py-2 text-sm font-semibold ${INK}`}>View Budget Report</button>
              <button onClick={() => toast.success('Funds request submitted')} className={`${INNER} rounded-[10px] px-3 py-2 text-sm font-semibold ${INK}`}>Request Additional Funds</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
