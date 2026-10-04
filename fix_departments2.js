const fs = require('fs');
const path = 'Dev/src/pages/Departments2.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add recharts imports
if (!content.includes('from \'recharts\'')) {
  content = content.replace(
    "import {",
    "import { ResponsiveContainer, BarChart, Bar as RechartsBar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, PieChart, Pie } from 'recharts';\nimport {"
  );
}

// 2. Add chart data variables inside the component
const chartDataCode = `
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
`;

if (!content.includes('const statusData = useMemo')) {
  content = content.replace('const filtered = projects.filter(', chartDataCode + '\n  const filtered = projects.filter(');
}

// 3. Replace OVERVIEW JSX
const oldOverviewJSX = `          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className={\`\${PANEL} p-5 xl:col-span-2\`}>
              <p className={\`\${LABEL} mb-3\`}>Priority Projects (Top 4)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...projects].sort((a, b) => (a.status === 'overdue' ? -1 : 0) - (b.status === 'overdue' ? -1 : 0)).slice(0, 4).map(p => (
                  <div key={p.id} className={\`\${INNER} rounded-[14px] p-4 space-y-2.5\`}>
                    <div className="flex justify-between items-start gap-2">
                      <span className={\`text-sm font-bold \${INK}\`}>{p.name}</span>
                      <span className={\`text-sm font-bold \${INK}\`}>{p.progress}%</span>
                    </div>
                    <Bar pct={p.progress} />
                    <div className="flex justify-between text-xs">
                      <span className={\`flex items-center gap-1.5 font-semibold \${STATUS_STYLE[p.status].text}\`}>
                        <i className={\`w-1.5 h-1.5 rounded-full \${STATUS_STYLE[p.status].dot}\`} />{p.status === 'overdue' ? 'Overdue' : \`Due \${p.due}\`}
                      </span>
                      <span className={MUTED}>{p.members.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={\`\${PANEL} p-5\`}>
              <p className={\`\${LABEL} mb-3\`}>Alerts · Manager Action Needed</p>
              <ul className="space-y-2.5 text-sm">
                <li className={\`flex items-center gap-2 \${INK}\`}><AlertTriangle size={15} className="text-amber-500 shrink-0" />{projects.filter(p => p.status !== 'ok').length} projects at risk of delay</li>
                <li className={\`flex items-center gap-2 \${INK}\`}><span className="w-3.5 h-3.5 rounded-full bg-[#d9435a] shrink-0" />{totals.overdue} tasks overdue (2 urgent)</li>
                <li className={\`flex items-center gap-2 \${INK}\`}><CheckCircle2 size={15} className={\`\${LINK} shrink-0\`} />5 pending approvals</li>
              </ul>
              <button className={\`mt-4 text-sm font-semibold \${LINK} flex items-center gap-1\`} onClick={() => setTab('projects')}>View All Alerts <ChevronRight size={13} /></button>
            </div>
          </div>

          {/* Command Center */}
          <div className={\`\${PANEL} p-5\`}>
            <div className="flex items-center gap-2 mb-3"><Zap size={15} className="text-amber-500" /><p className={LABEL}>Command Center · Manager Only</p></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className={\`\${INNER} rounded-[14px] p-4\`}>
                <p className={\`text-sm font-bold mb-2 \${INK}\`}>Alerts (Realtime)</p>
                <ul className={\`space-y-2 text-sm \${INK}\`}>
                  <li>⚠️ Wendy over capacity (18/12)</li>
                  <li>⚠️ Campaign tháng 8 overdue risk (3 tasks)</li>
                  <li>⚠️ Canon 5D borrowed &gt; 14 days</li>
                </ul>
                <button onClick={() => rebalance('Wendy')} className={\`mt-3 text-xs font-semibold \${LINK}\`}>Redistribute →</button>
              </div>
              <div className={\`\${INNER} rounded-[14px] p-4\`}>
                <p className={\`text-sm font-bold mb-2 \${INK}\`}>Prediction Engine</p>
                <ul className="space-y-2 text-sm">
                  {PROJECTS.filter(p => p.dept === 'ecommerce').map(p => (
                    <li key={p.id} className="flex justify-between">
                      <span className={INK}>{p.name}</span>
                      <span className={p.delayDays ? 'text-[#d9435a] font-semibold' : 'text-[#279561] font-semibold'}>{p.delayDays ? \`\${p.delayDays} days late\` : 'On time ✓'}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={\`\${INNER} rounded-[14px] p-4 space-y-2\`}>
                <p className={\`text-sm font-bold mb-1 \${INK}\`}>Quick Decisions</p>
                {[
                  { icon: <CheckCircle2 size={14} />, label: 'Approve all pending requests', sub: '12 items', msg: '12 requests approved' },
                  { icon: <Shuffle size={14} />, label: 'Auto-balance team capacity', sub: 'Save 2hrs/day', msg: 'Team capacity rebalanced' },
                  { icon: <Mail size={14} />, label: 'Email overdue reminders', sub: '5 members affected', msg: 'Reminders sent to 5 members' },
                ].map(a => (
                  <button key={a.label} onClick={() => toast.success(a.msg)}
                    className={\`w-full \${INNER} rounded-[10px] px-3 py-2 flex items-center gap-2 text-left text-sm font-semibold \${INK} hover:bg-[#f6f9fe] dark:hover:bg-slate-700 transition-colors\`}>
                    {a.icon}<span className="flex-1">{a.label}</span><span className={\`text-xs font-medium \${MUTED}\`}>{a.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>`;

const newOverviewJSX = `          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className={\`\${PANEL} p-5 xl:col-span-2\`}>
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

            <div className={\`\${PANEL} p-5\`}>
              <p className={\`\${LABEL} mb-3\`}>Project Health</p>
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
                  <span className={\`text-xl font-black \${INK}\`}>{projects.length}</span>
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
            <div className={\`\${PANEL} p-5\`}>
              <p className={\`\${LABEL} mb-3\`}>Team Workload Map</p>
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

            <div className={\`\${PANEL} p-5\`}>
              <div className="flex items-center gap-2 mb-4"><Zap size={15} className="text-amber-500" /><p className={LABEL}>Quick Actions</p></div>
              <div className="space-y-2">
                {[
                  { icon: <Shuffle size={16} className="text-amber-500" />, label: 'Auto-balance capacity', sub: 'Wendy is overloaded (150%)', action: () => toast.success('Rebalancing workload') },
                  { icon: <Mail size={16} className="text-[#3789f4]" />, label: 'Email overdue reminders', sub: '2 projects are late', action: () => toast.success('Emails sent') },
                  { icon: <CheckCircle2 size={16} className="text-[#279561]" />, label: 'Approve pending requests', sub: '5 items pending', action: () => toast.success('Requests approved') },
                ].map(a => (
                  <button key={a.label} onClick={a.action} className={\`w-full \${INNER} rounded-[12px] p-3 flex items-center gap-3 text-left hover:bg-[#f6f9fe] dark:hover:bg-slate-700 transition-colors\`}>
                    <div className="w-8 h-8 rounded-full bg-[#f6f9fe] dark:bg-slate-800 flex items-center justify-center shrink-0">{a.icon}</div>
                    <div className="flex-1"><p className={\`text-sm font-bold \${INK}\`}>{a.label}</p><p className={\`text-xs \${MUTED}\`}>{a.sub}</p></div>
                    <ChevronRight size={16} className={MUTED} />
                  </button>
                ))}
              </div>
            </div>
          </div>`;

content = content.replace(oldOverviewJSX, newOverviewJSX);
fs.writeFileSync(path, content);
