import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { useAuthStore, type StaffProfile } from '../../store/authStore';
import { useWorkspaceData } from '../../hooks/useWorkspaceData';

interface DevFloatingToolsProps {
  onTriggerUpdate: () => void;
  onTriggerDemo: () => void;
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
  const { departments } = useWorkspaceData();

  // Snapshot original profile so user can reset anytime
  const originalProfileRef = useRef<StaffProfile | null>(null);
  useEffect(() => {
    if (currentProfile && !originalProfileRef.current) {
      originalProfileRef.current = { ...currentProfile };
    }
  }, [currentProfile]);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'popups'>('roles');

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

  // Find standard departments with exact Supabase UUIDs
  const fallbackDesignDept = { id: '1a9a3e77-2025-41f2-9a07-d4c785dd8135', name: 'Design' };
  const fallbackMarketingDept = { id: 'dea85847-2e5d-4258-ba6d-900dde8f6ed0', name: 'MARKETING' };
  const designDept = departments.find((d) => String(d.id) === fallbackDesignDept.id || /design|thiết kế/i.test(d.name)) || fallbackDesignDept;
  const marketingDept = departments.find((d) => String(d.id) === fallbackMarketingDept.id || /marketing/i.test(d.name)) || fallbackMarketingDept;

  const switchRole = (
    role: string,
    employment_level: string,
    dept?: { id: string; name: string } | null,
    mockName?: string,
    mockId?: number
  ) => {
    if (!originalProfileRef.current && currentProfile) {
      originalProfileRef.current = { ...currentProfile };
    }
    useAuthStore.setState({
      profile: {
        ...(currentProfile || {
          id: mockId || 99999,
          name: 'Dev User',
          email: 'dev@kcoffee.com',
          avatar_url: null,
          is_active: true,
          auth_id: null,
          job_title: null,
        }),
        id: mockId != null ? mockId : (currentProfile?.id || 99999),
        name: mockName || currentProfile?.name || 'Dev User',
        role,
        employment_level,
        department_id: dept ? String(dept.id) : null,
        department_name: dept ? dept.name : null,
      },
    });

    if (typeof window !== 'undefined' && window.location.pathname.includes('/reports')) {
      const url = new URL(window.location.href);
      if (dept?.id) {
        url.searchParams.set('dept', String(dept.id));
      } else {
        url.searchParams.delete('dept');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const resetOriginal = () => {
    if (originalProfileRef.current) {
      useAuthStore.setState({ profile: { ...originalProfileRef.current } });
    }
  };

  // Determine current active preview role
  const isCurrent = (role: string, level: string, deptId?: string | null) => {
    if (!currentProfile) return false;
    const sameRole = currentProfile.role === role;
    const sameLevel = (currentProfile.employment_level || '').toLowerCase() === level.toLowerCase();
    if (deptId === undefined) return sameRole && sameLevel;
    const sameDept = String(currentProfile.department_id || '') === String(deptId || '');
    return sameRole && sameLevel && sameDept;
  };

  // Panel placement relative to gear button
  const isRightHalf = pos.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 500);
  const isBottomHalf = pos.y > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);

  const panelWidth = typeof window !== 'undefined' ? Math.min(320, window.innerWidth - 20) : 320;
  const panelHeight = 440;
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
          className={`group relative grid place-items-center w-12 h-12 rounded-2xl shadow-xl transition-all duration-200 cursor-grab active:cursor-grabbing border ${
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
            {currentProfile?.role === 'admin'
              ? 'ADM'
              : currentProfile?.role === 'manager'
              ? 'MGR'
              : currentProfile?.role === 'leader'
              ? 'LDR'
              : 'STF'}
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
          className="dashboard-frosted-glass rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 max-h-[85vh] overflow-y-auto"
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
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">Tầm view cấp bậc & Popups</p>
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
                {currentProfile?.role} · {currentProfile?.employment_level || 'N/A'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 grid grid-flow-col auto-cols-max items-center gap-1">
              <span>Phòng ban:</span>
              <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                {currentProfile?.department_name || currentProfile?.department_id || 'Toàn công ty'}
              </strong>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-200/60 dark:bg-slate-950/55 backdrop-blur-md border border-white/30 dark:border-slate-800/60 mb-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`py-1.5 rounded-md transition-all cursor-pointer ${
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
              className={`py-1.5 rounded-md transition-all cursor-pointer ${
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
            <div className="grid gap-1.5 max-h-[260px] overflow-y-auto pr-0.5">
              {/* 1. ADMIN */}
              <button
                type="button"
                onClick={() => switchRole('admin', 'Admin', null, 'ADMIN', 1)}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent('admin', 'Admin')
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200'
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
                {isCurrent('admin', 'Admin') && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
              </button>

              {/* 2. MANAGER */}
              <button
                type="button"
                onClick={() => switchRole('manager', 'Manager', null, 'Manager Toàn Công Ty', 99999)}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent('manager', 'Manager')
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200'
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
                {isCurrent('manager', 'Manager') && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
              </button>

              {/* 3. LEADER DESIGN */}
              <button
                type="button"
                onClick={() => switchRole('leader', 'Leader', designDept, 'Leader Design (Nga Phạm)', 9)}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent('leader', 'Leader', designDept?.id)
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200'
                    : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400 grid place-items-center">
                  <Palette className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Leader Design</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Trưởng phòng Thiết kế, quyền Design</p>
                </div>
                {isCurrent('leader', 'Leader', designDept?.id) && (
                  <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                )}
              </button>

              {/* 4. LEADER MARKETING */}
              <button
                type="button"
                onClick={() => switchRole('leader', 'Leader', marketingDept, 'Leader Marketing', 13)}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent('leader', 'Leader', marketingDept?.id)
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200'
                    : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 grid place-items-center">
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Leader Marketing</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Trưởng phòng Mkt (bị khóa phòng khác)</p>
                </div>
                {isCurrent('leader', 'Leader', marketingDept?.id) && (
                  <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                )}
              </button>

              {/* 5. STAFF DESIGN (FIX CỨNG TẦM VIEW REPORT VÀO DESIGN) */}
              <button
                type="button"
                onClick={() => switchRole('member', 'Staff', designDept, 'Staff Design (Bách Bảo)', 11)}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent('member', 'Staff', designDept?.id)
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                    : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Staff Design</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Fix cứng tầm view vào Design
                  </p>
                </div>
                {isCurrent('member', 'Staff', designDept?.id) && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>

              {/* 6. STAFF MARKETING (FIX CỨNG TẦM VIEW REPORT VÀO MARKETING) */}
              <button
                type="button"
                onClick={() => switchRole('member', 'Staff', marketingDept, 'Staff Marketing', 16)}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent('member', 'Staff', marketingDept?.id)
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                    : 'border-white/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500/70 bg-white/55 dark:bg-slate-900/35 backdrop-blur-sm'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 grid place-items-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Staff Marketing</p>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                    Fix cứng tầm view vào Marketing
                  </p>
                </div>
                {isCurrent('member', 'Staff', marketingDept?.id) && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>

              {/* Reset to Original */}
              <button
                type="button"
                onClick={resetOriginal}
                className="mt-1 grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục tài khoản gốc</span>
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
                  <p className="leading-tight">Test update popup</p>
                  <p className="text-[10px] text-emerald-100 font-normal">Kích hoạt banner bản cập nhật mới</p>
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
