import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {BarChart2, Activity} from 'lucide-react';
import {AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell} from 'recharts';

export function WorkflowCharts({model}: {model: WorkflowModel}) {
  const {isEn, activePhase, gatePassChancePct, currentMonthTaskStats, totalMonthTasks, performanceTrendData, pct} = model;
  if (!activePhase) return null;
  return (<>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Chart 1: Donut Chart - Trạng thái Task tháng này (5 Cols) */}
        <div className="lg:col-span-5 card-hub p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/80 pb-3 mb-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  {isEn ? 'Task Status This Month' : 'Trạng thái Task Tháng Này'}
                </h3>
                <span className="text-[11px] text-gray-400">{new Date().toLocaleDateString(isEn ? 'en-US' : 'vi-VN',{month:'long',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'})} · {isEn ? `Total: ${totalMonthTasks} tasks` : `Tổng: ${totalMonthTasks} tasks`}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                {isEn ? 'Current Month' : 'Tháng hiện tại'}
              </span>
            </div>

            {/* Donut Chart with Gentle Glass Center Hub - Soft & Technical (No Stroke) */}
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentMonthTaskStats}
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                    cornerRadius={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {currentMonthTaskStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center gentle glass hub - Soft & Technical (No border stroke) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-22 h-22 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_6px_20px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium text-gray-400 dark:text-slate-400">{isEn ? 'Completed' : 'Hoàn thành'}</span>
                  <b className="text-xl font-extrabold text-emerald-500 dark:text-emerald-400">
                    {totalMonthTasks ? Math.round(currentMonthTaskStats[0].value * 100 / totalMonthTasks) + '%' : '—'}
                  </b>
                </div>
              </div>
            </div>
          </div>

          {/* Legends */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-xs">
            {currentMonthTaskStats.map(stat => (
              <div key={stat.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                <span className="text-gray-500 dark:text-gray-400 truncate text-[11px]">{stat.name}:</span>
                <b className="text-gray-900 dark:text-white ml-auto">{stat.value}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Performance & Velocity Charts Row (7 Cols) */}
        <div className="lg:col-span-7 card-hub p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/80 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart2 size={16} className="text-primary" />
                  {isEn ? 'Execution Performance & Velocity' : 'Hiệu Suất Thực Thi & Vận Tốc'}
                </h3>
                <span className="text-[11px] text-gray-400">
                  {isEn ? 'Delivery progress vs. plan target' : 'Tiến độ bàn giao so với kế hoạch mục tiêu'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {isEn ? 'Actual' : 'Thực tế'}
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-0.5 bg-gray-400" /> {isEn ? 'Plan' : 'Kế hoạch'}
                </span>
              </div>
            </div>

            {/* Area Chart */}
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name={isEn ? 'Actual' : 'Thực tế'}
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#velocityGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="plan"
                    name={isEn ? 'Plan' : 'Kế hoạch'}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1.8}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
            <span>{isEn ? `Pace assessment (${activePhase?.name || 'No phase'}):` : `Đánh giá nhịp độ (${activePhase?.name || 'Chưa có phase'}):`}</span>
            <span className="font-semibold text-emerald-500">
              {isEn ? `Progress ${pct(activePhase?.progress)} — Gate indicator ${pct(gatePassChancePct)}` : `Tiến độ ${pct(activePhase?.progress)} — Chỉ báo Gate ${pct(gatePassChancePct)}`}
            </span>
          </div>
        </div>

      </div>
  </>);
}
