import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Bell, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/translations';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import { markNotificationsRead, type NotificationItem } from '../../store/notificationStore';
import { NotificationIcon, TONES, toneOf, toneStyle, PicText, formatNotificationTimestamp } from '../features/notifications/notificationVisual';
import { entityLink } from '../../lib/taskTracking';
import { appUpdateService, type UpdateInfo } from '../../services/appUpdateService';
import { PushNotificationSettings } from '../features/notifications/PushNotificationSettings';
import toast from 'react-hot-toast';
import { cn } from '../common/KpiCard';

export interface MobileNotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  anchor?: 'top' | 'bottom';
}

export const MobileNotificationSheet: React.FC<MobileNotificationSheetProps> = ({
  isOpen,
  onClose,
  anchor = 'bottom',
}) => {
  const { lang } = useTranslation();
  const isEn = lang === 'en';
  const navigate = useNavigate();
  const { items: notifications, unread, history = [] } = useNotificationCenter();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(() => appUpdateService.getUpdateInfo());
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // App update listener
  useEffect(() => {
    const unsubscribe = appUpdateService.subscribe(info => setUpdateInfo(info));
    return () => unsubscribe();
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayList = notifications.length > 0 ? notifications : (history || []).slice(0, 30);

  const handleItemClick = (notification: NotificationItem) => {
    void markNotificationsRead([notification.id]);
    onClose();
    const href = entityLink(notification.entity_type, notification.entity_id, notification.metadata);
    if (href) navigate(href);
  };

  const handleMarkAll = async () => {
    if (!unread || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await markNotificationsRead();
      toast.success(isEn ? 'All notifications marked as read' : 'Đã đánh dấu tất cả là đã đọc');
    } catch {
      toast.error(isEn ? 'Failed to mark notifications read' : 'Chưa đồng bộ trạng thái đã đọc');
    } finally {
      setIsMarkingAll(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? 'Notifications' : 'Thông báo'}
      className="fixed inset-0 z-[140] xl:hidden"
    >
      {/* Backdrop overlay nhẹ, không blur quá mức */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/25 dark:bg-black/50 transition-opacity animate-in fade-in duration-200"
      />

      {/* Floating Sheet Card */}
      <div
        className={cn(
          "absolute left-3 right-3 max-w-[420px] mx-auto bg-white dark:bg-[#0a192f] rounded-[16px] border border-slate-200/90 dark:border-slate-700/80 shadow-2xl overflow-hidden grid grid-rows-[auto_1fr] duration-200",
          anchor === 'bottom'
            ? "bottom-[calc(76px+env(safe-area-inset-bottom))] max-h-[min(540px,78vh)] animate-in slide-in-from-bottom-4 zoom-in-95"
            : "top-[calc(60px+env(safe-area-inset-top,0px))] max-h-[min(540px,78vh)] animate-in slide-in-from-top-4 zoom-in-95"
        )}
      >
        {/* Header: Zero Flexbox (100% CSS Grid) */}
        <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800 grid grid-cols-[1fr_auto] items-center bg-white dark:bg-[#0a192f]">
          <div className="grid grid-flow-col auto-cols-max items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#002e6d] dark:text-sky-400 grid place-items-center">
              <Bell size={13} strokeWidth={2.2} />
            </div>
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              {isEn ? 'Notifications' : 'Thông báo'}
            </span>
            {unread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>

          <div className="grid grid-flow-col auto-cols-max items-center gap-1">
            <button
              type="button"
              disabled={isMarkingAll || unread === 0}
              onClick={() => void handleMarkAll()}
              title={isEn ? 'Mark all as read' : 'Đã đọc tất cả'}
              aria-label={isEn ? 'Mark all as read' : 'Đã đọc tất cả'}
              className="p-1.5 rounded-[6px] text-primary dark:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <Check size={16} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={isEn ? 'Close' : 'Đóng'}
              className="p-1.5 rounded-[6px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable List: Zero Flexbox (100% CSS Grid) */}
        <div className="overflow-y-auto p-2 grid grid-cols-1 gap-1.5 max-h-[calc(78vh-60px)] custom-scrollbar">
          {/* Device Push Notifications Setup */}
          <PushNotificationSettings hideWhenEnabled />

          {/* App Update Notification Banner */}
          {updateInfo && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                onClose();
                navigate('/software-update');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onClose();
                  navigate('/software-update');
                }
              }}
              className="p-2.5 rounded-[10px] bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-emerald-500/10 border border-blue-500/30 grid grid-cols-[auto_1fr_auto] items-center gap-2.5 cursor-pointer hover:border-blue-500/60 transition-all shadow-2xs mb-1"
            >
              <span className="w-7 h-7 rounded-[8px] bg-blue-500/20 text-blue-600 dark:text-cyan-400 grid place-items-center shrink-0">
                <Sparkles size={14} className="animate-pulse" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {updateInfo.title || (isEn ? 'New update available' : 'Có bản cập nhật mới')}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                  {isEn ? 'Open Software Update to install' : 'Mở Software Update để cập nhật'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  navigate('/software-update');
                }}
                className="px-2 py-1 text-[10px] font-bold bg-[#002e6d] hover:bg-[#001f4d] dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-[6px] shrink-0 grid grid-flow-col auto-cols-max items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw size={10} />
                <span>{isEn ? 'Open' : 'Mở'}</span>
              </button>
            </div>
          )}

          {displayList.length === 0 ? (
            <div className="py-12 text-center grid justify-items-center gap-2 text-slate-400 dark:text-slate-500">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/80 grid place-items-center text-slate-400">
                <Bell size={18} strokeWidth={1.8} />
              </div>
              <p className="text-xs font-medium">
                {isEn ? 'No notifications yet.' : 'Chưa có thông báo nào.'}
              </p>
            </div>
          ) : (
            displayList.map((notification) => (
              <div
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => handleItemClick(notification)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleItemClick(notification);
                }}
                style={toneStyle(notification)}
                className={cn(
                  "notif-row group grid grid-cols-[auto_1fr_auto] items-start gap-2.5 p-2.5 rounded-[10px] transition-all cursor-pointer text-left relative",
                  notification.is_read
                    ? "hover:bg-slate-100/70 dark:hover:bg-slate-800/50 opacity-80"
                    : "bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200/50 dark:border-blue-900/40"
                )}
              >
                <NotificationIcon
                  dim={notification.is_read}
                  message={notification.message}
                  metadata={notification.metadata}
                />
                <div className="min-w-0 grid grid-cols-1">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0">
                    <b className="truncate text-xs font-bold text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </b>
                    <span className="notif-chip rounded-full px-1.5 py-0.2 text-[9px] font-semibold leading-tight shrink-0">
                      {TONES[toneOf(notification)].label}
                    </span>
                  </div>
                  <p className="notif-msg mt-0.5 text-[11px] leading-4 text-slate-600 dark:text-slate-300 line-clamp-2">
                    <PicText message={notification.message} metadata={notification.metadata} />
                  </p>
                  <time
                    className="mt-1 block text-[10px] text-gray-400 dark:text-slate-500 font-medium"
                    dateTime={notification.created_at}
                  >
                    {formatNotificationTimestamp(notification.created_at, lang)}
                  </time>
                </div>
                {!notification.is_read && (
                  <button
                    type="button"
                    title={isEn ? 'Mark as read' : 'Đánh dấu đã đọc'}
                    aria-label={isEn ? 'Mark as read' : 'Đánh dấu đã đọc'}
                    onClick={(e) => {
                      e.stopPropagation();
                      void markNotificationsRead([notification.id]).catch(() =>
                        toast.error('Chưa đồng bộ trạng thái đã đọc.')
                      );
                    }}
                    className="notif-x notif-x-static w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 grid place-items-center transition-colors shrink-0 mt-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
