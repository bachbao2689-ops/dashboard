import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, Clock, Info, Check,
  Calendar, FileText, BarChart2, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useUiStore } from '../store/uiStore';

/* Design tokens copied from the UI HUB Dashboard tab (light + dark variants) */
const INK = 'text-gray-900 dark:text-white';
const MUTED = 'text-gray-500 dark:text-gray-400';
const LINK = 'text-blue-600 dark:text-blue-400';
const PANEL = 'bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-slate-800 dark:border-slate-700';
const INNER = 'border border-gray-200 dark:border-slate-700';
const ICON_BTN = 'w-7 h-7 rounded-full grid place-items-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors';

interface Staff {
  initial: string;
  name: string;
  role: string;
  dept: string;
  open: number;
  done: number;
  projects: number;
  total: number;
  overdue: number;
  due3: number;
  urgent: number;
  noDeadline: number;
  week: number[];
  month: number[];
}

const STAFF: Staff[] = [
  {
    initial: 'L', name: 'LUNA', role: 'Thành viên', dept: 'LUNA · Chưa cập nhật phòng ban',
    open: 16, done: 36, projects: 12, total: 52, overdue: 2, due3: 0, urgent: 8, noDeadline: 13,
    week: [0, 0, 2, 0, 0, 0, 0], month: [3, 5, 2, 4],
  },
  {
    initial: 'A', name: 'Nguyễn Văn A', role: 'Nhân viên', dept: 'DESIGN · Design Team',
    open: 9, done: 24, projects: 5, total: 33, overdue: 1, due3: 2, urgent: 3, noDeadline: 4,
    week: [1, 0, 1, 3, 0, 0, 0], month: [4, 2, 6, 3],
  },
  {
    initial: 'C', name: 'Lê Văn C', role: 'Nhân viên', dept: 'MEDIA · Media Team',
    open: 0, done: 18, projects: 2, total: 18, overdue: 0, due3: 0, urgent: 0, noDeadline: 0,
    week: [0, 0, 0, 0, 0, 0, 0], month: [0, 1, 0, 2],
  },
];

const TEAM = [
  { name: 'DESIGN', members: [{ i: 'VA', n: 'Nguyễn Văn A', r: 'Nhân viên', open: 0 }, { i: 'VE', n: 'Hoàng Văn E', r: 'Nhân viên', open: 0 }] },
  { name: 'EVENT', members: [{ i: 'TD', n: 'Phạm Thị D', r: 'Nhân viên', open: 0 }] },
  { name: 'MARKETING', members: [{ i: 'TB', n: 'Trần Thị B', r: 'Nhân viên', open: 0 }] },
  { name: 'MEDIA', members: [{ i: 'VC', n: 'Lê Văn C', r: 'Nhân viên', open: 0 }] },
];

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_LABELS = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`block text-xs font-semibold tracking-[1.8px] uppercase ${MUTED} ${className}`}>{children}</span>
);

const TextButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = '' }) => (
  <button onClick={onClick} className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${className}`}>
    {children} <ArrowRight size={12} />
  </button>
);

export const Dashboard: React.FC = () => {
  const isDark = useUiStore(state => state.theme) === 'dark';
  const [tab, setTab] = useState<'detail' | 'allocation'>('detail');
  const [idx, setIdx] = useState(0);
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly');
  const [openDept, setOpenDept] = useState<string | null>('DESIGN');
  const [viewAs, setViewAs] = useState('Staff');

  const s = STAFF[idx];
  const pct = Math.round((s.done / s.total) * 100);
  const trackRing = isDark ? '#334155' : '#edf3f8';
  const trackOrbit = isDark ? '#334155' : '#e8eff8';
  const chartData = (range === 'weekly' ? s.week : s.month).map((v, i) => ({
    name: range === 'weekly' ? WEEK_LABELS[i] : MONTH_LABELS[i],
    value: v,
  }));
  const prev = () => setIdx((idx - 1 + STAFF.length) % STAFF.length);
  const next = () => setIdx((idx + 1) % STAFF.length);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_clamp(270px,25%,330px)] gap-4 w-full xl:items-stretch">
      {/* ============ LEFT: PERFORMANCE PANEL (priority) ============ */}
      <section className={`${PANEL} p-4 sm:p-[25px] flex flex-col`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <Eyebrow className="!text-xs mb-[3px]">TEAM INSIGHTS</Eyebrow>
            <h2 className={`text-lg sm:text-xl font-bold ${INK}`}>Overall Performance</h2>
          </div>
          <label className={`flex items-center gap-2 text-sm ${MUTED}`}>
            Góc nhìn
            <select
              value={viewAs}
              onChange={e => setViewAs(e.target.value)}
              className={`bg-white dark:bg-slate-700 ${INNER} rounded-[10px] px-3 py-1.5 text-sm font-semibold ${INK} outline-none`}
            >
              <option>Staff</option>
              <option>Manager</option>
            </select>
          </label>
        </div>

        {/* Tabs */}
        <div className="flex gap-[23px] border-b border-gray-200 dark:border-slate-700 mb-[13px] overflow-x-auto">
          {([['detail', 'Chi tiết nhân sự'], ['allocation', 'Phân bổ đội ngũ']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`relative pt-2 pb-3 text-sm whitespace-nowrap transition-colors ${tab === k ? `font-semibold ${INK}` : 'text-[#8c9bb0] hover:text-gray-900 dark:hover:text-white'}`}
            >
              {label}
              <span className={`absolute left-0 right-0 -bottom-px h-[3px] rounded-full bg-gray-900 dark:bg-sky-400 transition-opacity ${tab === k ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </div>
        <p className={`text-xs mb-3 ${MUTED}`}>
          {tab === 'detail' ? 'Tiến độ & khối lượng theo nhân sự · Chọn mũi tên để đổi người' : 'Phân bổ khối lượng công việc theo phòng ban'}
        </p>

        {tab === 'detail' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr] lg:grid-rows-[auto_1fr] gap-3 flex-1">
              {/* Staff Spotlight */}
              <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2 border border-gray-100 dark:border-slate-700 rounded-2xl px-[15px] py-[17px] bg-[radial-gradient(ellipse_at_50%_28%,#f4f9ff,white_66%)] dark:bg-none dark:bg-slate-800 flex flex-col items-center justify-between text-center min-w-0">
                <div className="w-full flex items-center justify-between">
                  <Eyebrow className="!text-xs !tracking-[1.6px]">STAFF SPOTLIGHT</Eyebrow>
                  <button className={`${MUTED} hover:text-gray-900 dark:hover:text-white`}><ChevronRight size={15} /></button>
                </div>

                <div className="flex items-center justify-between w-full my-4">
                  <button onClick={prev} aria-label="Previous" className={`${ICON_BTN} ${MUTED}`}><ChevronLeft size={16} /></button>
                  <div
                    className="relative w-[112px] h-[112px] xl:w-[124px] xl:h-[124px] rounded-full grid place-items-center p-[5px]"
                    style={{ background: `conic-gradient(#4099e5 ${pct}%, ${trackOrbit} 0)` }}
                  >
                    <div className={`w-full h-full rounded-full bg-blue-50 dark:bg-slate-700 border-[6px] border-white dark:border-slate-800 grid place-items-center text-3xl font-bold ${INK}`}>{s.initial}</div>
                    <span className="absolute bottom-0 right-1 w-[22px] h-[22px] rounded-full bg-emerald-600 border-2 border-white dark:border-slate-800 grid place-items-center text-white"><Check size={12} strokeWidth={3} /></span>
                  </div>
                  <button onClick={next} aria-label="Next" className={`${ICON_BTN} ${MUTED}`}><ChevronRight size={16} /></button>
                </div>

                <h3 className={`text-xl font-bold tracking-tight ${INK}`}>{s.name}</h3>
                <div className={`text-sm font-semibold mt-1 ${LINK}`}>{s.role}</div>
                <div className={`text-xs mt-2 ${MUTED}`}>{s.dept}</div>

                <div className="grid grid-cols-3 w-full gap-[5px] my-6">
                  {[[s.open, 'Đang mở'], [s.done, 'Hoàn tất'], [s.projects, 'Dự án mở']].map(([v, l], i) => (
                    <div key={l as string} className={i < 2 ? 'border-r border-gray-50 dark:border-slate-700' : ''}>
                      <strong className={`block text-xl font-semibold ${INK}`}>{v}</strong>
                      <span className={`block text-xs mt-0.5 ${MUTED}`}>{l}</span>
                    </div>
                  ))}
                </div>

                <div className="w-full border-t border-gray-200 dark:border-slate-700 pt-[13px]">
                  <TextButton className={INK}>Xem {s.total} công việc</TextButton>
                </div>
              </div>

              {/* Progress */}
              <div className={`${INNER} rounded-[14px] px-[15px] py-4 min-w-0 flex flex-col`}>
                <div className="flex items-center justify-between">
                  <strong className={`text-sm ${INK}`}>Tiến độ hoàn thành</strong>
                  <Info size={13} className={MUTED} />
                </div>
                <div
                  className="w-[108px] h-[108px] rounded-full mx-auto mt-[13px] mb-[9px] p-[9px]"
                  style={{ background: `conic-gradient(#45a894 ${pct}%, ${trackRing} 0)` }}
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex flex-col items-center justify-center">
                    <strong className={`text-2xl leading-[1.1] tracking-tighter ${INK}`}>{pct}<small className="text-sm">%</small></strong>
                    <span className="text-xs text-[#92a0b1]">hoàn thành</span>
                  </div>
                </div>
                <p className={`text-center text-xs ${MUTED}`}>{s.done} / {s.total} task được giao</p>
                <div className={`flex justify-center gap-3 text-xs mt-2 ${MUTED}`}>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-teal-500" />Done</span>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-slate-600" />Đang mở</span>
                </div>
              </div>

              {/* Focus needed */}
              <div className={`${INNER} rounded-[14px] px-[15px] py-4 min-w-0 flex flex-col bg-[radial-gradient(ellipse_at_100%_110%,#fff1f3_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_at_100%_110%,rgba(176,54,75,0.18)_0%,transparent_55%)]`}>
                <div className="flex items-center justify-between">
                  <strong className={`text-sm ${INK}`}>Cần tập trung</strong>
                  <Clock size={14} className={MUTED} />
                </div>
                <div className="mt-3 text-4xl leading-none font-bold text-[#b0364b] dark:text-rose-400">{s.overdue}</div>
                <span className="mt-2 self-start text-xs font-semibold text-[#b0364b] bg-red-50 dark:bg-rose-500/15 dark:text-rose-300 rounded-md px-1.5 py-0.5">task quá hạn</span>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between"><span className={MUTED}>Deadline trong 3 ngày</span><b className={INK}>{s.due3}</b></div>
                  <div className="flex justify-between"><span className={MUTED}>Ưu tiên High / Urgent</span><b className={INK}>{s.urgent}</b></div>
                  <div className="h-1 rounded-full bg-gray-100 dark:bg-slate-600 overflow-hidden flex">
                    <i className="bg-red-500" style={{ width: `${Math.min(100, s.overdue * 10)}%` }} />
                    <i className="bg-blue-500" style={{ width: `${Math.min(100, s.urgent * 5)}%` }} />
                  </div>
                  <div className="flex justify-between"><span className={MUTED}>Chưa có deadline</span><b className={INK}>{s.noDeadline}</b></div>
                </div>
                <TextButton className={`mt-auto pt-2 !text-xs ${INK}`}>Xem task đang mở</TextButton>
              </div>

              {/* Weekly chart */}
              <div className={`sm:col-span-2 ${INNER} rounded-[13px] px-4 pt-[15px] pb-[9px] flex flex-col min-w-0`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <strong className={`text-sm ${INK}`}>Lịch deadline</strong>
                    <p className={`text-xs mt-[3px] ${MUTED}`}>{s.name} · 28/9/2026 — 4/10/2026</p>
                  </div>
                  <div className="flex bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-0.5">
                    {(['weekly', 'monthly'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${range === r ? 'bg-white dark:bg-slate-900 shadow-sm text-gray-900 dark:text-white' : MUTED}`}
                      >
                        {r === 'weekly' ? 'Weekly' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="w-full mt-3 flex-1 min-h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 14, right: 4, left: 4, bottom: 0 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#8a9bb0' }} />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        formatter={(v) => [`${v} tasks due`, '']}
                        separator=""
                        contentStyle={{
                          fontSize: 11, borderRadius: 8,
                          background: isDark ? '#1e293b' : '#fff',
                          color: isDark ? '#e2e8f0' : '#093570',
                          border: `1px solid ${isDark ? '#334155' : '#e0eaf8'}`,
                        }}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={14} minPointSize={3}
                        label={{ position: 'top', fontSize: 9, fill: isDark ? '#94a3b8' : '#6f84a1', formatter: (v: unknown) => (Number(v) > 0 ? String(v) : '') }}>
                        {chartData.map((d, i) => <Cell key={i} fill={d.value > 0 ? '#7eaaf0' : (isDark ? '#334155' : '#dbe6f5')} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className={`text-center text-xs mt-1 ${MUTED}`}>Theo ngày đến hạn · Không phải lịch sử hoàn thành</p>
              </div>
            </div>

            {/* Insight strip */}
            <div className="flex items-center gap-[13px] border border-blue-100 dark:border-slate-700 rounded-[13px] bg-[linear-gradient(115deg,#f6faff,#fff)] dark:bg-none dark:bg-slate-700/40 px-[13px] py-4 mt-[17px]">
              <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-700 grid place-items-center text-[#3a7bd5] dark:text-sky-400 shrink-0"><BarChart2 size={15} /></span>
              <div className="min-w-0">
                <strong className={`text-sm font-semibold ${INK}`}>{s.name} đang theo dõi {s.open} task chưa hoàn thành</strong>
                <p className="text-xs text-[#7e94b1] dark:text-slate-400 mt-[3px]">{s.noDeadline} task đang mở chưa có deadline. Bổ sung hạn để theo dõi chính xác.</p>
              </div>
              <button className={`ml-auto shrink-0 ${MUTED} hover:text-gray-900 dark:hover:text-white`}><ArrowRight size={16} /></button>
            </div>
            <div className="flex items-center gap-[7px] mt-[14px] text-xs text-[#8698b0] dark:text-slate-400">
              <Info size={13} className="shrink-0" />
              <span className="flex items-center gap-2.5 flex-wrap">
                Chất lượng dữ liệu <b className="font-normal text-[#947d5b] dark:text-amber-400">{s.noDeadline} thiếu hạn</b>
                <b className="font-normal text-[#947d5b] dark:text-amber-400">0 thiếu PIC</b>
                <b className="font-normal text-[#947d5b] dark:text-amber-400">1 mở trùng</b>
              </span>
              <ArrowRight size={13} className="ml-auto shrink-0" />
            </div>
          </>
        ) : (
          <div className="space-y-3 flex-1">
            {TEAM.map(d => (
              <div key={d.name} className={`${INNER} rounded-[14px] p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <strong className={`text-sm ${INK}`}>{d.name}</strong>
                  <span className={`text-xs ${MUTED}`}>{d.members.length} PIC</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-50 dark:bg-slate-700 overflow-hidden"><i className="block h-full bg-blue-500" style={{ width: `${Math.min(100, d.members.length * 35)}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============ RIGHT STACK (compact) ============ */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* History */}
        <section className={`${PANEL} px-[18px] pt-[18px] pb-[13px] flex flex-col flex-[4]`}>
          <div className="flex items-center justify-between mb-[9px]">
            <div>
              <Eyebrow className="!text-xs mb-[3px]">HISTORY</Eyebrow>
              <h2 className={`text-base font-bold ${INK}`}>Lịch sử hoạt động</h2>
            </div>
            <i className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          </div>
          <p className={`text-xs ${MUTED}`}>Chưa có lịch sử Task · Đang hiển thị nhật ký tài sản</p>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <FileText size={22} className="text-[#b9c6d8] dark:text-slate-500 mb-2" />
            <h3 className={`text-sm font-bold ${INK}`}>Chưa có hoạt động</h3>
            <p className={`text-xs mt-1 ${MUTED}`}>Nguồn dữ liệu chưa có nhật ký.</p>
          </div>
          <TextButton className={`!text-xs mt-1.5 ${INK}`}>Xem lịch sử &amp; nguồn dữ liệu</TextButton>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 flex-[5]">
          {/* Task còn 3 ngày */}
          <section className={`${PANEL} px-[14px] py-[16px] flex flex-col`}>
            <div className="flex items-start justify-between gap-1.5 mb-[11px]">
              <div>
                <h2 className={`text-sm font-bold ${INK}`}>Task còn 3 ngày</h2>
                <p className={`text-xs mt-1 ${MUTED}`}>Deadline trong 3 ngày tới</p>
              </div>
              <span className="text-xs font-semibold px-[5px] py-[3px] rounded-md bg-amber-50 text-[#b7791f] border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">3 ngày</span>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <b className={INK}>TK86</b>
                <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-[#b7791f] dark:bg-amber-500/15 dark:text-amber-300 font-semibold">Medium</span>
              </div>
              <h4 className={`text-sm font-bold mt-2 ${INK}`}>Campaign tháng 10</h4>
              <div className={`text-xs mt-1 ${MUTED}`}>BOE</div>
              <div className={`flex items-center gap-1 text-xs mt-2 ${MUTED}`}><Calendar size={10} className="text-[#b7791f] dark:text-amber-400" />3/10/2026 · Hôm nay</div>
            </div>
          </section>

          {/* TEAM accordion */}
          <section className={`${PANEL} px-[14px] py-[16px]`}>
            <div className="flex items-center justify-between mb-[6px]">
              <h2 className={`text-sm font-bold ${INK}`}>TEAM</h2>
              <Eyebrow className="!text-xs !tracking-[.5px]">{TEAM.reduce((n, d) => n + d.members.length, 0)} PIC</Eyebrow>
            </div>
            <div>
              {TEAM.map(d => {
                const open = openDept === d.name;
                return (
                  <div key={d.name} className="border-b border-gray-200 dark:border-slate-700 last:border-0">
                    <button onClick={() => setOpenDept(open ? null : d.name)} className="w-full flex items-center justify-between py-2">
                      <span className={`text-xs font-bold ${INK}`}>{d.name} <span className={`font-normal ${MUTED}`}>({d.members.length} PIC)</span></span>
                      <ChevronDown size={13} className={`${MUTED} transition-transform duration-300 ${open ? 'rotate-180' : '-rotate-90'}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                        {d.members.map(m => (
                          <div key={m.i} className="flex items-center gap-2 pb-2">
                            <span className="w-[24px] h-[24px] rounded-full bg-blue-50 dark:bg-slate-700 text-[#2a6fc1] dark:text-sky-300 grid place-items-center text-xs font-bold">{m.i}</span>
                            <div className="flex-1 min-w-0">
                              <strong className={`block text-xs truncate ${LINK}`}>{m.n}</strong>
                              <small className={`block text-xs ${MUTED}`}>{m.r}</small>
                            </div>
                            <div className="text-center leading-none">
                              <b className={`block text-sm ${INK}`}>{m.open}</b>
                              <small className={`text-xs ${MUTED}`}>mở</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
