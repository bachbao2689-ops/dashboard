import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Clock, Mail, Plus, Search, Shuffle, Users, Zap, Camera, Laptop, KeyRound,
} from 'lucide-react';

/* Design tokens shared with the Dashboard tab */
const INK = 'text-[#153454] dark:text-slate-100';
const MUTED = 'text-[#6f84a1] dark:text-slate-400';
const LINK = 'text-[#3789f4] dark:text-sky-400';
const PANEL =
  'bg-white border border-[#e0eaf8] rounded-[18px] shadow-[0_3px_15px_rgba(9,47,102,0.02)] min-w-0 dark:bg-slate-800 dark:border-slate-700 dark:shadow-none';
const INNER = 'border border-[#e0eaf8] dark:border-slate-700';
const LABEL = `text-[10px] font-bold tracking-[0.12em] uppercase ${MUTED}`;

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
  ok: { dot: 'bg-[#279561]', text: 'text-[#279561]', label: 'On track' },
  risk: { dot: 'bg-amber-400', text: 'text-amber-500', label: 'At risk' },
  overdue: { dot: 'bg-[#d9435a]', text: 'text-[#d9435a]', label: 'Overdue' },
};

const barColor = (pct: number) => (pct > 100 ? 'bg-[#d9435a]' : pct >= 85 ? 'bg-amber-400' : 'bg-[#45a894]');

const Bar: React.FC<{ pct: number; color?: string }> = ({ pct, color }) => (
  <div className="h-1.5 rounded-full bg-[#eef3fb] dark:bg-slate-700 overflow-hidden">
    <div className={`h-full rounded-full ${color ?? 'bg-[#153454] dark:bg-sky-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
  </div>
);

const Kpi: React.FC<{ value: string; label: string; tone?: string; icon?: React.ReactNode }> = ({ value, label, tone, icon }) => (
  <div className={`${INNER} rounded-[14px] px-4 py-3 bg-[radial-gradient(ellipse_at_100%_110%,#eaf3ff_0%,transparent_55%)] dark:bg-none flex flex-col gap-1`}>
    <span className={LABEL}>{label}</span>
    <span className={`flex items-center gap-1.5 text-[26px] font-bold leading-none ${tone ?? INK}`}>{icon}{value}</span>
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
    <div className="dashboard-scale w-full space-y-4 font-sans">
      {/* Header */}
      <div className={`${PANEL} px-5 py-4 flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <span className={LABEL}>Team Management</span>
          <h1 className={`text-[22px] font-bold leading-tight ${INK}`}>{title} TEAM</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`${INNER} rounded-[10px] p-0.5 flex bg-[#f6f9fe] dark:bg-slate-900`}>
            {DEPTS.map(([k, l]) => (
              <button key={k} onClick={() => setDept(k)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors ${dept === k ? 'bg-[#153454] text-white dark:bg-sky-500' : `${MUTED} hover:text-[#153454] dark:hover:text-white`}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => toast.success('New project draft created')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[#153454] dark:bg-sky-500 text-white text-[12px] font-semibold hover:opacity-90">
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`${PANEL} px-5 pt-2`}>
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative py-2.5 text-[13px] font-semibold whitespace-nowrap ${tab === k ? INK : MUTED}`}>
              {l}
              <span className={`absolute left-0 right-0 -bottom-px h-[3px] rounded-full bg-[#153454] dark:bg-sky-400 transition-opacity ${tab === k ? 'opacity-100' : 'opacity-0'}`} />
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
              <Kpi value={String(totals.overdue)} label="Overdue" tone="text-[#d9435a]" icon={<AlertTriangle size={18} />} />
              <Kpi value={`${totals.health}%`} label="Health Score" />
              <Kpi value={`${totals.ontime}%`} label="On-time Rate" tone="text-[#279561]" />
              <Kpi value={String(totals.members)} label="Members" icon={<Users size={18} />} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className={`${PANEL} p-5 xl:col-span-2`}>
              <p className={`${LABEL} mb-3`}>Priority Projects (Top 4)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...projects].sort((a, b) => (a.status === 'overdue' ? -1 : 0) - (b.status === 'overdue' ? -1 : 0)).slice(0, 4).map(p => (
                  <div key={p.id} className={`${INNER} rounded-[14px] p-4 space-y-2.5`}>
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[14px] font-bold ${INK}`}>{p.name}</span>
                      <span className={`text-[12px] font-bold ${INK}`}>{p.progress}%</span>
                    </div>
                    <Bar pct={p.progress} />
                    <div className="flex justify-between text-[11px]">
                      <span className={`flex items-center gap-1.5 font-semibold ${STATUS_STYLE[p.status].text}`}>
                        <i className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[p.status].dot}`} />{p.status === 'overdue' ? 'Overdue' : `Due ${p.due}`}
                      </span>
                      <span className={MUTED}>{p.members.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${PANEL} p-5`}>
              <p className={`${LABEL} mb-3`}>Alerts · Manager Action Needed</p>
              <ul className="space-y-2.5 text-[12.5px]">
                <li className={`flex items-center gap-2 ${INK}`}><AlertTriangle size={15} className="text-amber-500 shrink-0" />{projects.filter(p => p.status !== 'ok').length} projects at risk of delay</li>
                <li className={`flex items-center gap-2 ${INK}`}><span className="w-3.5 h-3.5 rounded-full bg-[#d9435a] shrink-0" />{totals.overdue} tasks overdue (2 urgent)</li>
                <li className={`flex items-center gap-2 ${INK}`}><CheckCircle2 size={15} className={`${LINK} shrink-0`} />5 pending approvals</li>
              </ul>
              <button className={`mt-4 text-[12px] font-semibold ${LINK} flex items-center gap-1`} onClick={() => setTab('projects')}>View All Alerts <ChevronRight size={13} /></button>
            </div>
          </div>

          {/* Command Center */}
          <div className={`${PANEL} p-5`}>
            <div className="flex items-center gap-2 mb-3"><Zap size={15} className="text-amber-500" /><p className={LABEL}>Command Center · Manager Only</p></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className={`${INNER} rounded-[14px] p-4`}>
                <p className={`text-[12px] font-bold mb-2 ${INK}`}>Alerts (Realtime)</p>
                <ul className={`space-y-2 text-[12px] ${INK}`}>
                  <li>⚠️ Wendy over capacity (18/12)</li>
                  <li>⚠️ Campaign tháng 8 overdue risk (3 tasks)</li>
                  <li>⚠️ Canon 5D borrowed &gt; 14 days</li>
                </ul>
                <button onClick={() => rebalance('Wendy')} className={`mt-3 text-[11px] font-semibold ${LINK}`}>Redistribute →</button>
              </div>
              <div className={`${INNER} rounded-[14px] p-4`}>
                <p className={`text-[12px] font-bold mb-2 ${INK}`}>Prediction Engine</p>
                <ul className="space-y-2 text-[12px]">
                  {PROJECTS.filter(p => p.dept === 'ecommerce').map(p => (
                    <li key={p.id} className="flex justify-between">
                      <span className={INK}>{p.name}</span>
                      <span className={p.delayDays ? 'text-[#d9435a] font-semibold' : 'text-[#279561] font-semibold'}>{p.delayDays ? `${p.delayDays} days late` : 'On time ✓'}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`${INNER} rounded-[14px] p-4 space-y-2`}>
                <p className={`text-[12px] font-bold mb-1 ${INK}`}>Quick Decisions</p>
                {[
                  { icon: <CheckCircle2 size={14} />, label: 'Approve all pending requests', sub: '12 items', msg: '12 requests approved' },
                  { icon: <Shuffle size={14} />, label: 'Auto-balance team capacity', sub: 'Save 2hrs/day', msg: 'Team capacity rebalanced' },
                  { icon: <Mail size={14} />, label: 'Email overdue reminders', sub: '5 members affected', msg: 'Reminders sent to 5 members' },
                ].map(a => (
                  <button key={a.label} onClick={() => toast.success(a.msg)}
                    className={`w-full ${INNER} rounded-[10px] px-3 py-2 flex items-center gap-2 text-left text-[12px] font-semibold ${INK} hover:bg-[#f6f9fe] dark:hover:bg-slate-700 transition-colors`}>
                    {a.icon}<span className="flex-1">{a.label}</span><span className={`text-[10.5px] font-medium ${MUTED}`}>{a.sub}</span>
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
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className={`bg-transparent outline-none text-[12px] w-full ${INK}`} />
            </div>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className={`bg-white dark:bg-slate-700 ${INNER} rounded-[10px] px-3 py-1.5 text-[12px] font-semibold ${INK} outline-none`}>
              {['All', ...Array.from(new Set(PROJECTS.map(p => p.platform)))].map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | Status)} className={`bg-white dark:bg-slate-700 ${INNER} rounded-[10px] px-3 py-1.5 text-[12px] font-semibold ${INK} outline-none`}>
              <option value="all">Status: All</option><option value="ok">On track</option><option value="risk">At risk</option><option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map(p => (
              <div key={p.id} className={`${PANEL} p-5 space-y-3`}>
                <div className="flex justify-between items-start">
                  <h3 className={`text-[15px] font-bold ${INK}`}>{p.name}</h3>
                  <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${STATUS_STYLE[p.status].text}`}><i className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[p.status].dot}`} />{STATUS_STYLE[p.status].label}</span>
                </div>
                <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] ${MUTED}`}>
                  <span>Platform: <b className={INK}>{p.platform}</b></span><span>Manager: <b className={INK}>{p.manager}</b></span><span>Budget: <b className={INK}>₫{p.budget}M</b></span>
                </div>
                <div>
                  <div className="flex justify-between text-[11.5px] mb-1"><span className={MUTED}>Progress</span><span className={`font-bold ${INK}`}>{Math.round(p.done / p.total * 100)}% ({p.done}/{p.total} tasks done)</span></div>
                  <Bar pct={p.done / p.total * 100} />
                </div>
                <div className={`${INNER} rounded-[12px] p-3 space-y-1.5`}>
                  <p className={LABEL}>Tasks Breakdown</p>
                  {p.breakdown.map(b => (
                    <div key={b.label} className="flex items-center gap-2 text-[12px]">
                      <span className={`w-16 ${INK}`}>{b.label}</span>
                      <div className="flex-1"><Bar pct={b.done / b.total * 100} color={b.done / b.total < 0.5 ? 'bg-amber-400' : 'bg-[#45a894]'} /></div>
                      <span className={`w-10 text-right font-semibold ${INK}`}>{b.done}/{b.total}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {p.milestones.map(m => (
                    <span key={m.label} className={`${INNER} rounded-full px-2.5 py-1 font-semibold ${m.state === 'done' ? 'text-[#279561]' : m.state === 'next' ? 'text-amber-500' : MUTED}`}>
                      {m.state === 'done' ? '✅' : m.state === 'next' ? '⏳' : '🔜'} {m.label} ({m.date})
                    </span>
                  ))}
                </div>
                <div className="flex gap-4 pt-1 text-[12px] font-semibold">
                  <button className={LINK} onClick={() => toast('Opening tasks…')}>View All Tasks</button>
                  <button className={LINK} onClick={() => setTab('capacity')}>Manage Team</button>
                  <button className={LINK} onClick={() => setTab('timeline')}>Timeline View</button>
                </div>
              </div>
            ))}
            {!filtered.length && <div className={`${PANEL} p-10 text-center text-[13px] ${MUTED} xl:col-span-2`}>No projects match your filters.</div>}
          </div>
        </div>
      )}

      {/* CAPACITY */}
      {tab === 'capacity' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className={`${PANEL} p-5 xl:col-span-2`}>
            <p className={`${LABEL} mb-3`}>Team Capacity</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead><tr className={`text-left ${MUTED} text-[10.5px] uppercase tracking-wider`}>
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
                        <td className={`font-semibold ${over ? 'text-[#d9435a]' : 'text-[#279561]'}`}>{over ? '● OVERLOAD' : '● OK'}</td>
                        <td className="text-right">{over && <button onClick={() => rebalance(m.name)} className={`text-[11px] font-semibold ${LINK}`}>Rebalance</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={`${INNER} rounded-[12px] p-3 mt-4 flex items-center gap-2 text-[12px] ${INK}`}>
              <Clock size={14} className="text-amber-500" /><b>Forecast next week:</b> Dự kiến nhận 8 task mới → Cần phân bổ thêm 2 người
            </div>
          </div>
          <div className={`${PANEL} p-5`}>
            <p className={`${LABEL} mb-3`}>Task Distribution by Platform</p>
            <div className="space-y-3">
              {PLATFORM_DIST.map(d => (
                <div key={d.label}>
                  <div className="flex justify-between text-[12px] mb-1"><span className={INK}>{d.label}</span><span className={`font-bold ${INK}`}>{d.pct}%</span></div>
                  <div className="h-2 rounded-full bg-[#eef3fb] dark:bg-slate-700"><div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} /></div>
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
            <span className={`text-[11px] ${MUTED}`}>Zoom: Week</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-y-3 items-center">
            <span />
            <div className={`grid grid-cols-4 text-[11px] font-semibold ${MUTED}`}>{['Oct 8', 'Oct 15', 'Oct 22', 'Oct 29'].map(d => <span key={d}>{d}</span>)}</div>
            {projects.map(p => (
              <React.Fragment key={p.id}>
                <span className={`text-[12px] font-bold ${INK}`}>{p.name}</span>
                <div className="relative h-6 rounded-md bg-[#f3f7fd] dark:bg-slate-900">
                  <div className={`absolute top-0 h-6 rounded-md ${p.status === 'overdue' ? 'bg-[#d9435a]/25' : 'bg-[#153454]/15 dark:bg-sky-400/20'}`} style={{ left: `${p.start}%`, width: `${p.len}%` }} />
                  <div className={`absolute top-0 h-6 rounded-md ${p.status === 'overdue' ? 'bg-[#d9435a]' : 'bg-[#153454] dark:bg-sky-400'}`} style={{ left: `${p.start}%`, width: `${p.len * p.progress / 100}%` }} />
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className={`flex gap-5 mt-5 text-[11px] ${MUTED}`}>
            <span className="flex items-center gap-1.5"><i className="w-3 h-2 rounded bg-[#153454]" />Active</span>
            <span className="flex items-center gap-1.5"><i className="w-3 h-2 rounded bg-[#153454]/20" />Remaining</span>
            <span className="flex items-center gap-1.5"><i className="w-3 h-2 rounded bg-[#d9435a]" />Delayed</span>
          </div>
        </div>
      )}

      {/* RESOURCES */}
      {tab === 'resources' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: <Camera size={16} />, title: 'Camera', name: 'Canon 5D', state: 'Borrowed', note: 'Due: Oct 12', tone: 'text-amber-500' },
              { icon: <Laptop size={16} />, title: 'Computers', name: 'MacBook Pro', state: 'Available', note: '2 available', tone: 'text-[#279561]' },
              { icon: <KeyRound size={16} />, title: 'Software', name: 'Photoshop', state: 'License OK', note: 'Exp: Dec 2026', tone: 'text-[#279561]' },
            ].map(r => (
              <div key={r.title} className={`${PANEL} p-5`}>
                <div className={`flex items-center gap-2 ${LABEL}`}>{r.icon}{r.title}</div>
                <p className={`mt-3 text-[15px] font-bold ${INK}`}>{r.name}</p>
                <p className={`text-[12px] font-semibold ${r.tone}`}>● {r.state}</p>
                <p className={`text-[11.5px] ${MUTED}`}>{r.note}</p>
              </div>
            ))}
          </div>
          <div className={`${PANEL} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <p className={LABEL}>Budget Tracking</p>
              <button onClick={() => toast.success('Export started')} className={`text-[12px] font-semibold ${LINK}`}>Export</button>
            </div>
            <div className="space-y-4">
              {projects.map(p => {
                const pct = Math.round((p.spent / p.budget) * 100);
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-[12.5px] mb-1">
                      <span className={`font-semibold ${INK}`}>{p.name}</span>
                      <span className={`font-bold ${pct >= 80 ? 'text-amber-500' : INK}`}>{pct}% used (₫{p.spent}M/₫{p.budget}M){pct >= 80 && ' ⚠️'}</span>
                    </div>
                    <Bar pct={pct} color={barColor(pct)} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => toast('Opening budget report…')} className={`${INNER} rounded-[10px] px-3 py-2 text-[12px] font-semibold ${INK}`}>View Budget Report</button>
              <button onClick={() => toast.success('Funds request submitted')} className={`${INNER} rounded-[10px] px-3 py-2 text-[12px] font-semibold ${INK}`}>Request Additional Funds</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
