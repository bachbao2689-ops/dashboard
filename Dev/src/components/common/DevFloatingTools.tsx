import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Settings,
  X,
  RotateCcw,
  Shield,
  Briefcase,
  Palette,
  Megaphone,
  User,
  Users,
  Bell,
  RefreshCw,
  Check,
  Search,
  Database,
  Globe,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceDirectory } from '../../hooks/useWorkspaceData';
import { Avatar } from './Avatar';
import { resolvePreviewAccount, type DirectoryPerson, type PreviewRank } from '../../lib/accountPreview';
import toast from 'react-hot-toast';
import { userCache } from '../../lib/userCache';
import { isGlobalManager, isAdmin, isDepartmentLeader } from '../../lib/roleScope';

const getRankLabel = (p: any): string => {
  if (isAdmin(p)) return 'Admin';
  if (isGlobalManager(p)) return 'Manager';
  if (isDepartmentLeader(p)) return 'Leader';
  return 'Staff';
};

interface DevFloatingToolsProps {
  onTriggerUpdate: () => void;
  onTriggerDemo: () => void;
}

interface DatasetStatus {
  mode: 'local' | 'main';
  switchedAt?: string;
  projectCount?: number;
  campaignCount?: number;
  taskCount?: number;
}

const STORAGE_KEY = 'kcoffee_dev_floating_gear_pos';

const clampToViewport = (x: number, y: number) => {
  if (typeof window === 'undefined') return { x, y };
  return {
    x: Math.max(12, Math.min(window.innerWidth - 60, x)),
    y: Math.max(12, Math.min(window.innerHeight - 68, y)),
  };
};

export const DevFloatingTools: React.FC<DevFloatingToolsProps> = ({
  onTriggerUpdate,
  onTriggerDemo,
}) => {
  const currentProfile = useAuthStore((s) => s.profile);
  const storeOriginalProfile = useAuthStore((s) => s.originalProfile);
  const previewBusy = useAuthStore(s=>s.previewBusy);
  const previewExpiresAt = useAuthStore(s=>s.previewExpiresAt);
  const session = useAuthStore(s=>s.session);
  const directory = useWorkspaceDirectory();
  const allUsers = directory.data?.users || [];
  const departments = directory.data?.departments || [];

  const originalProfile = storeOriginalProfile || currentProfile;
  const isPreviewing = Boolean(originalProfile && (!currentProfile || currentProfile.id !== originalProfile.id));
  const canTest = isAdmin(storeOriginalProfile) && Boolean(session?.user?.id && session.access_token !== 'dev-token');

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'popups'>('roles');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [datasetStatus, setDatasetStatus] = useState<DatasetStatus | null>(null);
  const [switchingMode, setSwitchingMode] = useState<'local' | 'main' | null>(null);

  const fetchDatasetStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/dev/dataset-status');
      if (res.ok) {
        const data = await res.json();
        setDatasetStatus(data);
      }
    } catch {
      // Keep silent fallback
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchDatasetStatus();
    }
  }, [isOpen, fetchDatasetStatus]);

  const handleSwitchDataset = async (targetMode: 'local' | 'main') => {
    if (switchingMode || datasetStatus?.mode === targetMode) return;
    setSwitchingMode(targetMode);
    try {
      const res = await fetch('/api/dev/switch-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Chuyển đổi dữ liệu thất bại');
      }
      toast.success(
        targetMode === 'main'
          ? 'Đã chuyển sang dữ liệu UI MAIN! Đang tải lại…'
          : 'Đã chuyển sang dữ liệu Local UI (Quy trình mẫu)! Đang tải lại…',
        { duration: 1500 }
      );
      setTimeout(() => {
        window.location.reload();
      }, 350);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chưa đổi được nguồn dữ liệu.');
      setSwitchingMode(null);
    }
  };

  // Position state (bottom-right by default, always clamped within current viewport)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return clampToViewport(parsed.x, parsed.y);
        }
      }
    } catch {
      // Ignore fallback
    }
    return {
      x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 76) : 20,
      y: typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 80) : 20,
    };
  });

  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const startDragRef = useRef<{ clientX: number; clientY: number; posX: number; posY: number }>({
    clientX: 0,
    clientY: 0,
    posX: 0,
    posY: 0,
  });

  const savePosition = useCallback((newPos: { x: number; y: number }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos));
    } catch {
      // Ignore
    }
  }, []);

  // Listen to window resize / orientationchange to keep gear button visible
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        const clamped = clampToViewport(prev.x, prev.y);
        savePosition(clamped);
        return clamped;
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [savePosition]);

  // Handle Dragging
  const handleStartDrag = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startDragRef.current = {
      clientX,
      clientY,
      posX: pos.x,
      posY: pos.y,
    };
  };

  const handleMoveDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const deltaX = clientX - startDragRef.current.clientX;
    const deltaY = clientY - startDragRef.current.clientY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMovedRef.current = true;
    }

    const nextX = Math.max(10, Math.min(window.innerWidth - 60, startDragRef.current.posX + deltaX));
    const nextY = Math.max(10, Math.min(window.innerHeight - 68, startDragRef.current.posY + deltaY));

    setPos({ x: nextX, y: nextY });
  }, []);

  const handleEndDrag = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (hasMovedRef.current) {
        setPos((current) => {
          const clamped = clampToViewport(current.x, current.y);
          savePosition(clamped);
          return clamped;
        });
      }
    }
  }, [savePosition]);

  // Window event listeners for mouse & touch
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMoveDrag(e.clientX, e.clientY);
    const onMouseUp = () => handleEndDrag();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMoveDrag(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => handleEndDrag();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleMoveDrag, handleEndDrag]);

  const designDept = departments.find(d => /^(design|thiết kế)$/i.test(d.name.trim()));
  const marketingDept = departments.find(d => /^marketing$/i.test(d.name.trim()));
  const preset = (rank: PreviewRank, deptId?: string | null) =>
    canTest && !previewBusy ? resolvePreviewAccount(allUsers, rank, deptId, originalProfile?.id) : undefined;
  const switchPreset = (rank: PreviewRank, deptId?: string | null) => {
    const person = preset(rank, deptId);
    if (person) switchToStaff(person);
  };

  const syncDepartmentScope = (targetProfile: any) => {
    if (typeof window === 'undefined') return;
    const deptId = targetProfile?.department_id ? String(targetProfile.department_id) : '';
    if (targetProfile?.id) {
      // These are display filters, never authorization. An execution team can
      // own work labelled with a different requesting department.
      userCache.set(targetProfile.id, 'projects.departmentFilter.v2', '');
      userCache.set(targetProfile.id, 'tasks.departmentFilter.v2', '');
      userCache.set(targetProfile.id, 'projects.departmentFilter', '');
      userCache.set(targetProfile.id, 'tasks.departmentFilter', '');
      userCache.set(targetProfile.id, 'reports.departmentFilter', isGlobalManager(targetProfile) ? '' : deptId);
    }
    if (window.location.pathname.includes('/reports')) {
      const url = new URL(window.location.href);
      if (deptId) url.searchParams.set('dept', deptId);
      else url.searchParams.delete('dept');
      window.history.replaceState({}, '', url.toString());
    }
    window.dispatchEvent(new Event('projects:changed'));
    window.dispatchEvent(new Event('campaigns:changed'));
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const resetOriginal = async () => {
    try {
      await useAuthStore.getState().restoreAdmin();
      syncDepartmentScope(useAuthStore.getState().profile);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Chưa khôi phục được scope tài khoản gốc.'); }
  };
  const switchToStaff = async (user: DirectoryPerson) => {
    if (user.is_active === false || !canTest || previewBusy) return;
    try {
      await useAuthStore.getState().setTestActor(Number(user.id));
      syncDepartmentScope(useAuthStore.getState().profile);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Chưa đổi được scope kiểm thử.'); }
  };

  const filteredStaffUsers = useMemo(() => {
    const q = staffSearchQuery.trim().toLowerCase();
    return allUsers.filter((u: any) => {
      if (selectedDeptFilter !== 'all') {
        const uDeptId = String(u.department_id || u.department?.id || '');
        const uDeptName = (u.department?.name || u.departments?.name || u.department_name || '').toLowerCase();
        const matchDept = uDeptId === selectedDeptFilter || uDeptName.includes(selectedDeptFilter.toLowerCase());
        if (!matchDept) return false;
      }
      if (!q) return true;
      const nameMatch = (u.name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const roleMatch = (u.role || '').toLowerCase().includes(q) || (u.employment_level || '').toLowerCase().includes(q) || (u.job_title || '').toLowerCase().includes(q);
      const deptMatch = (u.department?.name || u.departments?.name || u.department_name || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || roleMatch || deptMatch;
    });
  }, [allUsers, staffSearchQuery, selectedDeptFilter]);

  const isCurrent = (rank: PreviewRank, deptId?: string | null) => {
    const person = preset(rank, deptId);
    return Boolean(person && currentProfile && Number(person.id) === currentProfile.id);
  };

  // Panel placement relative to gear button
  const isRightHalf = pos.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 500);
  const isBottomHalf = pos.y > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);

  const panelWidth = typeof window !== 'undefined' ? Math.min(360, window.innerWidth - 20) : 360;
  const panelHeight = 560;
  let popoverLeft = isRightHalf ? pos.x - panelWidth : pos.x + 58;
  let popoverTop = isBottomHalf ? pos.y - panelHeight : pos.y;
  if (typeof window !== 'undefined') {
    popoverLeft = Math.max(10, Math.min(window.innerWidth - panelWidth - 10, popoverLeft));
    popoverTop = Math.max(10, Math.min(window.innerHeight - panelHeight - 10, popoverTop));
  }

  return (
    <>
      {/* Floating Draggable Gear Button */}
      <div
        style={{
          position: 'fixed',
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          zIndex: 9500,
          touchAction: 'none',
        }}
        className="select-none"
      >
        <button
          type="button"
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            handleStartDrag(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            if (e.touches[0]) handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onClick={() => {
            if (!hasMovedRef.current) {
              setIsOpen((prev) => !prev);
            }
          }}
          title="Kéo thả di chuyển · Bấm để mở Dev Tools & Tầm view"
          aria-label="Dev Tools"
          className={`group relative grid place-items-center w-12 h-12 rounded-2xl shadow-xl transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] cursor-grab active:cursor-grabbing border ${
            isOpen
              ? 'bg-[#002e6d] dark:bg-[#132338] text-white border-sky-400 ring-2 ring-sky-400/50'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:scale-105 hover:border-sky-400 dark:hover:border-sky-500'
          } backdrop-blur-md`}
        >
          <Settings
            className={`w-6 h-6 transition-transform duration-300 ${
              isOpen ? 'rotate-90 text-sky-400' : 'group-hover:rotate-45 text-slate-600 dark:text-slate-300'
            }`}
          />
          {/* Mini role indicator badge */}
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500 text-white shadow-sm uppercase tracking-wider">
            {getRankLabel(currentProfile).slice(0, 3).toUpperCase()}
          </span>
        </button>
      </div>

      {/* Floating Popover / Control Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            left: `${popoverLeft}px`,
            top: `${popoverTop}px`,
            width: `${panelWidth}px`,
            maxWidth: 'calc(100vw - 20px)',
            zIndex: 9550,
          }}
          className="dashboard-frosted-glass rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] text-slate-800 dark:text-slate-100 max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto] items-center pb-3 border-b border-slate-200 dark:border-slate-800/80">
            <div className="grid grid-flow-col auto-cols-max items-center gap-2">
              <div className="grid place-items-center w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Dev Tools K COFFEE
                </h4>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">Scope backend & Popups</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid place-items-center w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Active User Info */}
          <div className="my-3 p-2.5 rounded-xl bg-white/55 dark:bg-slate-900/45 backdrop-blur-md border border-white/50 dark:border-slate-700/50 grid gap-1 text-xs">
            <div className="grid grid-cols-[1fr_auto] items-center">
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {currentProfile?.name || 'Dev User'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                {getRankLabel(currentProfile)} · {currentProfile?.department_name || 'Toàn công ty'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 grid grid-flow-col auto-cols-max items-center gap-1">
              <span>Phòng ban:</span>
              <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                {currentProfile?.department_name || currentProfile?.department_id || 'Toàn công ty'}
              </strong>
            </div>
          </div>

          {/* Data Source Switcher: Local UI vs UI MAIN */}
          <div className="mb-3 p-2.5 rounded-xl bg-white/55 dark:bg-slate-900/45 backdrop-blur-md border border-white/50 dark:border-slate-700/50 grid gap-2">
            <div className="grid grid-cols-[1fr_auto] items-center">
              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nguồn dữ liệu / Data Source
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                {(datasetStatus?.mode ?? 'local') === 'main' ? 'UI MAIN' : 'Local UI'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Button 1: Local UI */}
              <button
                type="button"
                disabled={Boolean(switchingMode)}
                onClick={() => handleSwitchDataset('local')}
                className={`group relative grid grid-cols-1 gap-1 p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                  (datasetStatus?.mode ?? 'local') === 'local'
                    ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/40 shadow-sm'
                    : 'border-white/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 hover:border-emerald-300 dark:hover:border-emerald-700/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="grid grid-cols-[1fr_auto] items-center">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                    <div
                      className={`grid place-items-center w-5 h-5 rounded-md ${
                        (datasetStatus?.mode ?? 'local') === 'local'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {switchingMode === 'local' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Database className="w-3 h-3" />
                      )}
                    </div>
                    <span className="text-xs font-bold leading-tight">Local UI</span>
                  </div>
                  {(datasetStatus?.mode ?? 'local') === 'local' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500 text-white uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>

                <div className="grid gap-0.5 pt-0.5">
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 leading-tight">
                    Data ảo / Quy trình mẫu
                  </span>
                  <span className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight">
                    {(datasetStatus?.mode ?? 'local') === 'local'
                      ? `${datasetStatus?.projectCount ?? 7} Dự án · ${datasetStatus?.campaignCount ?? 8} Chiến dịch`
                      : '7 Dự án · 8 Chiến dịch'}
                  </span>
                </div>
              </button>

              {/* Button 2: UI MAIN */}
              <button
                type="button"
                disabled={Boolean(switchingMode)}
                onClick={() => handleSwitchDataset('main')}
                className={`group relative grid grid-cols-1 gap-1 p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                  datasetStatus?.mode === 'main'
                    ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/40 shadow-sm'
                    : 'border-white/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 hover:border-sky-300 dark:hover:border-sky-700/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="grid grid-cols-[1fr_auto] items-center">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                    <div
                      className={`grid place-items-center w-5 h-5 rounded-md ${
                        datasetStatus?.mode === 'main'
                          ? 'bg-sky-500 text-white'
                          : 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      {switchingMode === 'main' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Globe className="w-3 h-3" />
                      )}
                    </div>
                    <span className="text-xs font-bold leading-tight">UI MAIN</span>
                  </div>
                  {datasetStatus?.mode === 'main' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-sky-500 text-white uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>

                <div className="grid gap-0.5 pt-0.5">
                  <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 leading-tight">
                    Data nhánh Main
                  </span>
                  <span className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight">
                    {datasetStatus?.mode === 'main'
                      ? `${datasetStatus?.projectCount ?? 38} Dự án · ${datasetStatus?.campaignCount ?? 11} Chiến dịch`
                      : '38 dự án · 11 chiến dịch từ Main'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-200/60 dark:bg-slate-950/55 backdrop-blur-md border border-white/30 dark:border-slate-800/60 mb-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'roles'
                  ? 'bg-white dark:bg-[#132338] text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tầm view cấp bậc
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('popups')}
              className={`py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'popups'
                  ? 'bg-white dark:bg-[#132338] text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Test Popups
            </button>
          </div>

          {/* Tab 1: Role Preview Switcher */}
          {activeTab === 'roles' && (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 max-h-[440px] overflow-y-auto pr-0.5">
              {!canTest && <p role="status" className="text-xs text-slate-500 dark:text-slate-400">Đăng nhập Admin thật để kiểm thử quyền backend. Phiên demo không cấp quyền dữ liệu.</p>}
              {/* Preview Alert Banner */}
              {isPreviewing && (
                <div className="min-w-0 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 grid grid-cols-[minmax(0,1fr)] gap-1.5 text-xs">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 font-bold">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{previewBusy ? 'Đang xác nhận scope…' : 'Đang kiểm thử theo quyền của:'}</span>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {currentProfile?.name} ({getRankLabel(currentProfile)} · {currentProfile?.department_name || 'Toàn công ty'})
                  </p>
                  {previewExpiresAt && <p>Phiên kết thúc lúc {new Date(previewExpiresAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}. Thao tác sẽ lưu dữ liệu thật.</p>}
                  <p>Đổi hồ sơ, mật khẩu và cài thông báo thiết bị cần khôi phục tài khoản gốc.</p>
                  <button
                    type="button"
                    onClick={resetOriginal}
                    disabled={previewBusy}
                    className="mt-1 min-h-11 w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    Khôi phục tài khoản Admin gốc
                  </button>
                </div>
              )}

              {/* SECTION A: Quick Presets */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Chọn nhanh cấp bậc mẫu
                </p>
                <div className="grid gap-1.5">
                  {/* 1. ADMIN */}
                  <button
                    type="button"
                    disabled={!preset('admin')}
                    onClick={() => switchPreset('admin')}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isCurrent('admin')
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-1 ring-sky-500/40'
                        : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 grid place-items-center">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Admin</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Toàn quyền, xem tất cả phòng ban</p>
                    </div>
                    {isCurrent('admin') && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                  </button>

                  {/* 2. MANAGER */}
                  <button
                    type="button"
                    disabled={!preset('manager')}
                    onClick={() => switchPreset('manager')}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isCurrent('manager')
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-1 ring-sky-500/40'
                        : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 grid place-items-center">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Manager</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Quản lý toàn bộ, xem tất cả báo cáo</p>
                    </div>
                    {isCurrent('manager') && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                  </button>

                  {/* 3. LEADER DESIGN */}
                  <button
                    type="button"
                    disabled={!preset('leader', designDept?.id)}
                    onClick={() => switchPreset('leader', designDept?.id)}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isCurrent('leader', designDept?.id)
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-1 ring-sky-500/40'
                        : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400 grid place-items-center">
                      <Palette className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Leader Design</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Toàn đội Design · ngoài đội theo lời mời</p>
                    </div>
                    {isCurrent('leader', designDept?.id) && (
                      <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    )}
                  </button>

                  {/* 4. LEADER MARKETING */}
                  <button
                    type="button"
                    disabled={!preset('leader', marketingDept?.id)}
                    onClick={() => switchPreset('leader', marketingDept?.id)}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isCurrent('leader', marketingDept?.id)
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-1 ring-sky-500/40'
                        : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 grid place-items-center">
                      <Megaphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Leader Marketing</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Toàn đội Marketing · ngoài đội theo lời mời</p>
                    </div>
                    {isCurrent('leader', marketingDept?.id) && (
                      <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    )}
                  </button>

                  {/* 5. STAFF DESIGN */}
                  <button
                    type="button"
                    disabled={!preset('staff', designDept?.id)}
                    onClick={() => switchPreset('staff', designDept?.id)}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isCurrent('staff', designDept?.id)
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/40'
                        : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Staff Design</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Tài khoản Staff thuộc Design
                      </p>
                    </div>
                    {isCurrent('staff', designDept?.id) && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </button>

                  {/* 6. STAFF MARKETING */}
                  <button
                    type="button"
                    disabled={!preset('staff', marketingDept?.id)}
                    onClick={() => switchPreset('staff', marketingDept?.id)}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isCurrent('staff', marketingDept?.id)
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/40'
                        : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 grid place-items-center">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Staff Marketing</p>
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                        Tài khoản Staff thuộc Marketing
                      </p>
                    </div>
                    {isCurrent('staff', marketingDept?.id) && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* SECTION B: Full Staff Directory Selector */}
              <div className="min-w-0 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <div className="grid grid-flow-col justify-between items-center mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Xem tầm view của từng Staff ({filteredStaffUsers.length}/{allUsers.length})
                  </p>
                </div>

                {/* Search input */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Tìm tên nhân viên, chức danh, email..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                {/* Department filter pills */}
                <div className="grid grid-flow-col auto-cols-max gap-1 overflow-x-auto pb-1 mb-2 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedDeptFilter('all')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                      selectedDeptFilter === 'all'
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Tất cả
                  </button>
                  {departments.map((d: any) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDeptFilter(String(d.id))}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer shrink-0 ${
                        selectedDeptFilter === String(d.id)
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>

                {/* Scrollable Staff List */}
                <div className="grid gap-1.5 max-h-[190px] overflow-y-auto pr-0.5">
                  {filteredStaffUsers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 italic">
                      Không tìm thấy nhân sự phù hợp
                    </div>
                  ) : (
                    filteredStaffUsers.map((user: any) => {
                      const isUserActive = currentProfile && Number(currentProfile.id) === Number(user.id);
                      const deptName = user.departments?.name || user.department?.name || user.department_name || 'Chưa phân phòng';
                      return (
                        <button
                          key={user.id}
                          type="button"
                          disabled={!canTest || previewBusy}
                          onClick={() => switchToStaff(user)}
                          className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-1.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isUserActive
                              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/50'
                              : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                          }`}
                        >
                          <Avatar
                            name={user.name}
                            src={user.avatar_url || undefined}
                            className="w-7 h-7 text-[10px] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight truncate text-slate-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {deptName} · {user.role || 'member'} ({user.employment_level || user.job_title || 'Staff'})
                            </p>
                          </div>
                          {isUserActive && (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Reset to Original Button */}
              <button
                type="button"
                onClick={resetOriginal}
                className="mt-1 w-full grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục tài khoản Admin gốc</span>
              </button>
            </div>
          )}

          {/* Tab 2: Popups */}
          {activeTab === 'popups' && (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => {
                  onTriggerUpdate();
                }}
                className="grid grid-cols-[auto_1fr] items-center gap-2.5 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <div className="text-left">
                  <p className="leading-tight">Test update badge</p>
                  <p className="text-[10px] text-emerald-100 font-normal">Báo có bản cập nhật ở Software Update</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTriggerDemo();
                }}
                className="grid grid-cols-[auto_1fr] items-center gap-2.5 p-2.5 rounded-xl bg-[#002e6d] hover:bg-[#001f4d] text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
              >
                <Bell className="w-4 h-4" />
                <div className="text-left">
                  <p className="leading-tight">Test notification popup</p>
                  <p className="text-[10px] text-blue-200 font-normal">Đẩy popup thông báo task/comment mẫu</p>
                </div>
              </button>

              <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal">
                💡 Nút bánh răng có thể <strong>kéo thả di chuyển</strong> tự do đến bất kỳ góc nào trên màn hình.
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
