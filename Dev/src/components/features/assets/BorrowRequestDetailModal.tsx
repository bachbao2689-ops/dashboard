import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { BorrowRequest } from '../../../hooks/useBorrowRequests';
import { useTranslation } from '../../../i18n/translations';
import { displayDate } from '../../../lib/workflowHub';

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

const formatDate = (value?: string | null) => displayDate(value);

export const BorrowRequestDetailModal: React.FC<BorrowRequestDetailModalProps> = ({
  isOpen, onClose, request, canManage, busy, onApprove, onReject, onReturn,
}) => {
  const { t } = useTranslation();
  if (!isOpen || !request || typeof document === 'undefined') return null;

  const getStatusLabel = (status: string, returnedAt?: string | null) => {
    if (returnedAt) return t('borrow.statusReturned');
    if (status === 'pending') return t('borrow.statusPending');
    if (status === 'approved') return t('borrow.statusApproved');
    if (status === 'rejected') return t('borrow.statusRejected');
    return status;
  };

  const fields = [
    [t('assets.col.borrower'), request.requester?.name || t('common.unassigned')],
    [t('common.department'), request.department?.name || t('borrow.noDepartment')],
    [t('assets.col.asset'), request.asset?.name || t('common.unassigned')],
    [t('assets.col.code'), request.asset?.asset_code || '—'],
    [t('borrow.assetCondition'), request.asset?.condition || t('borrow.notRecorded')],
    [t('borrow.requestedDate'), formatDate(request.requested_at)],
    [t('borrow.borrowDate'), formatDate(request.borrow_date)],
    [t('borrow.returnDate'), formatDate(request.due_date)],
    [t('borrow.actualReturnDate'), formatDate(request.returned_at)],
  ];

  return createPortal(
    <div className="fixed inset-0 z-[10050] grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={t('borrow.detailTitle')}>
      <div className="absolute inset-0 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div data-modal-surface="true" onClick={(e) => e.stopPropagation()} className="modal-liquid-glass relative border border-white/95 dark:border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar p-5 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="absolute top-4 sm:top-5 right-4 sm:right-5 min-h-[36px] min-w-[36px] grid place-items-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-[#002e6d] dark:text-white pr-10">{t('borrow.detailTitle')}</h2>
        <p className="text-sm text-gray-500 mt-1">{getStatusLabel(request.approval_status, request.returned_at)}</p>

        <div className="mt-6 rounded-[8px] border border-gray-200 dark:border-slate-700 overflow-hidden">
          {fields.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 border-b last:border-b-0 border-gray-100 dark:border-slate-700 text-xs sm:text-sm">
              <span className="text-gray-500 dark:text-gray-400">{label}</span>
              <span className="font-semibold text-gray-900 dark:text-white break-words">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-1">{t('borrow.purpose')}</p>
          <p className="text-sm text-gray-900 dark:text-white bg-white/80 dark:bg-slate-900/60 border border-slate-200/75 dark:border-slate-700/70 rounded-xl p-3">{request.purpose || t('borrow.notRecorded')}</p>
        </div>

        {canManage && request.approval_status === 'pending' && (
          <div className="mt-6 grid grid-flow-col auto-cols-max gap-3 justify-end">
            <button type="button" disabled={busy} onClick={onReject} className="px-4 py-2.5 rounded-[8px] text-sm font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 disabled:opacity-50">{t('borrow.reject')}</button>
            <button type="button" disabled={busy} onClick={onApprove} className="px-4 py-2.5 rounded-[8px] text-sm font-semibold bg-emerald-600 text-white disabled:opacity-50">{t('borrow.approve')}</button>
          </div>
        )}
        {canManage && request.approval_status === 'approved' && !request.returned_at && (
          <div className="mt-6 grid grid-flow-col auto-cols-max justify-end">
            <button type="button" disabled={busy} onClick={onReturn} className="px-4 py-2.5 rounded-[8px] text-sm font-semibold btn-add-new text-white disabled:opacity-50">{t('borrow.confirmReturn')}</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
