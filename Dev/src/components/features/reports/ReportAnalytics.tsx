import React from 'react';
import { ActionButton } from '../../common/ActionButton';
import { useReports } from '../../../hooks/useReports';
import type { TimeRange } from '../../../hooks/useReports';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-react';
import { TeamWorkloadVisuals } from '../../common/TeamWorkloadVisuals';
import { statusMeta, priorityColor } from '../../../utils/statusTheme';

const chartTooltip = { backgroundColor: 'var(--chart-tooltip)', border: '1px solid var(--chart-border)', borderRadius: '12px', color: 'var(--chart-text)', boxShadow: '0 12px 32px #0003' };

export const ReportAnalytics: React.FC = () => {
  const { data, isLoading, error, refetch, timeRange, setTimeRange, exportCSV } = useReports();

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading reports...</div>;
  }

  if(error)return <div role="alert" className="card-hub m-4 p-4 text-sm text-red-600"><p>{error}</p><button onClick={()=>void refetch()} className="mt-2 underline">Thử lại</button></div>;
  if (!data) {
    return <div className="p-8 text-center text-gray-500">No report data available.</div>;
  }

  const { kpis, completionTrend, statusDistribution, priorityBreakdown, topPerformers } = data;

  const percentChange = kpis.tasksCompletedPrev != null && kpis.tasksCompletedPrev > 0
    ? Math.round(((kpis.tasksCompleted - kpis.tasksCompletedPrev) / kpis.tasksCompletedPrev) * 100)
    : 0;

  return (
    <div className="p-4 lg:p-6 w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">Performance metrics and task distribution</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-1">
            {(['week', 'month', 'quarter', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-[#002e6d] text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          <ActionButton icon={<Download className="w-4 h-4" />}
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#002e6d] text-white rounded-lg hover:bg-[#002250] transition-colors"
          >

            <span className="hidden sm:inline">Export CSV</span>
          </ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tasks Completed</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.tasksCompleted}</h3>
            </div>
          </div>
          <p className={`text-sm flex items-center gap-1 ${percentChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <TrendingUp className={`w-4 h-4 ${percentChange < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(percentChange)}% vs previous period
          </p>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overdue Rate</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.overdueRate}%</h3>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tasks past due date</p>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Completion Time</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.avgCompletionTimeDays == null ? '—' : `${kpis.avgCompletionTimeDays}d`}</h3>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">From creation to done</p>
        </div>
      </div>

      {/* Team Workload Live Visualizations (Burndown + Member Capacity % + Stacked Breakdown + Heatmap) */}
      <TeamWorkloadVisuals
        showKpiRibbon={false}
        showComparisonChart
        showHeatmap
        showMemberDrilldown
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Task Completion Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={chartTooltip}
                />
                <Line type="monotone" dataKey="completed" name="Hoàn thành" stroke="var(--chart-success)" strokeWidth={3} dot={{ r: 4, fill: 'var(--chart-success)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Tasks by Status</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution.map(entry => ({ ...entry, name: statusMeta(entry.name).label }))}
                  cx="50%"
                  cy="50%"
                  stroke="var(--chart-tooltip)" strokeWidth={3} innerRadius={62}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={statusMeta(entry.name).color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltip} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Tasks by Priority</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityBreakdown} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="count" name="Số công việc" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                  {priorityBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={priorityColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Performers</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <XAxis allowDecimals={false} type="number" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="completed" name="Hoàn thành" fill="var(--chart-success)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
