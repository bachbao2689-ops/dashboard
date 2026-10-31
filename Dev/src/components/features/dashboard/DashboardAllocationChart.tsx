import {useState} from 'react';
import {DateFilterDropdown} from '../../common/filters';
const toYmd=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
import {AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip,Legend,ResponsiveContainer} from 'recharts';
import {useTranslation} from '../../../i18n/translations';
const INK='text-gray-900 dark:text-white',MUTED='text-gray-500 dark:text-gray-400',INNER='border border-gray-200 dark:border-slate-700';
const displayDate=(value?:string,locale='vi-VN')=>{if(!value)return '';const d=new Date(value.includes('T')?value:`${value}T00:00:00`);return isNaN(d.getTime())?value:d.toLocaleDateString(locale);};
type Props={name:string;className?:string;rangeStart:string;rangeEnd:string;range?: 'weekly'|'custom';setRange?:(value:'weekly'|'custom')=>void;customStart?:string;setCustomStart?:(value:string)=>void;customEnd?:string;setCustomEnd?:(value:string)=>void;isDark:boolean;chartData:{name:string;created:number;doing:number;done:number}[];hideDateFilter?:boolean};
export function DashboardAllocationChart({name,rangeStart,rangeEnd,range='weekly',setRange,customStart='',setCustomStart,customEnd='',setCustomEnd,isDark,chartData,className,hideDateFilter=false}:Props){const {t,lang}=useTranslation();const [calendarFilter,setCalendarFilter]=useState('this_week');const [dateFilterOpen,setDateFilterOpen]=useState(false);return (<>
          {/* Chart */}
          <div className={className || `sm:col-span-2 ${INNER} rounded-[13px] px-4 pt-[15px] pb-[10px] grid grid-rows-[auto_1fr_auto] min-w-0`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <strong className={`text-sm ${INK}`}>{t('dashboard.taskAllocation')}</strong>
                <p className={`text-xs mt-[3px] ${MUTED}`}>{name} · {displayDate(rangeStart, lang === 'vi' ? 'vi-VN' : 'en-US')} — {displayDate(rangeEnd, lang === 'vi' ? 'vi-VN' : 'en-US')}</p>
              </div>
              {!hideDateFilter && (
              <DateFilterDropdown
                calendarFilter={calendarFilter}
                customStartDate={range === 'custom' ? customStart : ''}
                customEndDate={range === 'custom' ? customEnd : ''}
                onSelectPreset={(preset) => {
                  setCalendarFilter(preset);
                  if (preset === 'this_week' || preset === 'all') {
                    setRange?.('weekly');
                  } else if (preset === 'this_month') {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setCustomStart?.(toYmd(start));
                    setCustomEnd?.(toYmd(end));
                    setRange?.('custom');
                  } else {
                    setRange?.('weekly');
                  }
                }}
                onApplyCustomRange={(start, end) => {
                  setCalendarFilter('custom');
                  setCustomStart?.(start);
                  setCustomEnd?.(end);
                  setRange?.('custom');
                }}
                onClear={() => {
                  setCalendarFilter('this_week');
                  setRange?.('weekly');
                }}
                isOpen={dateFilterOpen}
                onToggle={() => setDateFilterOpen(!dateFilterOpen)}
                onClose={() => setDateFilterOpen(false)}
                align="right"
              />
              )}
            </div>
            <div className="w-full mt-3 flex-1 min-h-[150px] 2xl:min-h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? '#b4a3ff' : '#6953bd'} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={isDark ? '#b4a3ff' : '#6953bd'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#8a9bb0', fontSize: 10 }} dy={8} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#8a9bb0', fontSize: 10 }} />
                <Tooltip
                  cursor={{ stroke: isDark ? '#334155' : '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }}
                  formatter={(v, name) => [v + (lang === 'vi' ? ' việc' : ' tasks'), String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                  separator=" "
                  contentStyle={{
                    fontSize: 11, borderRadius: 8,
                    background: isDark ? '#1e293b' : '#fff',
                    color: isDark ? '#e2e8f0' : '#093570',
                    border: `1px solid ${isDark ? '#334155' : '#e0eaf8'}`,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend iconType="plainline" iconSize={16} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" dataKey="created" name={t('dashboard.createdArea')} stroke={isDark ? '#b4a3ff' : '#6953bd'} fill="url(#colorCreated)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="doing" name={lang==='vi'?'Cập nhật đang làm':'Updated open tasks'} stroke="#38bdf8" fill="transparent" strokeDasharray="3 3" strokeWidth={2} />
                <Area type="monotone" dataKey="done" name={t('dashboard.completedArea')} stroke="#4eb648" fill="transparent" strokeDasharray="5 5" strokeWidth={2.5} />
              </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className={`text-center text-xs mt-1 ${MUTED}`}>{t('dashboard.chartHint')}</p>
          </div>

</>);}
