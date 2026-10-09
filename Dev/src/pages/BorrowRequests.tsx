import React, { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Check, X, Calendar, User } from 'lucide-react';
import { useBorrowRequests } from '../hooks/useBorrowRequests';
import { BorrowModal } from '../components/features/assets/BorrowModal';
import { BorrowRequestDetailModal } from '../components/features/assets/BorrowRequestDetailModal';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const BorrowRequests: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const profileId = useAuthStore(state => state.profile?.id);
  const profile = useAuthStore(state => state.profile);
  const { requests, loading, updateStatus, refetch } = useBorrowRequests();

  const filtered = requests.filter(req => {
    if (searchParams.get('scope') === 'mine' && String(req.requester_id) !== String(profileId)) return false;
    if (filter === 'all') return true;
    return req.approval_status === filter;
  });

  if (profile?.department_id === 'dea85847-2e5d-4258-ba6d-900dde8f6ed0' && profile.employment_level === 'Leader') return <Navigate to="/" replace />;

  return (
    <div className="h-full flex flex-col z-10 relative">
      <BorrowModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={refetch} 
      />
      <BorrowRequestDetailModal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} request={selectedRequest} onApprove={() => { updateStatus(selectedRequest.id, 'approved'); setSelectedRequest(null); }} onReject={() => { updateStatus(selectedRequest.id, 'rejected'); setSelectedRequest(null); }} />
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 px-2 w-full">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Borrow Requests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage equipment borrowing approvals</p>
          {searchParams.get('scope') === 'mine' && <p className="text-xs text-primary mt-1">Đang lọc yêu cầu mượn của tôi</p>}
        </div>
        <div className="flex gap-3">
          <select 
            className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">New Request</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pb-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-500">Loading requests...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500">No requests found</div>
        ) : (
          filtered.map(req => (
            <div key={req.id} onClick={() => setSelectedRequest(req)} className="glass-panel p-5 flex flex-col group hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold
                    ${req.department?.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 
                      req.department?.color === 'purple' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {req.asset?.name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{req.asset?.name || 'Unknown Asset'}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <User size={12} />
                      <span>{req.requester?.name || 'Unknown'}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] ml-1">{req.department?.name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                  ${req.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                    req.approval_status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {req.approval_status}
                </span>
              </div>

              <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300 mb-4 border border-gray-100 dark:border-gray-700/50 flex-1">
                <span className="font-medium text-gray-900 dark:text-gray-100">Purpose: </span>
                {req.purpose || 'No purpose provided'}
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar size={12} />
                    <span>Req: {new Date(req.requested_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <Calendar size={12} />
                    <span>Due: {new Date(req.due_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {req.approval_status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateStatus(req.id, 'rejected'); }}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-100 dark:border-red-900/30"
                      title="Reject"
                    >
                      <X size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateStatus(req.id, 'approved'); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-lg shadow-emerald-500/20 text-sm font-medium"
                    >
                      <Check size={16} />
                      Approve
                    </button>
                  </div>
                )}
                
                {req.approval_status === 'approved' && (
                  <button className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg">
                    Approved
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
