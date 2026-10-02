import React, { useState } from 'react';
import { Filter, CheckCircle, XCircle } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import borrowRequestsData from '../data/borrow_requests.json';

export const BorrowRequests: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const filteredRequests = borrowRequestsData.filter(req => 
    filter === 'all' || req.status === filter
  );

  return (
    <div className="h-full flex flex-col z-10 relative">
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Borrow Requests</h2>
        <div className="flex gap-2">
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value as any)}
            className="bg-white/40 hover:bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/60 shadow-sm text-sm font-medium text-gray-700 transition-colors focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
          <button className="flex items-center gap-2 bg-white/40 hover:bg-white/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/60 shadow-sm text-sm font-medium text-gray-700 transition-colors">
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-10">
        {filteredRequests.map((req) => (
          <div key={req.id} className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md">
            <div className="flex items-start gap-4">
              <Avatar name={req.user} className="w-10 h-10 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-gray-800 text-base">{req.asset}</h4>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 flex-wrap">
                  <span className="font-semibold">{req.user}</span>
                  <span className="text-gray-300 hidden sm:inline">•</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{req.dept}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  <span className="font-medium text-gray-700">Purpose:</span> {req.purpose || 'N/A'}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs font-medium text-gray-500">
                  <span>Borrow: <span className="text-gray-800">{req.borrowDate}</span></span>
                  <span>Due: <span className="text-gray-800">{req.dueDate}</span></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              {req.status === 'pending' ? (
                <>
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors">
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 shadow-sm transition-colors">
                    <XCircle size={16} /> Reject
                  </button>
                </>
              ) : req.status === 'approved' ? (
                <span className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full md:w-auto">
                  <CheckCircle size={16} /> Approved
                </span>
              ) : (
                <span className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full md:w-auto">
                  <XCircle size={16} /> Rejected
                </span>
              )}
            </div>
          </div>
        ))}
        {filteredRequests.length === 0 && (
          <div className="text-center py-10 text-gray-500 font-medium w-full">
            No borrow requests found.
          </div>
        )}
      </div>
    </div>
  );
};
