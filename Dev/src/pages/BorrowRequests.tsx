import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Plus, User } from 'lucide-react';
import { useBorrowRequests } from '../hooks/useBorrowRequests';
import type { BorrowAction } from '../services/borrowWorkflow';
import { borrowStatusLabel } from '../services/borrowWorkflow';
import { BorrowRequestDetailModal } from '../components/features/assets/BorrowRequestDetailModal';
import { useAuthStore } from '../store/authStore';

const formatDate = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('vi-VN');

export const BorrowRequests: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const profile = useAuthStore(state => state.profile);
  const canManage = !!profile && ['admin', 'manager'].includes(profile.role);
  const { requests, loading, error, busyId, updateStatus } = useBorrowRequests();
  const mine = !canManage || searchParams.get('scope') === 'mine';
  const selectedRequest = requests.find(request => request.id === selectedId) || null;

  const filtered = requests.filter(request => {
    if (mine && request.requester_id !== profile?.id) return false;
    if (filter === 'all') return true;
    if (filter === 'returned') return !!request.returned_at;
    return !request.returned_at && request.approval_status === filter;
  });

  const act = async (id: string, action: BorrowAction) => {
    const ok = await updateStatus(id, action);
    if (ok) setSelectedId(null);
  };

  return (
    <div className="flex flex-col z-10 relative">
      <BorrowRequestDetailModal
        isOpen={!!selectedRequest} request={selectedRequest} onClose={() => setSelectedId(null)}
        canManage={canManage} busy={busyId === selectedId}
        onApprove={() => selectedId && void act(selectedId, 'approve')}
        onReject={() => selectedId && void act(selectedId, 'reject')}
        onReturn={() => selectedId && void act(selectedId, 'return')}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 sm:py-2.5 mb-4 px-1 shrink-0 relative z-50">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">Yêu cầu mượn thiết bị</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Theo dõi từ lúc gửi yêu cầu đến khi xác nhận trả.</p>
          {mine && <p className="text-xs text-primary mt-1">Đang xem yêu cầu của tôi</p>}
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
          <select aria-label="Lọc trạng thái yêu cầu" value={filter} onChange={event => setFilter(event.target.value)}
            className="h-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm rounded-xl px-3 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm cursor-pointer appearance-none">
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đang mượn</option>
            <option value="returned">Đã trả</option>
            <option value="rejected">Từ chối</option>
          </select>
          <button type="button" onClick={() => navigate('/assets?borrow=1')}
            className="btn-add-new h-10 flex items-center gap-2 px-4 rounded-xl text-sm font-medium transition-all shadow-sm">
            <Plus size={16} /> <span>Yêu cầu mới</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-500">Đang tải yêu cầu...</div>
        ) : error ? (
          <div className="col-span-full p-8 text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500">Chưa có yêu cầu nào.</div>
        ) : filtered.map(request => {
          const status = borrowStatusLabel(request.approval_status, request.returned_at);
          return (
            <div key={request.id} onClick={() => setSelectedId(request.id)}
              className="glass-panel p-5 flex flex-col group hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{request.asset?.name || 'Thiết bị'}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">{request.asset?.asset_code || '—'}</p>
                  <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2"><User size={12} />{request.requester?.name || 'Không rõ'}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${request.returned_at ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : request.approval_status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : request.approval_status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{status}</span>
              </div>
              <p className="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300 mb-4 border border-gray-100 dark:border-gray-700/50 flex-1 line-clamp-3">
                {request.purpose || 'Chưa ghi lý do mượn'}
              </p>
              <div className="flex items-center justify-between gap-3 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p className="flex items-center gap-1.5"><Calendar size={12} />Gửi: {formatDate(request.requested_at)}</p>
                  <p className="flex items-center gap-1.5"><Calendar size={12} />Hạn trả: {formatDate(request.due_date)}</p>
                </div>
                {canManage && request.approval_status === 'pending' && (
                  <div className="flex gap-2">
                    <button type="button" disabled={busyId === request.id} onClick={event => { event.stopPropagation(); void act(request.id, 'reject'); }} className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg disabled:opacity-50">Từ chối</button>
                    <button type="button" disabled={busyId === request.id} onClick={event => { event.stopPropagation(); void act(request.id, 'approve'); }} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg disabled:opacity-50">Duyệt</button>
                  </div>
                )}
                {canManage && request.approval_status === 'approved' && !request.returned_at && (
                  <button type="button" disabled={busyId === request.id} onClick={event => { event.stopPropagation(); void act(request.id, 'return'); }} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded-lg disabled:opacity-50">Xác nhận trả</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
