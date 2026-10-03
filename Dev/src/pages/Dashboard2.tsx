import React from 'react';
import { 
  ChevronLeft, Clock, Info, CheckCircle2, 
  Calendar, FileText, ChevronDown, ChevronRight as ChevronRightIcon, BarChart2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

export const Dashboard2: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="text-[10px] font-bold text-gray-400 tracking-wider mb-1 uppercase">TEAM INSIGHTS</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Overall Performance</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Góc nhìn</span>
          <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <option>Staff</option>
            <option>Manager</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 mb-2">
        <button className="px-1 py-3 text-sm font-semibold border-b-2 border-primary text-primary mr-6">
          Chi tiết nhân sự
        </button>
        <button className="px-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent">
          Phân bổ đội ngũ
        </button>
      </div>

      <div className="text-xs text-gray-400 mb-2">Tiến độ & khối lượng theo nhân sự · Chọn mũi tên để đổi người</div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (35%) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Staff Spotlight Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col h-full dark:bg-slate-800 dark:border-slate-700 relative">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">STAFF SPOTLIGHT</span>
              <button className="text-gray-400 hover:text-gray-600">
                <ChevronRightIcon size={16} />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <button className="absolute left-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-gray-400">
                <ChevronLeft size={16} />
              </button>
              
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full border-[6px] border-blue-500 flex items-center justify-center text-4xl font-bold text-slate-700">
                  L
                </div>
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white">
                  <CheckCircle2 size={12} />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 mb-1">LUNA</h2>
              <div className="text-sm font-medium text-blue-600 mb-4">Thành viên</div>
              <div className="text-xs text-gray-400 mb-8">LUNA · Chưa cập nhật phòng ban</div>
              
              <div className="grid grid-cols-3 w-full gap-4 text-center mt-auto border-t border-gray-100 pt-6">
                <div>
                  <div className="text-2xl font-bold text-slate-800">16</div>
                  <div className="text-xs text-gray-500">Đang mở</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">36</div>
                  <div className="text-xs text-gray-500">Hoàn tất</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">12</div>
                  <div className="text-xs text-gray-500">Dự án mở</div>
                </div>
              </div>
              
              <button className="mt-8 text-xs font-medium text-gray-500 flex items-center gap-1 hover:text-primary">
                Xem 52 công việc <ChevronRightIcon size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column (35%) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Progress Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 dark:bg-slate-800 dark:border-slate-700 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-slate-700">Tiến độ hoàn thành</span>
                <Info size={14} className="text-gray-400" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-28 h-28 mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="text-teal-500"
                      strokeDasharray="69, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-800">69%</span>
                    <span className="text-[9px] text-gray-400">hoàn thành</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 text-center mb-3">38 / 52 task được giao</div>
                <div className="flex gap-3 text-[9px] text-gray-400 font-medium">
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> Done</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div> Đang mở</span>
                </div>
              </div>
            </div>

            {/* Focus Needed Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 dark:bg-slate-800 dark:border-slate-700 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-700">Cần tập trung</span>
                <Clock size={14} className="text-gray-400" />
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-rose-500 mb-1">2</div>
                <div className="inline-block px-2 py-0.5 bg-rose-50 text-rose-500 text-[10px] font-semibold rounded">task quá hạn</div>
              </div>
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Deadline trong 3 ngày</span>
                  <span className="font-bold text-slate-800">0</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Ưu tiên High / Urgent</span>
                  <span className="font-bold text-slate-800">8</span>
                </div>
                <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden mt-1 flex">
                  <div className="bg-teal-500 h-full w-[40%]"></div>
                  <div className="bg-gray-300 h-full w-[20%]"></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>Chưa có deadline</span>
                  <span className="font-bold text-slate-600">13</span>
                </div>
              </div>
              <button className="text-[10px] font-medium text-blue-600 flex items-center gap-1 hover:underline">
                Xem task đang mở <ChevronRightIcon size={10} />
              </button>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 dark:bg-slate-800 dark:border-slate-700 flex flex-col flex-1">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-700">Lịch deadline</h3>
                <p className="text-[10px] text-gray-400">LUNA · 28/9/2026 - 4/10/2026</p>
              </div>
              <div className="flex bg-slate-50 border border-gray-200 rounded-lg p-0.5">
                <button className="px-3 py-1 text-[10px] font-medium bg-white shadow-sm rounded-md text-slate-700">Weekly</button>
                <button className="px-3 py-1 text-[10px] font-medium text-gray-500">Monthly</button>
              </div>
            </div>
            
            <div className="h-32 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'T2', value: 0 }, { name: 'T3', value: 0 }, { name: 'T4', value: 2 },
                  { name: 'T5', value: 0 }, { name: 'T6', value: 0 }, { name: 'T7', value: 0 },
                  { name: 'CN', value: 0 }
                ]}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={16}>
                    {
                      [0,0,2,0,0,0,0].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry > 0 ? '#60a5fa' : '#e2e8f0'} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-[9px] text-gray-400 mt-2">
              Theo ngày đến hạn · Không phải lịch sử hoàn thành
            </div>
          </div>
        </div>

        {/* Right Column (30%) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* History Panel */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">HISTORY</span>
              <button className="w-1.5 h-1.5 rounded-full bg-blue-400"></button>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Lịch sử hoạt động</h2>
            <p className="text-[10px] text-gray-400 mb-8">Chưa có lịch sử Task · Đang hiển thị nhật ký tài sản</p>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 mb-3 text-gray-300">
                <FileText size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-1">Chưa có hoạt động</h3>
              <p className="text-[10px] text-gray-400">Nguồn dữ liệu chưa có nhật ký.</p>
            </div>
            
            <button className="mt-4 text-[10px] font-medium text-slate-600 flex items-center gap-1 hover:text-primary">
              Xem lịch sử & nguồn dữ liệu <ChevronRightIcon size={10} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* Task còn 3 ngày */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700 flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold text-slate-800">Task còn 3 ngày</h3>
                <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">3 ngày</span>
              </div>
              <p className="text-[9px] text-gray-400 mb-4">Deadline trong 3 ngày tới</p>
              
              <div className="mt-auto bg-slate-50 border border-slate-100 rounded-xl p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[9px] font-medium text-slate-500">TK86</span>
                  <span className="text-[9px] font-medium text-amber-600">Medium</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 leading-tight mb-1">Campaign tháng 10</h4>
                <div className="text-[10px] text-gray-500 mb-2">BOE</div>
                <div className="flex items-center gap-1 text-[9px] text-gray-400">
                  <Calendar size={10} /> 3/10/2026 - Hôm nay
                </div>
              </div>
            </div>

            {/* TEAM Accordion */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-800 tracking-wider">TEAM</h3>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">TEAM</span>
              </div>
              
              <div className="space-y-0.5 flex-1 overflow-auto">
                {/* Design */}
                <div className="border-b border-gray-100 pb-2 mb-2">
                  <div className="flex justify-between items-center cursor-pointer mb-2">
                    <div className="text-[10px] font-bold text-slate-800">DESIGN <span className="text-gray-400 font-normal">(2 PIC)</span></div>
                    <ChevronDown size={12} className="text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[8px] font-bold">VA</div>
                      <div>
                        <div className="text-[10px] font-semibold text-slate-700 leading-none">Nguyễn Văn A</div>
                        <div className="text-[8px] text-gray-400">Nhân viên</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-slate-700 leading-none">0</div>
                      <div className="text-[8px] text-gray-400">mở</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[8px] font-bold">VE</div>
                      <div>
                        <div className="text-[10px] font-semibold text-slate-700 leading-none">Hoàng Văn E</div>
                        <div className="text-[8px] text-gray-400">Nhân viên</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-slate-700 leading-none">0</div>
                      <div className="text-[8px] text-gray-400">mở</div>
                    </div>
                  </div>
                </div>

                {/* Event */}
                <div className="border-b border-gray-100 py-2">
                  <div className="flex justify-between items-center cursor-pointer">
                    <div className="text-[10px] font-bold text-slate-800">EVENT <span className="text-gray-400 font-normal">(1 PIC)</span></div>
                    <ChevronRightIcon size={12} className="text-gray-400" />
                  </div>
                </div>
                
                {/* Marketing */}
                <div className="border-b border-gray-100 py-2">
                  <div className="flex justify-between items-center cursor-pointer">
                    <div className="text-[10px] font-bold text-slate-800">MARKETING <span className="text-gray-400 font-normal">(1 PIC)</span></div>
                    <ChevronRightIcon size={12} className="text-gray-400" />
                  </div>
                </div>
                
                {/* Media */}
                <div className="pt-2">
                  <div className="flex justify-between items-center cursor-pointer">
                    <div className="text-[10px] font-bold text-slate-800">MEDIA <span className="text-gray-400 font-normal">(1 PIC)</span></div>
                    <ChevronDown size={12} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600">
          <BarChart2 size={12} />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-bold text-slate-800">LUNA đang theo dõi 16 task chưa hoàn thành</div>
          <div className="text-[10px] text-gray-500">13 task đang mở chưa có deadline. Bổ sung hạn để theo dõi chính xác.</div>
        </div>
        <div className="flex items-center gap-4 text-[9px] text-gray-400 mr-4">
          <span className="flex items-center gap-1"><Info size={10} /> Chất lượng dữ liệu</span>
          <span>13 thiếu hạn</span>
          <span>0 thiếu PIC</span>
          <span>1 mở trùng</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <ChevronRightIcon size={14} />
        </button>
      </div>
      
    </div>
  );
};
