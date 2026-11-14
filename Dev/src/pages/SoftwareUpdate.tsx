import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUiStore } from '../store/uiStore';
import {
  appUpdateService,
  SOFTWARE_RELEASE_LABEL,
  type UpdateInfo,
} from '../services/appUpdateService';
import { SidebarMechanismModal } from '../components/layouts/SidebarMechanismModal';

export const SOFTWARE_UPDATE_NOTES_VI = [
  'Light Mode & Giao diện mới: đồng bộ hiệu ứng Liquid Glass, độ tương phản và modal phủ toàn màn hình trên Sidebar; làm gọn nhãn trạng thái (bỏ dấu chấm đầu).',
  'Thao tác thông minh (Smart UX/UI): bảng chi tiết tự thu gọn khi bấm ra khoảng trống nhưng giữ nguyên khi thao tác nút/tác vụ; popup Xóa/Ẩn neo gọn ngay tại nút bấm.',
  'Tab Software Update & Cơ chế: chuyển thông báo kiểm tra cập nhật (Update now) và tài liệu Cơ chế vận hành vào menu cá nhân, loại bỏ popup gián đoạn khi mở app.',
  'Hồ sơ & Thông báo nâng cấp: gom Chỉnh sửa hồ sơ và công tắc Tắt thông báo nhanh vào menu cài đặt (bánh răng) ở tab Profile; ghim thông báo nổi góc trên phải và mở rộng xem toàn bộ lịch sử.',
  'Tinh chỉnh UX/UI các tab: hoàn thiện bố cục, xuống dòng tiêu đề dài và bộ lọc ở Workflow, Dự án / Chiến dịch, Công việc, Năng suất Team, Kho thiết bị và Mobile.',
] as const;

export const SOFTWARE_UPDATE_NOTES_EN = [
  'Light Mode & Visual Refresh: unified Liquid Glass surfaces, clearer contrast, full-viewport modals above the Sidebar, and cleaner dot-free status pills.',
  'Smart UX/UI Interactions: detail drawers collapse only when clicking empty canvas while staying open on control clicks; Delete/Hide confirmations anchor cleanly beside the action button.',
  'Software Update & Operating Guide Tab: moved version checks (Update now) and the inline Operating Guide into the account menu, removing startup update popups.',
  'Profile Settings & Notifications: unified Edit Profile and a quick Mute Notifications switch in the Profile gear menu; pinned toast notifications to the top-right corner with unlimited list expansion.',
  'Cross-Tab UX/UI Refinements: polished layout, multiline title wrapping, and filters across Workflow, Projects / Campaigns, Task List, Team Workload, Asset Inventory, and Mobile.',
] as const;

export const SOFTWARE_UPDATE_NOTES = SOFTWARE_UPDATE_NOTES_VI;

export type UpdateStatusPhase = 'checking' | 'update_available' | 'up_to_date';

export const SoftwareUpdate: React.FC = () => {
  const lang = useUiStore((s) => s.lang);
  const isEn = lang === 'en';

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(() =>
    appUpdateService.getUpdateInfo()
  );
  const [statusPhase, setStatusPhase] = useState<UpdateStatusPhase>('checking');
  const [showMechanismInline, setShowMechanismInline] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const runUpdateCheck = useCallback(async (cancelledRef?: { current: boolean }) => {
    setStatusPhase('checking');

    try {
      const [hasNewVersion, hasWaitingSw] = await Promise.all([
        appUpdateService.checkForUpdates(true),
        appUpdateService.hasWaitingServiceWorker(),
        new Promise<void>((resolve) => setTimeout(resolve, 420)),
      ]);

      if (cancelledRef?.current) return;

      const available = Boolean(
        hasNewVersion || hasWaitingSw || appUpdateService.getUpdateInfo()
      );
      setStatusPhase(available ? 'update_available' : 'up_to_date');
    } catch {
      if (!cancelledRef?.current) {
        setStatusPhase(appUpdateService.getUpdateInfo() ? 'update_available' : 'up_to_date');
      }
    }
  }, []);

  useEffect(() => {
    const cancelledRef = { current: false };
    void runUpdateCheck(cancelledRef);

    const unsubscribe = appUpdateService.subscribe((info) => {
      setUpdateInfo(info);
      if (info) {
        setStatusPhase('update_available');
      }
    });

    return () => {
      cancelledRef.current = true;
      unsubscribe();
    };
  }, [runUpdateCheck]);

  const handleUpdateAction = async () => {
    if (isUpdating || statusPhase === 'checking') return;

    if (statusPhase === 'up_to_date') {
      await runUpdateCheck();
      return;
    }

    setIsUpdating(true);
    try {
      toast.loading(
        isEn ? 'Applying update...' : 'Đang cập nhật phiên bản mới...',
        { id: 'app-update-action' }
      );
      await appUpdateService.reloadApp();
    } finally {
      setIsUpdating(false);
    }
  };

  const hasAvailableUpdate = statusPhase === 'update_available' || Boolean(updateInfo);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 pb-16 pt-1">
      {/* Page Header: Title + Version + Update badge on left; Cơ chế + Action button on right */}
      <header className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center gap-4 px-1">
        <div className="grid grid-flow-row sm:grid-flow-col auto-cols-max items-start sm:items-center gap-2.5">
          <div className="inline-grid grid-flow-col auto-cols-max items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
              Software Update
            </h1>
            <span className="inline-grid place-items-center px-2.5 py-0.5 rounded-[6px] bg-[#002e6d] dark:bg-sky-600 text-white text-[11px] font-extrabold tracking-wide leading-tight shadow-2xs">
              {SOFTWARE_RELEASE_LABEL}
            </span>
          </div>

          {hasAvailableUpdate && statusPhase !== 'checking' && (
            <span
              role="status"
              className="inline-grid place-items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/12 text-[#002e6d] border border-sky-300/60 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/35"
            >
              {isEn ? 'New update available' : 'Có bản cập nhật mới'}
            </span>
          )}
        </div>

        <div className="grid grid-flow-col auto-cols-max items-center gap-2 justify-self-start sm:justify-self-end">
          <button
            type="button"
            aria-expanded={showMechanismInline}
            onClick={() => setShowMechanismInline((prev) => !prev)}
            title={isEn ? 'Read me / Mechanism' : 'Read me / Cơ chế'}
            className={`h-9 px-4 rounded-[8px] border text-xs font-semibold shadow-2xs transition-all cursor-pointer inline-grid grid-flow-col auto-cols-max items-center gap-1.5 ${
              showMechanismInline
                ? 'bg-[#002e6d] text-white border-[#002e6d] dark:bg-sky-600 dark:border-sky-500'
                : 'border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-[#0f1e36] text-gray-800 dark:text-slate-100 hover:text-[#002e6d] hover:border-blue-300/80 hover:bg-blue-50/70 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen
              size={14}
              className={showMechanismInline ? 'text-white' : 'text-[#002e6d] dark:text-sky-400'}
            />
            <span>{isEn ? 'Mechanism' : 'Cơ chế'}</span>
          </button>

          <button
            type="button"
            disabled={isUpdating || statusPhase === 'checking'}
            onClick={() => void handleUpdateAction()}
            className={`h-9 px-4 rounded-[8px] text-xs font-bold transition-all cursor-pointer inline-grid grid-flow-col auto-cols-max items-center gap-1.5 disabled:opacity-75 disabled:cursor-wait ${
              hasAvailableUpdate && statusPhase !== 'checking'
                ? 'btn-add-new text-white shadow-sm'
                : 'border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-[#0f1e36] text-gray-800 dark:text-slate-100 hover:text-[#002e6d] hover:border-blue-300/80 hover:bg-blue-50/70 dark:hover:bg-slate-800 shadow-2xs'
            }`}
          >
            <RefreshCw
              size={13}
              className={isUpdating || statusPhase === 'checking' ? 'animate-spin' : ''}
            />
            <span>
              {statusPhase === 'checking'
                ? 'Checking for update...'
                : isUpdating
                  ? isEn
                    ? 'Updating...'
                    : 'Đang cập nhật...'
                  : hasAvailableUpdate
                    ? 'Update now'
                    : isEn
                      ? 'Up to date'
                      : 'Đang ở bản mới nhất'}
            </span>
          </button>
        </div>
      </header>

      {/* Release Details Card */}
      <section
        aria-labelledby="software-update-details-title"
        className="card-hub rounded-[14px] p-5 sm:p-6 border border-white/90 dark:border-slate-800/80 space-y-3.5"
      >
        <h2
          id="software-update-details-title"
          className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight"
        >
          {isEn ? 'Update Details' : 'Chi tiết bản cập nhật'}
        </h2>

        <ul className="grid grid-cols-1 gap-3 pl-0 list-none text-xs sm:text-[13px] font-medium text-gray-700 dark:text-slate-200 leading-relaxed">
          {(isEn ? SOFTWARE_UPDATE_NOTES_EN : SOFTWARE_UPDATE_NOTES_VI).map((note) => (
            <li
              key={note}
              className="grid grid-cols-[auto_1fr] items-start gap-2.5"
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-[#002e6d] dark:bg-sky-400 shrink-0 mt-1.5"
              />
              <span className="font-semibold text-gray-800 dark:text-slate-100">{note}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Inline Mechanism Guide inside Software Update tab (no fullscreen popup) */}
      <SidebarMechanismModal
        open={showMechanismInline}
        inline
        onClose={() => setShowMechanismInline(false)}
        lang={lang}
      />
    </div>
  );
};

export default SoftwareUpdate;
