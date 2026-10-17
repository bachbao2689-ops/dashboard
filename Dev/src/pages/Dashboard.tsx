import {ActionButton} from '../components/common/ActionButton';
import {DashboardAllocationChart} from '../components/features/dashboard/DashboardAllocationChart';
import {taskOwningDepartment,useDashboardPerformance} from '../hooks/useDashboardPerformance';
import {isDepartmentLeader} from '../lib/roleScope';
import {useAuthStore} from '../store/authStore';
import {taskActive} from '../lib/taskTracking';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Avatar } from "../components/common/Avatar";

import {
  Users, ChevronDown, Clock, Info, Check, Calendar, FileText, BarChart2, ArrowRight, Search
} from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { useRememberedState } from '../hooks/useRememberedState';
import { useNavigate } from 'react-router-dom';
import { WeeklyReportDrawer } from '../components/features/reports/WeeklyReportDrawer';
import { useTranslation } from '../i18n/translations';

/* Design tokens */
const INK = 'text-gray-900 dark:text-white';
const MUTED = 'text-gray-500 dark:text-gray-400';
const LINK = 'text-blue-600 dark:text-blue-400';
const PANEL = 'card-hub';
const INNER = 'border border-gray-200 dark:border-slate-700';

const toYmd = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
const startOfCurrentWeek = () => { const value = new Date(); const weekday = value.getDay() || 7; value.setDate(value.getDate() - weekday + 1); value.setHours(0, 0, 0, 0); return value; };
const isDone = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`block text-xs font-semibold tracking-[1.8px] uppercase ${MUTED} ${className}`}>{children}</span>
);

const TextButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = '' }) => (
  <ActionButton icon={<ArrowRight size={12}/>} onClick={onClick} className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${className}`}>
    {children}
  </ActionButton>
);

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const isDark = useUiStore(state => state.theme) === 'dark';
  const { tasks: allTasks, users, loading, error, refetch } = useWorkspaceData();
  const profile=useAuthStore(state=>state.profile);
  const ownDepartment=isDepartmentLeader(profile)?profile?.department_id:null;
  const restrictDepartment=isDepartmentLeader(profile);
  const tasks=useMemo(()=>allTasks.filter(task=>taskActive(task)&&(!restrictDepartment||Boolean(ownDepartment&&taskOwningDepartment(task)===ownDepartment))),[allTasks,ownDepartment,restrictDepartment]);
  const navigate = useNavigate();

  const [activeId, setActiveId] = useRememberedState('dashboard.activeScope', 's1');
  const [range, setRange] = useRememberedState<'weekly' | 'custom'>('dashboard.range', 'weekly');
  const [customStart, setCustomStart] = useRememberedState('dashboard.customStart', toYmd(startOfCurrentWeek()));
  const [customEnd, setCustomEnd] = useRememberedState('dashboard.customEnd', (() => { const value = startOfCurrentWeek(); value.setDate(value.getDate() + 6); return toYmd(value); })());
    const [performanceOpen, setPerformanceOpen] = useState(false);

  const [openDept, setOpenDept] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOut = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  const {s,pct,rangeStart,rangeEnd,selectedTasks,periodTasks,chartData,selectedReferences,filteredDepts,getEyebrow,upcomingProjects,teams}=useDashboardPerformance(tasks,users,activeId,range,customStart,customEnd,search);
  const trackRing=isDark?'#334155':'#edf3f8';const trackOrbit=isDark?'#334155':'#e8eff8';
  const openFilteredTasks=(statusParam?: string)=>{
    if(!s)return;const query=new URLSearchParams({start:rangeStart,end:rangeEnd});
    if(statusParam)query.set('status',statusParam);
    if(ownDepartment)query.set('department_id',ownDepartment);
    if(s.type==='staff')query.set('assignee',s.id.slice(5));
    if(s.type==='department')query.set('department_id',s.id.slice(5));
    if(s.type==='project')query.set(s.id.startsWith('campaign-')?'campaign_id':'project_id',s.id.slice(s.id.indexOf('-')+1));
    navigate(`/tasks?${query}`);
  };
  if (loading) return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>;
  if (error) return <div role="alert" className="p-8 text-sm text-red-500">{error}<button onClick={() => void refetch()} className="ml-2 underline">Thử lại</button></div>;
  if (!s) return <div className="p-8 text-center text-gray-500">{t('dashboard.noHistoryDesc')}</div>;

  return (
    <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_256px] 2xl:grid-cols-[minmax(0,1fr)_320px] gap-4 w-full xl:items-stretch min-h-full">
      {/* ============ LEFT: PERFORMANCE PANEL ============ */}
      <section className={`${PANEL} p-3 sm:p-4 flex flex-col`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5 border-b border-gray-200 dark:border-slate-700 pb-2.5">
          <div>
            <Eyebrow className="!text-[11px] mb-[2px]">{t('dashboard.performanceOverview')}</Eyebrow>
            <h2 className={`text-base sm:text-lg font-bold ${INK}`}>{t('dashboard.operationsOverview')}</h2>
          </div>

          <div className="relative z-[100]" ref={searchRef}>
            <div className="flex items-center bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
              <span className={`hidden md:inline text-xs font-semibold px-2 ${MUTED}`}>{t('dashboard.department')}:</span>
              <ActionButton mobileOnlyIcon icon={<Users size={16}/>} label={s.type === 'department' ? s.name : t('dashboard.selectDept')}
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center justify-between min-w-[130px] gap-2 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-md shadow-sm text-xs font-semibold border border-gray-200 dark:border-slate-600"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className={INK}>{s.type === 'department' ? s.name : t('dashboard.selectDept')}</span>
                </div>
                <ChevronDown size={13} className={MUTED} />
              </ActionButton>
              <button onClick={() => setRange('custom')} className={`w-7 h-7 rounded-md grid place-items-center ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:hover:text-white dark:hover:bg-slate-600 transition-colors`} title={t('dashboard.customDateRange')}>
                <Calendar size={14} />
              </button>
            </div>

            {showSearch && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
                <div className="p-2 border-b border-gray-100 dark:border-slate-700">
                  <div className="relative">
                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${MUTED}`} />
                    <input
                      type="text" autoFocus placeholder={t('dashboard.searchDept')}
                      className={`w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-blue-500 ${INK}`}
                      value={search} onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-auto p-1">
                  {filteredDepts.length > 0 ? filteredDepts.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { setActiveId(d.id); setShowSearch(false); setSearch(''); }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex flex-col ${d.id === activeId ? 'bg-blue-50 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <span className={`text-sm font-semibold ${INK}`}>{d.name}</span>
                    </button>
                  )) : (
                    <div className={`p-4 text-center text-sm ${MUTED}`}>{t('dashboard.noDeptFound')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr] lg:grid-rows-[auto_1fr] gap-3 flex-1">
          {/* Context Spotlight */}
          <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2 border border-gray-100 dark:border-slate-700 rounded-2xl px-4 py-4 bg-[radial-gradient(ellipse_at_50%_28%,#f4f9ff,white_66%)] dark:bg-none dark:bg-slate-800 flex flex-col items-center justify-between text-center min-w-0">
            <div className="w-full flex items-center justify-between">
              <Eyebrow className="!text-xs !tracking-[1.5px]">{getEyebrow()}</Eyebrow>
            </div>

            <div className="flex flex-col items-center my-auto py-3">
              <div className="flex items-center justify-center w-full my-3">
                <div
                  className="relative w-[120px] h-[120px] xl:w-[138px] xl:h-[138px] 2xl:w-[160px] 2xl:h-[160px] rounded-full grid place-items-center p-[5px]"
                  style={{ background: `conic-gradient(#4099e5 ${pct}%, ${trackOrbit} 0)` }}
                >
                  <Avatar name={s.name} src={s.avatar_url || undefined} className={`w-full h-full rounded-full bg-blue-50 dark:bg-slate-700 border-[5px] border-white dark:border-slate-800 text-3xl xl:text-4xl 2xl:text-5xl ${INK}`} />
                  <span className="absolute bottom-0.5 right-1 w-[26px] h-[26px] xl:w-[28px] xl:h-[28px] 2xl:w-8 2xl:h-8 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-800 grid place-items-center text-white"><Check size={15} strokeWidth={3} /></span>
                </div>
              </div>

              <h3 className={`text-xl xl:text-2xl 2xl:text-3xl font-bold tracking-tight ${INK}`}>{s.name}</h3>
              <div className={`text-sm xl:text-base font-semibold mt-1.5 ${LINK}`}>{s.role}</div>
              <div className={`text-xs xl:text-sm mt-1 ${MUTED}`}>{s.dept}</div>
            </div>

            <div className="w-full mt-auto pt-2 space-y-3">
              <div className="grid grid-cols-3 gap-2 w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[14px] p-2 border border-white/60 dark:border-slate-700/50 shadow-sm relative">
                {[[s.open, t('dashboard.openTasks'), 'open'], [s.done, t('dashboard.doneTasks'), 'done'], [s.projects, s.projectsLabel, 'projects']].map(([v, l, type]) => {
                  let items: any[] = [];
                  if (type === 'open') items = selectedTasks.filter(t => !isDone(t.status));
                  else if (type === 'done') items = selectedTasks.filter(t => isDone(t.status));
                  else if (type === 'projects') items = [{ title: t('dashboard.relatedCount', { count: s.projects, label: s.projectsLabel.toLowerCase() }), status: 'info' }];

                  return (
                    <div
                      key={l as string}
                      onClick={() => {
                        if (type === 'open') openFilteredTasks('open');
                        else if (type === 'done') openFilteredTasks('completed');
                        else navigate('/projects');
                      }}
                      className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                        type === 'done'
                          ? 'hover:bg-emerald-500/10 hover:border-emerald-500/20'
                          : type === 'projects'
                          ? 'hover:bg-violet-500/10 hover:border-violet-500/20'
                          : 'hover:bg-blue-500/10 hover:border-blue-500/20'
                      } border border-transparent`}
                    >
                      <strong className={`block text-xl 2xl:text-2xl font-bold ${
                        type === 'done'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : type === 'projects'
                          ? 'text-violet-600 dark:text-violet-400'
                          : 'text-blue-600 dark:text-sky-400'
                      }`}>{v}</strong>
                      <span className={`block text-[11px] mt-0.5 font-medium ${MUTED} truncate max-w-full`}>{l}</span>

                      {/* Hover Bubble / Popover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[260px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] origin-bottom cursor-auto pointer-events-none group-hover:pointer-events-auto text-left">
                        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl saturate-200 border border-blue-100 dark:border-slate-700 rounded-[16px] shadow-[0_20px_60px_rgb(0,0,0,0.18)] relative">
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl border-b border-r border-blue-100 dark:border-slate-700 transform rotate-45 rounded-sm"></div>
                          <div className="relative z-10 p-3 flex flex-col max-h-[300px]">
                            <div className="flex items-center justify-between mb-2 px-1 shrink-0">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${MUTED}`}>{l}</span>
                              <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full text-[10px]">{items.length}</span>
                            </div>
                            {items.length === 0 ? (
                              <p className="text-center text-gray-400 text-xs py-3 font-medium">{t('common.noData')}</p>
                            ) : (
                              <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-1">
                                {items.map((item, idx) => (
                                  <button key={item.id || idx} onClick={(e) => { e.stopPropagation(); if (item.status !== 'info') navigate('/tasks?task=' + item.id); else openFilteredTasks(type === 'done' ? 'completed' : 'open'); }} className="w-full px-2.5 py-1.5 rounded-lg bg-white/40 dark:bg-slate-900/40 text-left border border-white/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-600 shadow-sm transition-colors">
                                    <p className={`text-xs font-semibold truncate ${INK}`}>{item.title || item.name}</p>
                                    {item.status !== 'info' && <p className="text-[9px] text-gray-500 mt-0.5 uppercase font-bold tracking-wider">{item.status || 'Active'}</p>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="w-full border-t border-gray-200 dark:border-slate-700 pt-2.5">
                <TextButton onClick={() => openFilteredTasks('all')} className={INK}>{t('dashboard.viewAllTasks', { count: s.total })}</TextButton>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className={`${INNER} rounded-[14px] px-[15px] py-4 min-w-0 flex flex-col`}>
            <div className="flex items-center justify-between">
              <strong className={`text-sm ${INK}`}>{t('dashboard.completionProgress')}</strong>
              <Info size={13} className={MUTED} />
            </div>
            <div
              className="w-[108px] h-[108px] 2xl:w-[136px] 2xl:h-[136px] rounded-full mx-auto mt-[13px] mb-[9px] p-[9px] 2xl:p-[11px]"
              style={{ background: `conic-gradient(#45a894 ${pct}%, ${trackRing} 0)` }}
            >
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex flex-col items-center justify-center">
                <strong className={`text-2xl 2xl:text-3xl leading-[1.1] tracking-tighter ${INK}`}>{pct}<small className="text-sm 2xl:text-base">%</small></strong>
                <span className="text-xs text-[#92a0b1]">{t('dashboard.completed')}</span>
              </div>
            </div>
            <p className={`text-center text-xs ${MUTED}`}>{s.done} / {s.total} {t('dashboard.assignedTasks')}</p>
            <div className={`flex justify-center gap-3 text-xs mt-2 ${MUTED}`}>
              <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-teal-500" />{t('common.done')}</span>
              <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-slate-600" />{t('dashboard.openTasks')}</span>
            </div>
          </div>

          {/* Focus needed */}
          <div className={`${INNER} rounded-[14px] px-[15px] py-4 min-w-0 flex flex-col bg-[radial-gradient(ellipse_at_100%_110%,#fff1f3_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_at_100%_110%,rgba(176,54,75,0.18)_0%,transparent_55%)]`}>
            <div className="flex items-center justify-between">
              <strong className={`text-sm ${INK}`}>{t('dashboard.accelerateProgress')}</strong>
              <Clock size={14} className={MUTED} />
            </div>
            <div className="mt-3 text-4xl 2xl:text-5xl leading-none font-bold text-[#b0364b] dark:text-rose-400">{s.overdue}</div>
            <span className="mt-2 self-start text-xs font-semibold text-[#b0364b] bg-red-50 dark:bg-rose-500/15 dark:text-rose-300 rounded-md px-1.5 py-0.5">{t('dashboard.overdueTasks')}</span>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className={MUTED}>{t('dashboard.dueIn3Days')}</span><b className={INK}>{s.due3}</b></div>
              <div className="flex justify-between"><span className={MUTED}>{t('dashboard.highPriority')}</span><b className={INK}>{s.urgent}</b></div>
              <div className="h-1 rounded-full bg-gray-100 dark:bg-slate-600 overflow-hidden flex">
                <i className="bg-red-500" style={{ width: `${Math.min(100, s.overdue * 10)}%` }} />
                <i className="bg-blue-500" style={{ width: `${Math.min(100, s.urgent * 5)}%` }} />
              </div>
              <div className="flex justify-between"><span className={MUTED}>{t('dashboard.noDeadline')}</span><b className={INK}>{s.noDeadline}</b></div>
            </div>
          </div>

          <DashboardAllocationChart name={s.name} rangeStart={rangeStart} rangeEnd={rangeEnd} range={range} setRange={setRange} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} isDark={isDark} chartData={chartData} onOpenReport={()=>setPerformanceOpen(true)} />
          {/* Insight strip */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex items-center gap-[13px] border border-blue-100 dark:border-slate-700 rounded-[13px] bg-[linear-gradient(115deg,#f6faff,#fff)] dark:bg-none dark:bg-slate-700/40 px-[13px] py-3.5 mt-1">
            <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-700 grid place-items-center text-[#3a7bd5] dark:text-sky-400 shrink-0"><BarChart2 size={15} /></span>
            <div className="min-w-0">
              <strong className={`text-sm font-semibold ${INK}`}>{t('dashboard.trackingIncomplete', { name: s.name, count: s.open })}</strong>
              <p className="text-xs text-[#7e94b1] dark:text-slate-400 mt-[3px]">{t('dashboard.openNoDeadline', { count: s.noDeadline })}</p>
            </div>
            <button onClick={() => openFilteredTasks('open')} aria-label="Xem công việc đang theo dõi" className={`ml-auto shrink-0 ${MUTED} hover:text-gray-900 dark:hover:text-white`}><ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      {/* ============ RIGHT STACK (compact) ============ */}
      <div className="flex flex-col gap-4 min-w-0">

        {/* History */}
        <section className={`${PANEL} px-4 pt-4 pb-3 flex flex-col`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <Eyebrow className="!text-xs mb-[3px]">HISTORY</Eyebrow>
              <h2 className={`text-base font-bold ${INK}`}>{t('dashboard.history')}</h2>
            </div>
            <i className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          </div>
          <p className={`text-xs ${MUTED}`}>{t('dashboard.noHistory')}</p>
          <div className="flex flex-col items-center justify-center text-center py-4">
            <FileText size={22} className="text-[#b9c6d8] dark:text-slate-500 mb-2" />
            <h3 className={`text-sm font-bold ${INK}`}>{t('dashboard.noHistory')}</h3>
            <p className={`text-xs mt-1 ${MUTED}`}>{t('dashboard.noHistoryDesc')}</p>
          </div>
        </section>

        {/* Upcoming Projects */}
        <section className={`${PANEL} px-3.5 py-4 flex flex-col`}>
          <div className="flex items-start justify-between gap-1.5 mb-3">
            <div>
              <h2 className={`text-sm font-bold ${INK}`}>{t('dashboard.upcomingProjects')}</h2>
              <p className={`text-xs mt-0.5 ${MUTED}`}>{t('dashboard.upcomingDesc')}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-[#b7791f] border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">{t('dashboard.urgentBadge')}</span>
          </div>
          <div className="space-y-3">
            {upcomingProjects.length ? upcomingProjects.map(p => (
              <button
                key={p.id}
                onClick={() => p.parentKey?setActiveId(p.parentKey):navigate(`/tasks?task=${encodeURIComponent(p.id)}`)}
                className={`w-full text-left bg-gray-50/80 dark:bg-slate-800/60 transition-all border ${activeId === p.parentKey ? 'border-blue-400 dark:border-sky-500 ring-1 ring-blue-400 dark:ring-sky-500' : 'border-gray-200 dark:border-slate-700/80'} rounded-xl p-3 hover-magnetic-card ${p.priority === 'High' || p.priority === 'Urgent' ? 'magnetic-rose' : 'magnetic-amber'}`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <b className={INK}>{p.code}</b>
                  <span className={`px-1.5 py-0.5 rounded-md font-semibold text-[11px] ${p.priority === 'High' || p.priority === 'Urgent' ? 'bg-red-50 text-red-600 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-amber-50 text-[#b7791f] dark:bg-amber-500/15 dark:text-amber-300'}`}>{p.priority}</span>
                </div>
                <h4 className={`text-sm font-bold truncate ${INK}`}>{p.name}</h4>
                <div className={`text-xs mt-1 ${MUTED}`}>{p.dept}</div>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <div className={`flex items-center gap-1 ${MUTED}`}><Calendar size={12} className="text-[#b7791f] dark:text-amber-400" />{p.date}</div>
                  <span className={`font-semibold ${p.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>{p.dueStr}</span>
                </div>
              </button>
            )) : <p className={`text-xs ${MUTED}`}>{t('dashboard.noUpcoming')}</p>}
          </div>
        </section>

        {/* TEAM accordion (OLD UI restored) */}
        <section className={`${PANEL} px-[14px] py-[16px]`}>
            <div className="flex items-center justify-between mb-[6px]">
              <h2 className={`text-sm font-bold ${INK}`}>{t('dashboard.team')}</h2>
              <Eyebrow className="!text-xs !tracking-[.5px]">{users.length} PIC</Eyebrow>
            </div>
            <div>
              {teams.map(d => {
                const open = openDept === d.id;
                return (
                  <div key={d.id} className="border-b border-gray-200 dark:border-slate-700 last:border-0">
                    <button onClick={() => setOpenDept(open ? null : d.id)} className="w-full flex items-center justify-between py-2">
                      <span className={`text-xs font-bold ${INK}`}>{d.name} <span className={`font-normal ${MUTED}`}>{t('dashboard.picsCount', { count: d.members.length })}</span></span>
                      <ChevronDown size={13} className={`${MUTED} transition-transform duration-300 ${open ? 'rotate-180' : '-rotate-90'}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {d.members.map(m => (
                          <button key={m.id} onClick={() => setActiveId(m.id)} className="w-full text-left flex items-center gap-2 p-1.5 rounded-lg hover-magnetic-btn magnetic-blue transition-all">
                            <Avatar name={m.n} src={m.a || undefined} className="w-[24px] h-[24px] rounded-full text-[#2a6fc1] dark:text-sky-300 text-[10px]" />
                            <div className="flex-1 min-w-0">
                              <strong className={`block text-xs truncate ${LINK}`}>{m.n}</strong>
                              <small className={`block text-xs ${MUTED}`}>{m.r}</small>
                            </div>
                            <div className="text-center leading-none">
                              <b className={`block text-sm ${INK}`}>{m.open}</b>
                              <small className={`text-xs ${MUTED}`}>{t('dashboard.openCount')}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <WeeklyReportDrawer isOpen={performanceOpen} onClose={() => setPerformanceOpen(false)} ownerName={s?.name || 'Performance'} userId={s?.type === 'staff' ? Number(s.id.replace('user-', '')) : undefined} weekStart={rangeStart} weekEnd={rangeEnd} tasks={periodTasks} references={selectedReferences} onOpenTask={taskId => { setPerformanceOpen(false); navigate(`/tasks?task=${taskId}`); }} />
      </div>
    );
  };
