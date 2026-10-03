import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, Clock, Info, Check,
  Calendar, FileText, BarChart2, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* Design tokens copied from the UI HUB Dashboard tab */
const INK = 'text-[#153454] dark:text-white';
const MUTED = 'text-[#6f84a1] dark:text-slate-400';
const PANEL =
  'bg-white border border-[#e0eaf8] rounded-[18px] shadow-[0_3px_15px_rgba(9,47,102,0.02)] min-w-0 dark:bg-slate-800 dark:border-slate-700';
const INNER = 'border border-[#e0eaf8] dark:border-slate-700';

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
  <span className={`block text-[10px] font-semibold tracking-[1.8px] uppercase ${MUTED} ${className}`}>{children}</span>
);

const TextButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = '' }) => (
  <button onClick={onClick} className={`inline-flex items-center gap-1 text-[11px] font-semibold text-[#3789f4] hover:underline ${className}`}>
    {children} <ArrowRight size={12} />
  </button>
);

export const Dashboard2: React.FC = () => {
  const [tab, setTab] = useState<'detail' | 'allocation'>('detail');
  const [idx, setIdx] = useState(0);
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly');
  const [openDept, setOpenDept] = useState<string | null>('DESIGN');
  const [viewAs, setViewAs] = useState('Staff');

  const s = STAFF[idx];
  const pct = Math.round((s.done / s.total) * 100);
  const chartData = (range === 'weekly' ? s.week : s.month).map((v, i) => ({
    name: range === 'weekly' ? WEEK_LABELS[i] : MONTH_LABELS[i],
    value: v,
  }));
  const prev = () => setIdx((idx - 1 + STAFF.length) % STAFF.length);
  const next = () => setIdx((idx + 1) % STAFF.length);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)] gap-4 w-full items-stretch">
      {/* ============ LEFT: PERFORMANCE PANEL ============ */}
      <section className={`${PANEL} p-[25px] flex flex-col`}>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <Eyebrow className="!text-[9px] mb-[3px]">TEAM INSIGHTS</Eyebrow>
            <h2 className={`text-[19px] font-bold ${INK}`}>Overall Performance</h2>
          </div>
          <label className={`flex items-center gap-2 text-[12px] ${MUTED}`}>
            Góc nhìn
            <select
              value={viewAs}
              onChange={e => setViewAs(e.target.value)}
              className={`bg-white dark:bg-slate-800 ${INNER} rounded-[10px] px-3 py-1.5 text-[12px] font-semibold ${INK} outline-none`}
            >
              <option>Staff</option>
              <option>Manager</option>
            </select>
          </label>
        </div>

        {/* Tabs */}
        <div className="flex gap-[23px] border-b border-[#e0eaf8] dark:border-slate-700 mb-[13px]">
          {([['detail', 'Chi tiết nhân sự'], ['allocation', 'Phân bổ đội ngũ']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`relative pt-2 pb-3 text-[13px] transition-colors ${tab === k ? `font-semibold ${INK}` : 'text-[#8c9bb0] hover:text-[#153454]'}`}
            >
              {label}
              <span className={`absolute left-0 right-0 -bottom-px h-[3px] rounded-full bg-[#153454] dark:bg-white transition-opacity ${tab === k ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </div>
        <p className={`text-[11px] mb-3 ${MUTED}`}>
          {tab === 'detail' ? 'Tiến độ & khối lượng theo nhân sự · Chọn mũi tên để đổi người' : 'Phân bổ khối lượng công việc theo phòng ban'}
        </p>

        {tab === 'detail' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr_1fr] gap-3 flex-1">
              {/* Staff Spotlight */}
              <div className="md:row-span-2 border border-[#e8edf5] dark:border-slate-700 rounded-2xl px-[15px] py-[17px] bg-[radial-gradient(ellipse_at_50%_28%,#f4f9ff,white_66%)] dark:bg-slate-800 flex flex-col items-center justify-between text-center min-w-0">
                <div className="w-full flex items-center justify-between">
                  <Eyebrow className="!text-[8px] !tracking-[1.6px]">STAFF SPOTLIGHT</Eyebrow>
                  <button className={`${MUTED} hover:text-[#153454]`}><ChevronRight size={15} /></button>
                </div>

                <div className="flex items-center justify-between w-full my-3">
                  <button onClick={prev} className={`w-7 h-7 rounded-full grid place-items-center hover:bg-slate-100 ${MUTED}`}><ChevronLeft size={16} /></button>
                  <div
                    className="relative w-[112px] h-[112px] rounded-full grid place-items-center p-[5px]"
                    style={{ background: `conic-gradient(#4099e5 ${pct}%, #e8eff8 0)` }}
                  >
                    <div className={`w-full h-full rounded-full bg-[#eaf2ff] border-[6px] border-white grid place-items-center text-[32px] font-bold ${INK}`}>{s.initial}</div>
                    <span className="absolute bottom-0 right-1 w-[22px] h-[22px] rounded-full bg-[#279561] border-2 border-white grid place-items-center text-white"><Check size={12} strokeWidth={3} /></span>
                  </div>
                  <button onClick={next} className={`w-7 h-7 rounded-full grid place-items-center hover:bg-slate-100 ${MUTED}`}><ChevronRight size={16} /></button>
                </div>

                <h3 className={`text-[21px] font-bold tracking-tight ${INK}`}>{s.name}</h3>
                <div className="text-[13px] font-semibold text-[#2a6fc1] mt-1">{s.role}</div>
                <div className={`text-[10px] mt-2 ${MUTED}`}>{s.dept}</div>

                <div className="grid grid-cols-3 w-full gap-[5px] my-6">
                  {[[s.open, 'Đang mở'], [s.done, 'Hoàn tất'], [s.projects, 'Dự án mở']].map(([v, l], i) => (
                    <div key={l as string} className={i < 2 ? 'border-r border-[#eaf0f6] dark:border-slate-700' : ''}>
                      <strong className={`block text-[21px] font-semibold ${INK}`}>{v}</strong>
                      <span className={`block text-[10px] mt-0.5 ${MUTED}`}>{l}</span>
                    </div>
                  ))}
                </div>

                <div className="w-full border-t border-[#e0eaf8] dark:border-slate-700 pt-[13px]">
                  <TextButton className="!text-[11px] !text-[#153454] dark:!text-white">Xem {s.total} công việc</TextButton>
                </div>
              </div>

              {/* Progress */}
              <div className={`${INNER} rounded-[14px] px-[15px] py-4 min-w-0 flex flex-col`}>
                <div className="flex items-center justify-between">
                  <strong className={`text-[12px] ${INK}`}>Tiến độ hoàn thành</strong>
                  <Info size={13} className={MUTED} />
                </div>
                <div
                  className="w-[108px] h-[108px] rounded-full mx-auto mt-[13px] mb-[9px] p-[9px]"
                  style={{ background: `conic-gradient(#45a894 ${pct}%, #edf3f8 0)` }}
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex flex-col items-center justify-center">
                    <strong className={`text-[28px] leading-[1.1] tracking-tighter ${INK}`}>{pct}<small className="text-[14px]">%</small></strong>
                    <span className="text-[9px] text-[#92a0b1]">hoàn thành</span>
                  </div>
                </div>
                <p className={`text-center text-[10px] ${MUTED}`}>{s.done} / {s.total} task được giao</p>
                <div className={`flex justify-center gap-3 text-[9px] mt-2 ${MUTED}`}>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-[#45a894]" />Done</span>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-[#edf3f8] border border-[#d6e1ee]" />Đang mở</span>
                </div>
              </div>

              {/* Focus needed */}
              <div className={`${INNER} rounded-[14px] px-[15px] py-4 min-w-0 flex flex-col bg-[radial-gradient(ellipse_at_100%_110%,#fff1f3_0%,transparent_55%)] dark:bg-slate-800`}>
                <div className="flex items-center justify-between">
                  <strong className={`text-[12px] ${INK}`}>Cần tập trung</strong>
                  <Clock size={14} className={MUTED} />
                </div>
                <div className="mt-3 text-[38px] leading-none font-bold text-[#b0364b]">{s.overdue}</div>
                <span className="mt-2 self-start text-[9px] font-semibold text-[#b0364b] bg-[#fdecef] rounded-md px-1.5 py-0.5">task quá hạn</span>
                <div className="mt-4 space-y-2 text-[11px]">
                  <div className="flex justify-between"><span className={MUTED}>Deadline trong 3 ngày</span><b className={INK}>{s.due3}</b></div>
                  <div className="flex justify-between"><span className={MUTED}>Ưu tiên High / Urgent</span><b className={INK}>{s.urgent}</b></div>
                  <div className="h-1 rounded-full bg-[#dfe7f1] overflow-hidden flex">
                    <i className="bg-[#c04a5a]" style={{ width: `${Math.min(100, s.overdue * 10)}%` }} />
                    <i className="bg-[#4a8de0]" style={{ width: `${Math.min(100, s.urgent * 5)}%` }} />
                  </div>
                  <div className="flex justify-between"><span className={MUTED}>Chưa có deadline</span><b className={INK}>{s.noDeadline}</b></div>
                </div>
                <TextButton className="mt-auto pt-2 !text-[10px] !text-[#153454] dark:!text-white">Xem task đang mở</TextButton>
              </div>

              {/* Weekly chart */}
              <div className={`md:col-span-2 ${INNER} rounded-[13px] px-4 pt-[15px] pb-[9px] flex flex-col min-w-0`}>
                <div className="flex items-start justify-between">
                  <div>
                    <strong className={`text-[12px] ${INK}`}>Lịch deadline</strong>
                    <p className={`text-[9px] mt-[3px] ${MUTED}`}>{s.name} · 28/9/2026 — 4/10/2026</p>
                  </div>
                  <div className="flex bg-[#f3f7fc] dark:bg-slate-700 border border-[#e0eaf8] dark:border-slate-600 rounded-lg p-0.5">
                    {(['weekly', 'monthly'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-md capitalize transition-all ${range === r ? 'bg-white dark:bg-slate-800 shadow-sm text-[#153454] dark:text-white' : MUTED}`}
                      >
                        {r === 'weekly' ? 'Weekly' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[107px] w-full mt-3 flex-1 min-h-[107px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 14, right: 4, left: 4, bottom: 0 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#8a9bb0' }} />
                      <Tooltip cursor={{ fill: 'transparent' }} formatter={(v) => [`${v} tasks due`, '']} separator="" contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e0eaf8' }} />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={14} minPointSize={3}
                        label={{ position: 'top', fontSize: 9, fill: '#6f84a1', formatter: (v: unknown) => (Number(v) > 0 ? String(v) : '') }}>
                        {chartData.map((d, i) => <Cell key={i} fill={d.value > 0 ? '#7eaaf0' : '#dbe6f5'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className={`text-center text-[9px] mt-1 ${MUTED}`}>Theo ngày đến hạn · Không phải lịch sử hoàn thành</p>
              </div>
            </div>

            {/* Insight strip */}
            <div className="flex items-center gap-[13px] border border-[#e2ecf9] dark:border-slate-700 rounded-[13px] bg-[linear-gradient(115deg,#f6faff,#fff)] dark:bg-slate-700/40 px-[13px] py-4 mt-[17px]">
              <span className="w-8 h-8 rounded-lg bg-[#e3eefc] grid place-items-center text-[#3a7bd5] shrink-0"><BarChart2 size={15} /></span>
              <div className="min-w-0">
                <strong className={`text-[12px] font-semibold ${INK}`}>{s.name} đang theo dõi {s.open} task chưa hoàn thành</strong>
                <p className="text-[10px] text-[#7e94b1] mt-[3px]">{s.noDeadline} task đang mở chưa có deadline. Bổ sung hạn để theo dõi chính xác.</p>
              </div>
              <button className={`ml-auto ${MUTED} hover:text-[#153454]`}><ArrowRight size={16} /></button>
            </div>
            <div className="flex items-center gap-[7px] mt-[14px] text-[9px] text-[#8698b0]">
              <Info size={13} />
              <span className="flex items-center gap-2.5 flex-wrap">
                Chất lượng dữ liệu <b className="font-normal text-[#947d5b]">{s.noDeadline} thiếu hạn</b>
                <b className="font-normal text-[#947d5b]">0 thiếu PIC</b>
                <b className="font-normal text-[#947d5b]">1 mở trùng</b>
              </span>
              <ArrowRight size={13} className="ml-auto" />
            </div>
          </>
        ) : (
          <div className="space-y-3 flex-1">
            {TEAM.map(d => (
              <div key={d.name} className={`${INNER} rounded-[14px] p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <strong className={`text-[12px] ${INK}`}>{d.name}</strong>
                  <span className={`text-[10px] ${MUTED}`}>{d.members.length} PIC</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#edf3f8] overflow-hidden"><i className="block h-full bg-[#4a8de0]" style={{ width: `${Math.min(100, d.members.length * 35)}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============ RIGHT STACK ============ */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* History */}
        <section className={`${PANEL} px-[21px] pt-[22px] pb-[13px] flex flex-col flex-1`}>
          <div className="flex items-center justify-between mb-[9px]">
            <div>
              <Eyebrow className="!text-[9px] mb-[3px]">HISTORY</Eyebrow>
              <h2 className={`text-[18px] font-bold ${INK}`}>Lịch sử hoạt động</h2>
            </div>
            <i className="w-1.5 h-1.5 rounded-full bg-[#6ea2f0]" />
          </div>
          <p className={`text-[9px] ${MUTED}`}>Chưa có lịch sử Task · Đang hiển thị nhật ký tài sản</p>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <FileText size={22} className="text-[#b9c6d8] mb-2" />
            <h3 className={`text-[13px] font-bold ${INK}`}>Chưa có hoạt động</h3>
            <p className={`text-[10px] mt-1 ${MUTED}`}>Nguồn dữ liệu chưa có nhật ký.</p>
          </div>
          <TextButton className="!text-[#153454] dark:!text-white !text-[10px] mt-1.5">Xem lịch sử &amp; nguồn dữ liệu</TextButton>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          {/* Task còn 3 ngày */}
          <section className={`${PANEL} px-[14px] py-[18px] flex flex-col`}>
            <div className="flex items-start justify-between gap-1.5 mb-[11px]">
              <div>
                <h2 className={`text-[14px] font-bold ${INK}`}>Task còn 3 ngày</h2>
                <p className={`text-[9px] mt-1 ${MUTED}`}>Deadline trong 3 ngày tới</p>
              </div>
              <span className="text-[8px] font-semibold px-[5px] py-[3px] rounded-md bg-[#fff3d9] text-[#b7791f] border border-[#f6dfaa]">3 ngày</span>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-[9px]">
                <b className={INK}>TK86</b>
                <span className="px-1.5 py-0.5 rounded-md bg-[#fff3d9] text-[#b7791f] font-semibold">Medium</span>
              </div>
              <h4 className={`text-[12px] font-bold mt-2 ${INK}`}>Campaign tháng 10</h4>
              <div className={`text-[10px] mt-1 ${MUTED}`}>BOE</div>
              <div className={`flex items-center gap-1 text-[9px] mt-2 ${MUTED}`}><Calendar size={10} className="text-[#b7791f]" />3/10/2026 · Hôm nay</div>
            </div>
          </section>

          {/* TEAM accordion */}
          <section className={`${PANEL} px-[14px] py-[18px]`}>
            <div className="flex items-center justify-between mb-[11px]">
              <h2 className={`text-[14px] font-bold ${INK}`}>TEAM</h2>
              <Eyebrow className="!text-[8px] !tracking-[.5px]">TEAM</Eyebrow>
            </div>
            <div>
              {TEAM.map(d => {
                const open = openDept === d.name;
                return (
                  <div key={d.name} className="border-b border-[#e0eaf8] dark:border-slate-700 last:border-0">
                    <button onClick={() => setOpenDept(open ? null : d.name)} className="w-full flex items-center justify-between py-2.5">
                      <span className={`text-[11px] font-bold ${INK}`}>{d.name} <span className={`font-normal ${MUTED}`}>({d.members.length} PIC)</span></span>
                      <ChevronDown size={13} className={`${MUTED} transition-transform duration-300 ${open ? 'rotate-180' : '-rotate-90'}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                        {d.members.map(m => (
                          <div key={m.i} className="flex items-center gap-2 pb-2.5">
                            <span className="w-[26px] h-[26px] rounded-full bg-[#e3eefc] text-[#2a6fc1] grid place-items-center text-[9px] font-bold">{m.i}</span>
                            <div className="flex-1 min-w-0">
                              <strong className="block text-[11px] text-[#3789f4] truncate">{m.n}</strong>
                              <small className={`block text-[8px] ${MUTED}`}>{m.r}</small>
                            </div>
                            <div className="text-center leading-none">
                              <b className={`block text-[12px] ${INK}`}>{m.open}</b>
                              <small className={`text-[8px] ${MUTED}`}>mở</small>
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
