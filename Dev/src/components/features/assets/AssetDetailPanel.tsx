import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X, Box, QrCode, Tag, User, Hash, AlertCircle, Maximize2, ChevronsRight, Camera, Laptop, HardDrive, Clock, Building2, Activity, MapPin } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';
import { isGlobalManager, isAssetApprover } from '../../../lib/roleScope';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../services/supabase';

const getIcon = (cat: string | undefined) => {
  if (!cat) return <Box className="w-5 h-5 text-gray-500" />;
  const c = cat.toLowerCase();
  if (c.includes('camera') || c.includes('lens')) return <Camera className="w-5 h-5 text-blue-500" />;
  if (c.includes('laptop')) return <Laptop className="w-5 h-5 text-indigo-500" />;
  if (c.includes('storage')) return <HardDrive className="w-5 h-5 text-emerald-500" />;
  return <Box className="w-5 h-5 text-gray-500" />;
};

interface AssetDetailPanelProps {
  asset: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenQR?: () => void;
  isScanMode?: boolean;
  onBorrowNow?: (asset: any) => void;
}

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({
  asset,
  isOpen,
  onClose,
  onOpenQR,
  isScanMode = false,
  onBorrowNow,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const canViewHistory = isGlobalManager(profile) || isAssetApprover(profile);
  const showHistoryTab = canViewHistory && !isScanMode;

  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [width, setWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 320 && newWidth < 800) setWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const fetchBorrowHistory = useCallback(async () => {
    if (!asset?.id || !canViewHistory) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data, error } = await supabase
        .from('borrow_requests')
        .select(`
          id,
          requester_id,
          borrow_date,
          due_date,
          requested_at,
          purpose,
          approval_status,
          returned_at,
          created_at,
          requester:requester_id(name),
          department:department_id(name)
        `)
        .eq('asset_id', asset.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching asset borrow history:', err);
      setHistoryError(err?.message || 'Không thể tải lịch sử mượn trả');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [asset?.id, canViewHistory]);

  useEffect(() => {
    if (isOpen && asset?.id && canViewHistory) {
      fetchBorrowHistory();

      const channel = supabase
        .channel(`asset_borrow_${asset.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'borrow_requests', filter: `asset_id=eq.${asset.id}` },
          () => {
            fetchBorrowHistory();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setHistory([]);
    }
  }, [isOpen, asset?.id, canViewHistory, fetchBorrowHistory]);

  useEffect(() => {
    if (!showHistoryTab) {
      setActiveTab('info');
    }
  }, [showHistoryTab, asset?.id]);

  const handleBorrowClick = () => {
    if (!user) {
      toast('Vui lòng đăng nhập để đăng ký mượn thiết bị', { icon: '🔐' });
      navigate('/login', {
        state: { from: `/assets?code=${encodeURIComponent(asset.asset_code)}&borrow=1` }
      });
      return;
    }
    onBorrowNow?.(asset);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  const getHistoryStatus = (item: any) => {
    if (item.returned_at) {
      return {
        label: 'Đã trả',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40',
        dotColor: 'bg-emerald-500 border-emerald-300 dark:border-emerald-600',
      };
    }
    switch (item.approval_status) {
      case 'approved':
        return {
          label: 'Đang mượn',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40',
          dotColor: 'bg-blue-500 border-blue-300 dark:border-blue-600',
        };
      case 'pending':
        return {
          label: 'Chờ duyệt',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40',
          dotColor: 'bg-amber-500 border-amber-300 dark:border-amber-600',
        };
      case 'rejected':
        return {
          label: 'Từ chối',
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40',
          dotColor: 'bg-rose-500 border-rose-300 dark:border-rose-600',
        };
      default:
        return {
          label: item.approval_status || 'Không xác định',
          className: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300 border border-gray-200/50 dark:border-slate-600',
          dotColor: 'bg-gray-400 border-gray-300 dark:border-slate-500',
        };
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[65] xl:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div 
        style={{ '--drawer-width': `${width}px` } as React.CSSProperties}
        className={`dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${isOpen ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--drawer-width)] xl:max-w-[min(var(--drawer-width),50vw)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} z-[70] ${!isResizing ? 'transition-[width,opacity] duration-300 ease-in-out' : ''}`}
      >
        {isOpen && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-transparent hover:bg-primary/20 cursor-col-resize z-50 transition-all -translate-x-1/2 group hidden xl:grid place-items-center"
            onMouseDown={startResizing}
          >
            <div className="h-12 w-1 bg-gray-400/50 dark:bg-slate-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        )}

        <div className="grid grid-cols-[auto_auto] justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div className="grid grid-flow-col auto-cols-max items-center gap-1">
            <button onClick={onClose} className="p-1.5 min-h-[44px] min-w-[44px] rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors grid grid-flow-col auto-cols-max items-center gap-1 text-xs font-medium" title="Close side peek">
              <ChevronsRight className="w-4 h-4" />
            </button>
            <button className="p-1.5 min-h-[44px] min-w-[44px] rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors grid place-items-center" title="Open as page">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="p-2 min-h-[44px] min-w-[44px] rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors grid place-items-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {asset && (
          <div className="h-[calc(100%-65px)] overflow-y-auto custom-scrollbar">
            <div className="p-6 md:px-8 pb-24 md:pb-12 space-y-6">
              
              {/* Asset header card */}
              <div>
                <div className="grid grid-cols-[auto_1fr] items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 grid place-items-center">
                    {getIcon(asset.category?.name)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{asset.name}</h2>
                    <div className="grid grid-flow-col auto-cols-max items-center gap-2 mt-1">
                      <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{asset.asset_code}</p>
                      <button onClick={onOpenQR} className="p-1.5 min-h-[44px] min-w-[44px] hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-primary grid place-items-center" title="Xem mã QR" aria-label="Xem mã QR">
                        <QrCode size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security-scoped Tab Switcher: Only visible for Manager / Asset Approver when not in scan mode */}
              {showHistoryTab && (
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100/80 dark:bg-slate-900/60 rounded-xl border border-gray-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    className={`min-h-[44px] py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all grid place-items-center ${
                      activeTab === 'info'
                        ? 'bg-white dark:bg-slate-800 text-[#002e6d] dark:text-cyan-400 shadow-sm border border-gray-200/50 dark:border-slate-700'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Thông tin chi tiết</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`min-h-[44px] py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 ${
                      activeTab === 'history'
                        ? 'bg-white dark:bg-slate-800 text-[#002e6d] dark:text-cyan-400 shadow-sm border border-gray-200/50 dark:border-slate-700'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Clock size={15} />
                    <span>Lịch sử mượn trả</span>
                    {history.length > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#002e6d]/10 text-[#002e6d] dark:bg-cyan-500/20 dark:text-cyan-300">
                        {history.length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 1: General Info */}
              {activeTab === 'info' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 gap-y-4 gap-x-6 text-sm">
                    <div className="grid grid-cols-[120px_1fr] items-center">
                      <div className="text-gray-500 grid grid-flow-col auto-cols-max items-center gap-1.5"><Tag className="w-4 h-4" /> {t('assets.category')}</div>
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{asset.category?.name || t('common.unassigned')}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center">
                      <div className="text-gray-500 grid grid-flow-col auto-cols-max items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {t('common.status')}</div>
                      <div>
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          (asset.status || '') === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          (asset.status || '') === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          (asset.status || '') === 'borrowed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {asset.status === 'available' ? t('assets.statusAvailable') : asset.status === 'reserved' ? t('assets.statusReserved') : asset.status === 'borrowed' ? t('assets.statusBorrowed') : t('assets.statusUnavailable')}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center">
                      <div className="text-gray-500 grid grid-flow-col auto-cols-max items-center gap-1.5"><Activity className="w-4 h-4" /> {t('assets.col.condition') || 'Tình trạng'}</div>
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{asset.condition || 'Bình thường'}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center">
                      <div className="text-gray-500 grid grid-flow-col auto-cols-max items-center gap-1.5"><MapPin className="w-4 h-4" /> {t('assets.col.location') || 'Vị trí'}</div>
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{asset.location || 'Kho tổng'}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center">
                      <div className="text-gray-500 grid grid-flow-col auto-cols-max items-center gap-1.5"><Hash className="w-4 h-4" /> {t('assets.serial')}</div>
                      <div className="text-gray-900 dark:text-gray-100 font-mono text-xs">{asset.serial_number || 'N/A'}</div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center">
                      <div className="text-gray-500 grid grid-flow-col auto-cols-max items-center gap-1.5"><User className="w-4 h-4" /> {asset.status === 'reserved' ? t('assets.requester') : t('assets.col.borrower')}</div>
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{asset.current_borrower?.name || asset.pending_requester?.name || t('common.none')}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 grid grid-flow-col auto-cols-max items-center gap-2">
                      {t('assets.maintenanceNotes')}
                    </h3>
                    <div className="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300 min-h-[100px]">
                      {asset.notes || t('assets.noNotes')}
                    </div>
                  </div>

                  {/* Action Section: Mượn ngay / Trạng thái thiết bị */}
                  <div className="pt-2">
                    {asset.status === 'available' && asset.is_available !== false ? (
                      <button
                        type="button"
                        onClick={handleBorrowClick}
                        className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all grid grid-flow-col auto-cols-max items-center justify-center gap-2 cursor-pointer"
                      >
                        <Box className="w-5 h-5" />
                        <span>Mượn ngay</span>
                      </button>
                    ) : asset.status === 'borrowed' ? (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 grid grid-flow-col auto-cols-max items-center gap-3 text-blue-800 dark:text-blue-300">
                        <Clock className="w-5 h-5 shrink-0 text-blue-500" />
                        <div className="text-xs">
                          <p className="font-semibold text-sm">Thiết bị hiện đang được mượn</p>
                          {asset.due_date && (
                            <p className="text-blue-600 dark:text-blue-400 mt-0.5">
                              Dự kiến trả: {formatDate(asset.due_date)}
                            </p>
                          )}
                          {asset.current_borrower?.name && (
                            <p className="text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                              Người mượn: {asset.current_borrower.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : asset.status === 'maintenance' || asset.status === 'broken' ? (
                      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 grid grid-flow-col auto-cols-max items-center gap-3 text-rose-800 dark:text-rose-300">
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                        <div className="text-xs">
                          <p className="font-semibold text-sm">Thiết bị đang bảo trì / tạm ngưng</p>
                          <p className="text-rose-600 dark:text-rose-400 mt-0.5">
                            Hiện chưa thể đăng ký mượn thiết bị này.
                          </p>
                        </div>
                      </div>
                    ) : asset.status === 'reserved' ? (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 grid grid-flow-col auto-cols-max items-center gap-3 text-amber-800 dark:text-amber-300">
                        <Clock className="w-5 h-5 shrink-0 text-amber-500" />
                        <div className="text-xs">
                          <p className="font-semibold text-sm">Thiết bị đã có người đặt mượn</p>
                          {asset.pending_requester?.name && (
                            <p className="text-amber-600 dark:text-amber-400 mt-0.5">
                              Người yêu cầu: {asset.pending_requester.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-center text-xs text-gray-500 dark:text-gray-400">
                        Thiết bị hiện không khả dụng
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Borrow History (Manager / Asset Approver Only) */}
              {canViewHistory && activeTab === 'history' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-[1fr_auto] items-center">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Nhật ký mượn & trả thiết bị
                    </h3>
                    <button
                      type="button"
                      onClick={fetchBorrowHistory}
                      disabled={historyLoading}
                      className="text-xs text-primary dark:text-cyan-400 hover:underline disabled:opacity-50 min-h-[44px] min-w-[44px] grid place-items-center"
                    >
                      Làm mới
                    </button>
                  </div>

                  {historyLoading ? (
                    <div className="py-12 grid justify-items-center text-center space-y-3">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Đang tải lịch sử mượn trả...</p>
                    </div>
                  ) : historyError ? (
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl text-center space-y-3">
                      <p className="text-xs text-rose-600 dark:text-rose-400">{historyError}</p>
                      <button
                        type="button"
                        onClick={fetchBorrowHistory}
                        className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 grid justify-items-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 grid place-items-center text-gray-400">
                        <Clock size={20} />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chưa có lịch sử mượn trả</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                        Thiết bị này chưa có phiếu mượn nào được ghi nhận trong hệ thống.
                      </p>
                    </div>
                  ) : (
                    <div className="relative pl-3 space-y-4">
                      {/* Vertical timeline track */}
                      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-slate-700" />
                      
                      {history.map((item) => {
                        const status = getHistoryStatus(item);
                        return (
                          <div key={item.id} className="relative pl-7">
                            {/* Dot indicator */}
                            <div className={`absolute left-0 top-3.5 w-3.5 h-3.5 rounded-full border-2 ${status.dotColor} shadow-xs z-10`} />

                            <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-xs hover:border-primary/40 dark:hover:border-cyan-500/40 transition-all">
                              {/* Header: Requester + Status */}
                              <div className="grid grid-cols-[1fr_auto] items-start gap-2 mb-2">
                                <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {item.requester?.name || 'Không xác định'}
                                  </p>
                                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    <Building2 size={13} className="text-gray-400" />
                                    <span>{item.department?.name || 'Phòng ban chung'}</span>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${status.className}`}>
                                  {status.label}
                                </span>
                              </div>

                              {/* Dates row */}
                              <div className="grid grid-cols-2 gap-2 text-xs py-2 my-2 border-y border-gray-100 dark:border-slate-800">
                                <div>
                                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Ngày mượn</span>
                                  <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {formatDate(item.borrow_date || item.requested_at)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                                    {item.returned_at ? 'Ngày trả thực tế' : 'Hạn trả'}
                                  </span>
                                  <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {item.returned_at ? formatDate(item.returned_at) : formatDate(item.due_date)}
                                  </span>
                                </div>
                              </div>

                              {/* Purpose */}
                              {item.purpose ? (
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 text-xs mt-2">
                                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 block mb-0.5">
                                    Mục đích:
                                  </span>
                                  <p className="text-gray-700 dark:text-gray-300 italic leading-relaxed">
                                    "{item.purpose}"
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </>
  );
};
