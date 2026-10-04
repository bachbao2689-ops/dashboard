import React from 'react';
import { X, Check } from 'lucide-react';

interface BorrowRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any; // We'll use any for now, or match useBorrowRequests type
  onApprove?: () => void;
  onReject?: () => void;
}

export const BorrowRequestDetailModal: React.FC<BorrowRequestDetailModalProps> = ({ isOpen, onClose, request, onApprove, onReject }) => {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-[#f4f6f8] dark:bg-[#1e2330] border border-gray-200 dark:border-slate-700/80 rounded-[32px] w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white rounded-full transition-all z-10"
        >
          <X size={24} />
        </button>

        <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <img src="/logo-dark.svg" className="h-8 hidden dark:block" alt="K Coffee" />
            <img src="/logo-light.svg" className="h-8 block dark:hidden" alt="K Coffee" />
          </div>

          {/* Check Icon */}
          <div className="w-12 h-12 rounded-full bg-[#e8ecf1] dark:bg-[#282d3a] flex items-center justify-center mb-6">
            <Check className="w-6 h-6 text-[#002e6d] dark:text-[#3b82f6]" strokeWidth={3} />
          </div>

          {/* Header Text */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            Có yêu cầu mượn thiết bị mới
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-10 leading-relaxed">
            Bạn vừa nhận được yêu cầu mượn thiết bị. Vui lòng kiểm tra thông tin và xác nhận trên bảng quản lý tài sản.
          </p>

          {/* Info Card */}
          <div className="w-full bg-[#ffffff] dark:bg-[#141414] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm p-6 md:p-8">
            
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thông tin thiết bị</h3>
              <span className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#002e6d] text-white tracking-wide">
                {request.approval_status === 'approved' ? 'ĐÃ DUYỆT' : request.approval_status === 'rejected' ? 'TỪ CHỐI' : 'CHỜ DUYỆT'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Key-Values */}
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-white/10 border-dashed">
                <span className="text-sm text-gray-500 dark:text-gray-400">Tên:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{request.requester?.name || 'Bùi Bách Bảo'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-white/10 border-dashed">
                <span className="text-sm text-gray-500 dark:text-gray-400">Phòng ban:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{request.department?.name || 'Design Team'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-white/10 border-dashed">
                <span className="text-sm text-gray-500 dark:text-gray-400">Số lượng:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">01</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-white/10 border-dashed">
                <span className="text-sm text-gray-500 dark:text-gray-400">Mã thiết bị:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">{request.asset?.name || 'MAYANHSONY01'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-white/10 border-dashed">
                <span className="text-sm text-gray-500 dark:text-gray-400">Lý do mượn:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{request.notes || 'Chụp ảnh Campaign tháng 9'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-white/10 border-dashed">
                <span className="text-sm text-gray-500 dark:text-gray-400">Tình trạng hiện tại:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Nguyên 100%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-white/10 border-dashed mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Khả dụng:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Có thể mượn</span>
              </div>

              {/* Dates */}
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Ngày mượn:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{new Date(request.start_date).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Ngày trả:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{new Date(request.end_date).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            {/* Footer Action */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                Trạng thái yêu cầu
              </span>
              {request.approval_status === 'pending' ? (
                <div className="flex gap-2">
                  <button onClick={onReject} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    TỪ CHỐI
                  </button>
                  <button onClick={onApprove} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#002e6d] text-white hover:bg-[#001f4d] transition-colors">
                    DUYỆT
                  </button>
                </div>
              ) : (
                <span className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white tracking-wide ${request.approval_status === 'approved' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                  {request.approval_status === 'approved' ? 'ĐÃ DUYỆT' : 'ĐÃ TỪ CHỐI'}
                </span>
              )}
            </div>

          </div>

          <div className="mt-8 text-xs text-gray-400 dark:text-gray-500 text-center">
            Email tự động từ hệ thống Quản lý Tài sản K Coffee.
          </div>
        </div>
      </div>
    </div>
  );
};
