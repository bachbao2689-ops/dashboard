import React from 'react';
import { X } from 'lucide-react';
import type { BorrowRequest } from '../../../hooks/useBorrowRequests';
import { borrowStatusLabel } from '../../../services/borrowWorkflow';

interface BorrowRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
  canManage: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReturn: () => void;
}

const formatDate = (value?: string | null) => value
  ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('vi-VN')
  : '—';

export const BorrowRequestDetailModal: React.FC<BorrowRequestDetailModalProps> = ({
  isOpen, onClose, request, canManage, busy, onApprove, onReject, onReturn,
}) => {
  if (!isOpen || !request) return null;

  const fields = [
    ['Người mượn', request.requester?.name || 'Không rõ'],
    ['Phòng ban', request.department?.name || 'Chưa có'],
    ['Thiết bị', request.asset?.name || 'Không rõ'],
    ['Mã thiết bị', request.asset?.asset_code || '—'],
    ['Tình trạng thiết bị', request.asset?.condition || 'Chưa ghi nhận'],
    ['Ngày yêu cầu', formatDate(request.requested_at)],
    ['Ngày mượn', formatDate(request.borrow_date)],
    ['Hạn trả', formatDate(request.due_date)],
    ['Ngày trả thực tế', formatDate(request.returned_at)],
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Chi tiết yêu cầu mượn">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1e2330] border border-gray-200 dark:border-slate-700 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
        <button type="button" onClick={onClose} aria-label="Đóng chi tiết" className="absolute top-5 right-5 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white pr-10">Chi tiết phiếu mượn</h2>
        <p className="text-sm text-gray-500 mt-1">{borrowStatusLabel(request.approval_status, request.returned_at)}</p>

        <div className="mt-6 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {fields.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[130px_1fr] gap-3 px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-slate-700 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{label}</span>
              <span className="font-semibold text-gray-900 dark:text-white break-words">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Lý do mượn</p>
          <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 rounded-xl p-3">{request.purpose || 'Chưa ghi lý do'}</p>
        </div>

        {canManage && request.approval_status === 'pending' && (
          <div className="mt-6 flex gap-3 justify-end">
            <button type="button" disabled={busy} onClick={onReject} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 disabled:opacity-50">Từ chối</button>
            <button type="button" disabled={busy} onClick={onApprove} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white disabled:opacity-50">Duyệt mượn</button>
          </div>
        )}
        {canManage && request.approval_status === 'approved' && !request.returned_at && (
          <div className="mt-6 flex justify-end">
            <button type="button" disabled={busy} onClick={onReturn} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 text-white disabled:opacity-50">Xác nhận đã trả</button>
          </div>
        )}
      </div>
    </div>
  );
};
