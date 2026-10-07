import React, { useState } from 'react';
import { useReports } from '../hooks/useReports';
import type { TimeRange } from "../hooks/useReports";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Download, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { LeaderReports } from '../components/features/reports/LeaderReports';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Reports: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const role = (profile?.role || '').toLowerCase();
  const level = (profile?.employment_level || '').toLowerCase();
  const isLeader = role === 'leader' || (level === 'leader' && role !== 'admin');
  const isAdmin = role === 'admin' || level === 'admin';

  if (isLeader) return <LeaderReports />;
  if (isAdmin) return <AdminReports />;
  return <ManagerReports />;
};

const AdminReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'team-report'>('analytics');

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-gray-200 px-6 pt-5 dark:border-gray-700" role="tablist" aria-label="Report views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
          className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'analytics' ? 'border-primary text-primary dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
        >
          Reports &amp; Analytics
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'team-report'}
          onClick={() => setActiveTab('team-report')}
          className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'team-report' ? 'border-primary text-primary dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
        >
          Team Weekly Report
        </button>
      </div>
      <div role="tabpanel">
        {activeTab === 'analytics' ? <ManagerReports /> : <LeaderReports />}
      </div>
    </div>
  );
};

const ManagerReports: React.FC = () => {
  const { data, isLoading, timeRange, setTimeRange, exportCSV } = useReports();

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading reports...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-gray-500">No report data available.</div>;
  }

  const { kpis, completionTrend, statusDistribution, priorityBreakdown, topPerformers } = data;

  const percentChange = kpis.tasksCompletedPrev > 0 
    ? Math.round(((kpis.tasksCompleted - kpis.tasksCompletedPrev) / kpis.tasksCompletedPrev) * 100) 
    : 0;

  return (
    <div className="p-6 w-full space-y-6">
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
          
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#002e6d] text-white rounded-lg hover:bg-[#002250] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
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
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.avgCompletionTimeDays}d</h3>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">From creation to done</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Task Completion Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
                />
                <Line type="monotone" dataKey="completed" stroke="#002e6d" strokeWidth={3} dot={{ r: 4, fill: '#002e6d' }} activeDot={{ r: 6 }} />
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
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
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
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
                <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                  {priorityBreakdown.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }} />
                <Bar dataKey="completed" fill="#00C49F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
