import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Bell,
  Search,
  Plus,
  Clock,
  Pin,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  CheckSquare,
  Layers,
  Sparkles,
  Menu,
  X,
  User,
  Sun,
  Moon,
  Globe,
  LogOut,
  LayoutGrid,
  Check,
  Package,
  Users,
  TrendingUp,
  LayoutDashboard,
  Bot,
  Home
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import { markNotificationsRead } from '../../store/notificationStore';
import { entityLink } from '../../lib/taskTracking';
import { useRecentItemsStore } from '../../store/recentItemsStore';
import { useSidebarPinStore } from '../../store/sidebarPinStore';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';
import { useTasks } from '../../hooks/useTasks';
import { canViewTeamManagement } from '../../lib/roleScope';
import toast from 'react-hot-toast';
import { cn } from '../common/KpiCard';

export interface MobileHomeHubItem {
  id: string;
  title: string;
  type: 'project' | 'campaign' | 'task' | 'subtask';
  dept?: string;
  updatedAt?: string;
  isPinned?: boolean;
  url?: string;
}

export interface MobileHomeHubProps {
  onNavigateProfile?: () => void;
  onOpenSearch?: () => void;
  onCreateTask?: () => void;
  onCreateProject?: () => void;
  onOpenNotifications?: () => void;
  recentItems?: MobileHomeHubItem[];
  pinnedItems?: MobileHomeHubItem[];
}

export const MobileHomeHub: React.FC<MobileHomeHubProps> = ({
  onOpenSearch,
  onCreateTask,
  onCreateProject,
  recentItems,
  pinnedItems
}) => {
  const { t, lang } = useTranslation();
  const { theme, toggleTheme, setLang } = useUiStore();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const isLeader = canViewTeamManagement(profile);
  const badges = useSidebarBadges();
  const isEn = lang === 'en';

  // Live Notification System (Feedback #7)
  const { unread: unreadCount, items: notifItems, history: notifHistory } = useNotificationCenter();
  const allNotifs = notifItems.length > 0 ? notifItems : notifHistory.slice(0, 20);

  // Live Tasks and Pins (Feedback #2: real data per staff account)
  const { tasks = [] } = useTasks();
  const pinnedTaskIds = useSidebarPinStore((s) => s.pinnedIds);
  const pinnedEntities = useSidebarPinStore((s) => s.pinnedEntities);
  const storeRecents = useRecentItemsStore((s) => s.items);

  // States
  const [recentsOpen, setRecentsOpen] = useState(true);
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  // Desktop guard: Immediately redirect to desktop destination if viewport >= 1280
  useEffect(() => {
    const checkViewport = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
        if (canViewTeamManagement(profile)) {
          navigate('/ui-dashboard', { replace: true });
        } else {
          navigate('/my-tasks', { replace: true });
        }
      }
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [profile, navigate]);

  // Dynamic Recent Items: 100% real data from storeRecents (Feedback #2)
  const displayRecents: MobileHomeHubItem[] = (recentItems && recentItems.length > 0)
    ? recentItems.slice(0, 10)
    : storeRecents.slice(0, 10).map((r) => ({
        id: r.id,
        title: r.title,
        type: r.kind,
        dept: r.parentName,
        url: r.path,
      }));

  // Dynamic Pinned Items: 100% real data from pinnedTasks + pinnedEntities (Feedback #2)
  const realPinnedTasks: MobileHomeHubItem[] = pinnedTaskIds.map((taskId) => {
    const t = tasks.find((item) => String(item.id) === String(taskId));
    return t ? {
      id: String(t.id),
      title: t.title,
      type: 'task' as const,
      dept: t.department_id ? String(t.department_id) : undefined,
      url: `/tasks?task=${t.id}`,
      isPinned: true,
    } : null;
  }).filter(Boolean) as MobileHomeHubItem[];

  const realPinnedEntities: MobileHomeHubItem[] = pinnedEntities.map((e) => ({
    id: String(e.id),
    title: e.name,
    type: e.kind as 'project' | 'campaign',
    url: `/projects?${e.kind}=${e.id}`,
    isPinned: true,
  }));

  const displayPinned: MobileHomeHubItem[] = (pinnedItems && pinnedItems.length > 0)
    ? pinnedItems
    : [...realPinnedEntities, ...realPinnedTasks];

  const handleCalendarClick = () => {
    toast(isEn ? 'Calendar coming soon' : 'Tính năng Lịch sắp ra mắt', {
      icon: '📅',
      duration: 2500,
      className: 'text-xs font-semibold'
    });
  };

  const handleItemClick = (item: MobileHomeHubItem) => {
    if (item.url) {
      navigate(item.url);
      return;
    }
    if (item.type === 'project' || item.type === 'campaign') {
      navigate(`/projects?id=${item.id}`);
    } else {
      navigate(`/tasks?task=${item.id}`);
    }
  };

  const getItemIcon = (type: MobileHomeHubItem['type']) => {
    switch (type) {
      case 'project':
        return <FolderKanban size={15} className="text-blue-600 dark:text-sky-400" />;
      case 'campaign':
        return <Layers size={15} className="text-amber-600 dark:text-amber-400" />;
      case 'task':
        return <CheckSquare size={15} className="text-emerald-600 dark:text-emerald-400" />;
      case 'subtask':
        return <CheckSquare size={15} className="text-purple-600 dark:text-purple-400" />;
      default:
        return <Sparkles size={15} className="text-slate-500" />;
    }
  };

  const getItemTypeBadge = (type: MobileHomeHubItem['type']) => {
    switch (type) {
      case 'project':
        return isEn ? 'Project' : 'Dự án';
      case 'campaign':
        return isEn ? 'Campaign' : 'Chiến dịch';
      case 'task':
        return isEn ? 'Task' : 'Đầu việc';
      case 'subtask':
        return isEn ? 'Subtask' : 'Đầu việc con';
      default:
        return '';
    }
  };

  const navTabs = [
    { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={20} strokeWidth={1.8} />, badgeCount: badges.projectCount, desc: isEn ? 'Manage projects and campaigns' : 'Quản lý dự án & chiến dịch' },
    { name: t('nav.home'), path: '/workflow', icon: <Layers size={20} strokeWidth={1.8} />, badgeCount: badges.workflowCount, desc: isEn ? 'Workflow tracks & gate milestones' : 'Tiến độ luồng công việc & gates' },
    { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={20} strokeWidth={1.8} />, desc: isEn ? 'All assigned task items' : 'Toàn bộ đầu việc được giao' },
    { name: t('nav.agent'), path: '/agents', icon: <Bot size={20} strokeWidth={1.8} />, hidden: true, desc: isEn ? 'Ask about work and create task proposals' : 'Hỏi đáp công việc và tạo đề xuất task' },
    { name: t('nav.assets'), path: '/assets', icon: <Package size={20} strokeWidth={1.8} />, badgeCount: badges.borrowCount, desc: isEn ? 'Equipment and inventory items' : 'Thiết bị & mượn trả tài sản' },
    { name: t('nav.team'), path: '/team', icon: <Users size={20} strokeWidth={1.8} />, desc: isEn ? 'Department members and workloads' : 'Nhân sự & khối lượng công việc' },
    { name: t('nav.profile'), path: '/my-tasks', icon: <User size={20} strokeWidth={1.8} />, desc: isEn ? 'My profile and personal calendar' : 'Hồ sơ cá nhân & lịch làm việc' },
    { name: t('nav.reports'), path: '/reports', icon: <TrendingUp size={20} strokeWidth={1.8} />, hidden: !isLeader, desc: isEn ? 'Performance analytics and capacity' : 'Báo cáo năng suất & tải công việc' },
    { name: t('nav.dashboard'), path: '/ui-dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.8} />, hidden: !isLeader, desc: isEn ? 'Executive overview cockpit' : 'Bảng điều khiển tổng quan' },
  ].filter(tab => !tab.hidden);

  return (
    <div className="xl:hidden min-h-screen bg-slate-50/50 dark:bg-[#071325] text-slate-800 dark:text-slate-100 pb-28">
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-30 px-3.5 py-2.5 bg-white/90 dark:bg-[#0a192f]/95 backdrop-blur-xl border-b border-gray-200/70 dark:border-slate-800/80 shadow-2xs">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 max-w-lg mx-auto relative">
          {/* Left: Avatar nhân sự -> Bấm mở Avatar Popover (Feedback #6) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifsOpen(false);
                setAvatarMenuOpen(!avatarMenuOpen);
              }}
              aria-label={t('nav.profile')}
              className="w-9 h-9 rounded-full ring-2 ring-[#002e6d]/20 dark:ring-sky-400/30 overflow-hidden cursor-pointer shadow-2xs grid place-items-center active:scale-95 transition-transform"
            >
              <Avatar name={profile?.name || 'Staff'} src={profile?.avatar_url || undefined} className="w-full h-full text-xs font-bold" />
            </button>

            {/* Avatar Popover Menu (Feedback #6: Theme, Lang, Profile) */}
            {avatarMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/10 dark:bg-black/25"
                  onClick={() => setAvatarMenuOpen(false)}
                />
                <div className="absolute left-0 top-full mt-2 w-64 p-2.5 rounded-[14px] bg-white dark:bg-[#0a192f] border border-gray-200/90 dark:border-slate-700 shadow-2xl z-50 grid grid-cols-1 gap-1.5 animate-in zoom-in-95 duration-150">
                  {/* User Info Card */}
                  <div className="grid grid-cols-[auto_1fr] items-center gap-2.5 p-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/50">
                    <Avatar name={profile?.name || 'Staff'} src={profile?.avatar_url || undefined} className="w-9 h-9 rounded-full text-xs font-bold" />
                    <div className="grid grid-cols-1 min-w-0">
                      <span className="font-bold text-xs text-gray-900 dark:text-white truncate">{profile?.name || 'Staff'}</span>
                      <span className="text-[10px] text-gray-400 truncate">{profile?.email || profile?.role || 'User'}</span>
                    </div>
                  </div>

                  {/* Profile Link */}
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      navigate('/my-tasks');
                    }}
                    className="w-full text-left p-2 rounded-[8px] hover:bg-slate-100 dark:hover:bg-[#0f1e36] text-xs font-semibold text-gray-800 dark:text-slate-200 grid grid-cols-[auto_1fr_auto] items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User size={15} className="text-[#002e6d] dark:text-sky-400" />
                    <span>{isEn ? 'Personal Profile' : 'Hồ sơ cá nhân'}</span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </button>

                  {/* Function: Light / Dark Mode Toggle (Feedback #6) */}
                  <button
                    type="button"
                    onClick={() => toggleTheme()}
                    className="w-full text-left p-2 rounded-[8px] hover:bg-slate-100 dark:hover:bg-[#0f1e36] text-xs font-semibold text-gray-800 dark:text-slate-200 grid grid-cols-[auto_1fr_auto] items-center gap-2 transition-colors cursor-pointer"
                  >
                    {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
                    <span>{isEn ? 'Appearance' : 'Giao diện'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[6px] bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase">
                      {theme === 'dark' ? (isEn ? 'Dark' : 'Tối') : (isEn ? 'Light' : 'Sáng')}
                    </span>
                  </button>

                  {/* Function: Đổi ngôn ngữ (Language Toggle - Feedback #6) */}
                  <button
                    type="button"
                    onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
                    className="w-full text-left p-2 rounded-[8px] hover:bg-slate-100 dark:hover:bg-[#0f1e36] text-xs font-semibold text-gray-800 dark:text-slate-200 grid grid-cols-[auto_1fr_auto] items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Globe size={15} className="text-emerald-500" />
                    <span>{isEn ? 'Language' : 'Ngôn ngữ'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[6px] bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase">
                      {lang === 'vi' ? 'VI' : 'EN'}
                    </span>
                  </button>

                  {/* Logout */}
                  <div className="border-t border-gray-100 dark:border-slate-800 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        useAuthStore.getState().signOut();
                      }}
                      className="w-full text-left p-2 rounded-[8px] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 grid grid-cols-[auto_1fr] items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut size={15} />
                      <span>{isEn ? 'Sign out' : 'Đăng xuất'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Center: Pill card chứa Logo Phúc Sinh + chữ in đậm PHUC SINH CONSUMERS */}
          <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#0a192f] border border-gray-200/90 dark:border-slate-700/80 shadow-2xs mx-auto">
            <img src="/logo-light.svg" alt="Phúc Sinh" className="h-4.5 w-auto block dark:hidden" />
            <img src="/logo-dark.svg" alt="Phúc Sinh" className="h-4.5 w-auto hidden dark:block" />
            <span className="font-extrabold text-[10px] sm:text-[11px] tracking-wider text-[#002e6d] dark:text-sky-300 uppercase select-none">
              PHUC SINH CONSUMERS
            </span>
          </div>

          {/* Right: Nút Calendar tròn + Nút Bell tròn */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
            <button
              type="button"
              onClick={handleCalendarClick}
              title={isEn ? 'Calendar' : 'Lịch làm việc'}
              className="w-9 h-9 rounded-full grid place-items-center bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-700/80 text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-100 dark:hover:bg-[#0f1e36] transition-colors cursor-pointer active:scale-95"
            >
              <Calendar size={16} strokeWidth={2} />
            </button>

            {/* Bell Button (Feedback #7: Fix icon thông báo) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAvatarMenuOpen(false);
                  setNavDrawerOpen(false);
                  setQuickCreateOpen(false);
                  setNotifsOpen(!notifsOpen);
                }}
                title={isEn ? 'Notifications' : 'Thông báo'}
                className="w-9 h-9 relative rounded-full grid place-items-center bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-700/80 text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-100 dark:hover:bg-[#0f1e36] transition-colors cursor-pointer active:scale-95"
              >
                <Bell size={16} strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center ring-2 ring-white dark:ring-[#0a192f]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Panel (Feedback #7) */}
              {notifsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/10 dark:bg-black/25"
                    onClick={() => setNotifsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-[min(340px,calc(100vw-24px))] rounded-[14px] bg-white dark:bg-[#0a192f] border border-gray-200/90 dark:border-slate-700 shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150 grid grid-rows-[auto_1fr]">
                    <div className="p-3 border-b border-gray-100 dark:border-slate-800 grid grid-cols-[1fr_auto] items-center">
                      <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-900 dark:text-white">
                          {isEn ? 'Notifications' : 'Thông báo'}
                        </span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-flow-col auto-cols-max items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void markNotificationsRead()}
                          title={isEn ? 'Mark all as read' : 'Đã đọc tất cả'}
                          className="p-1 text-slate-500 hover:text-primary dark:hover:text-sky-300 rounded-[6px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifsOpen(false)}
                          aria-label={t('common.close')}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-[6px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                      {allNotifs.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          {isEn ? 'No notifications yet' : 'Không có thông báo mới'}
                        </div>
                      ) : (
                        allNotifs.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              void markNotificationsRead([n.id]);
                              setNotifsOpen(false);
                              const href = entityLink(n.entity_type, n.entity_id, n.metadata);
                              if (href) navigate(href);
                            }}
                            className={cn(
                              "w-full text-left p-2 rounded-[8px] grid grid-cols-[auto_1fr] items-start gap-2.5 transition-colors cursor-pointer",
                              n.is_read ? "hover:bg-slate-100/80 dark:hover:bg-slate-800/60 opacity-75" : "bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            )}
                          >
                            <div className="w-7 h-7 rounded-[6px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 grid place-items-center text-[#002e6d] dark:text-sky-300 shrink-0 mt-0.5">
                              <Bell size={13} />
                            </div>
                            <div className="grid grid-cols-1 min-w-0">
                              <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                                {n.title}
                              </span>
                              <p className="text-[11px] text-gray-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. BODY CONTENT (Recents & Favorites/Pins) */}
      <main className="px-3.5 py-4 space-y-4 max-w-lg mx-auto">
        {/* SECTION 1: Recents (Gần đây - 100% Real Tracking) */}
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setRecentsOpen(!recentsOpen)}
            className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 rounded-[8px] bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#0f1e36] transition-colors cursor-pointer shadow-2xs"
          >
            <Clock size={15} className="text-[#002e6d] dark:text-sky-400 shrink-0" />
            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 justify-start text-left">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200">
                {isEn ? 'Recents' : 'Gần đây'}
              </span>
              <span className="text-[11px] text-gray-400 font-medium">({displayRecents.length})</span>
            </div>
            <ChevronDown
              size={15}
              className={cn('text-gray-400 transition-transform duration-200', !recentsOpen && '-rotate-90')}
            />
          </button>

          {recentsOpen && (
            <div className="grid grid-cols-1 gap-2 pt-0.5">
              {displayRecents.length === 0 ? (
                <div className="p-4 text-center rounded-[8px] bg-white dark:bg-[#0a192f] border border-dashed border-gray-300 dark:border-slate-700 text-xs text-slate-400">
                  <Clock size={16} className="mx-auto mb-1 text-slate-400 opacity-60" />
                  <span>{isEn ? 'No recent items yet. Tasks or projects you open will appear here.' : 'Chưa có hoạt động gần đây. Các công việc hoặc dự án bạn xem sẽ xuất hiện tại đây.'}</span>
                </div>
              ) : (
                displayRecents.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 p-2.5 rounded-[8px] bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-[#002e6d]/40 dark:hover:border-sky-500/40 hover:bg-blue-50/20 dark:hover:bg-[#0f1e36] transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <div className="w-8 h-8 rounded-[6px] bg-slate-100 dark:bg-slate-800/80 grid place-items-center shrink-0">
                      {getItemIcon(item.type)}
                    </div>

                    <div className="grid grid-cols-1 min-w-0 text-left">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                        {item.title}
                      </span>
                      <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded-[6px] text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {getItemTypeBadge(item.type)}
                        </span>
                        {item.dept && (
                          <span className="text-[10px] text-slate-400 truncate">
                            • {item.dept}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={15} className="text-slate-400 shrink-0" />
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* SECTION 2: Đã ghim (Favorites / Pins - 100% Real Tracking) */}
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setPinnedOpen(!pinnedOpen)}
            className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 rounded-[8px] bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#0f1e36] transition-colors cursor-pointer shadow-2xs"
          >
            <Pin size={15} className="text-amber-500 fill-amber-500/30 shrink-0" />
            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 justify-start text-left">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200">
                {isEn ? 'Favorites & Pins' : 'Đã ghim'}
              </span>
              <span className="text-[11px] text-gray-400 font-medium">({displayPinned.length})</span>
            </div>
            <ChevronDown
              size={15}
              className={cn('text-gray-400 transition-transform duration-200', !pinnedOpen && '-rotate-90')}
            />
          </button>

          {pinnedOpen && (
            <div className="grid grid-cols-1 gap-2 pt-0.5">
              {displayPinned.length === 0 ? (
                <div className="p-4 text-center rounded-[8px] bg-white dark:bg-[#0a192f] border border-dashed border-gray-300 dark:border-slate-700 text-xs text-slate-400">
                  <Pin size={16} className="mx-auto mb-1 text-slate-400 opacity-60" />
                  <span>{isEn ? 'No pinned items yet. Pin a task or project to access it quickly.' : 'Chưa có mục nào được ghim. Hãy ghim công việc hoặc dự án để truy cập nhanh.'}</span>
                </div>
              ) : (
                displayPinned.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 p-2.5 rounded-[8px] bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-amber-400/50 dark:hover:border-amber-500/40 hover:bg-amber-50/20 dark:hover:bg-[#0f1e36] transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <div className="w-8 h-8 rounded-[6px] bg-amber-50 dark:bg-amber-950/40 grid place-items-center shrink-0">
                      <Pin size={14} className="text-amber-600 dark:text-amber-400 fill-amber-500/20" />
                    </div>

                    <div className="grid grid-cols-1 min-w-0 text-left">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                        {item.title}
                      </span>
                      <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded-[6px] text-[10px] font-semibold bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                          {getItemTypeBadge(item.type)}
                        </span>
                        {item.dept && (
                          <span className="text-[10px] text-slate-400 truncate">
                            • {item.dept}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={15} className="text-slate-400 shrink-0" />
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>

      {/* 3. BOTTOM BAR MOBILE HUB (Feedback #5: Button 3 gạch + Search + (+) Quick Create, XÓA VIỀN NGOÀI) */}
      <div className="fixed left-4 right-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 max-w-sm mx-auto">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
          {/* Button 3 gạch bên trái (Feedback #5) */}
          <button
            type="button"
            onClick={() => { setAvatarMenuOpen(false); setNotifsOpen(false); setQuickCreateOpen(false); setNavDrawerOpen(true); }}
            aria-label="Menu"
            className="w-12 h-12 rounded-full grid place-items-center bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0f1e36] shadow-xl cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          {/* Search Button / Pill ở giữa */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSearch) onOpenSearch();
              else navigate('/tasks?action=search');
            }}
            aria-label={t('header.search')}
            title={t('header.search')}
            className="h-12 rounded-full px-4 bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0f1e36] shadow-xl cursor-pointer grid grid-cols-[auto_1fr] items-center gap-2 transition-all active:scale-98 min-w-0"
          >
            <Search size={16} strokeWidth={2.2} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 truncate text-left">
              {isEn ? 'Search...' : 'Tìm kiếm nhanh...'}
            </span>
          </button>

          {/* Nút tròn Tạo mới nhanh (+) bên phải mở popup */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => { setAvatarMenuOpen(false); setNotifsOpen(false); setNavDrawerOpen(false); setQuickCreateOpen(!quickCreateOpen); }}
              aria-label={isEn ? 'Quick Create' : 'Tạo mới nhanh'}
              className="w-12 h-12 rounded-full grid place-items-center bg-gradient-to-tr from-[#002e6d] to-[#0055b8] text-white shadow-xl shadow-blue-900/30 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus
                size={22}
                strokeWidth={2.4}
                className={cn('transition-transform duration-200', quickCreateOpen && 'rotate-45')}
              />
            </button>

            {/* Quick Create Popup Menu */}
            {quickCreateOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/10 dark:bg-black/25"
                  onClick={() => setQuickCreateOpen(false)}
                />
                <div className="absolute right-0 bottom-full mb-3 w-56 p-1.5 rounded-[12px] bg-white dark:bg-[#0a192f] border border-gray-200/90 dark:border-slate-700 shadow-2xl z-50 grid grid-cols-1 gap-1 animate-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCreateOpen(false);
                      if (onCreateTask) onCreateTask();
                      else navigate('/tasks?action=new');
                    }}
                    className="w-full text-left p-2 rounded-[8px] hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-white grid grid-cols-[auto_1fr] items-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckSquare size={14} className="text-emerald-500" />
                    <span>+ {isEn ? 'New Task' : 'Tạo Task mới'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickCreateOpen(false);
                      if (onCreateProject) onCreateProject();
                      else navigate('/projects?action=new');
                    }}
                    className="w-full text-left p-2 rounded-[8px] hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-white grid grid-cols-[auto_1fr] items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FolderKanban size={14} className="text-blue-500" />
                    <span>+ {isEn ? 'New Project / Campaign' : 'Tạo Project / Campaign mới'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Floating Popover / Context Menu mở từ Button 3 gạch ở Home (Feedback #3 & #5, KHÔNG blur background) */}
      {navDrawerOpen && (
        <div 
          className="fixed inset-0 z-[120] xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? 'Navigation Popover' : 'Menu điều hướng nhanh'}
        >
          {/* Backdrop Overlay nhẹ không blur */}
          <div 
            onClick={() => setNavDrawerOpen(false)}
            className="absolute inset-0 bg-black/10 dark:bg-black/25 transition-opacity"
          />

          {/* Floating Popover Card */}
          <div 
            className="absolute left-4 bottom-[calc(76px+env(safe-area-inset-bottom))] w-[270px] max-h-[75vh] bg-white dark:bg-[#0a192f] rounded-[14px] border border-slate-200/90 dark:border-slate-700/80 shadow-2xl overflow-hidden grid grid-cols-1 grid-rows-[auto_1fr_auto] animate-in zoom-in-95 fade-in duration-200"
          >
            {/* Header: Tiêu đề Danh mục Tabs & nút đóng */}
            <div className="grid grid-cols-[1fr_auto] items-center px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                <LayoutGrid size={13} className="text-[#002e6d] dark:text-sky-400" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {isEn ? 'Dashboard Tabs' : 'Danh mục Dashboard'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNavDrawerOpen(false)}
                aria-label={t('common.close')}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 grid place-items-center transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {/* Scrollable Content: CHỈ HIỂN THỊ CÁC TAB CỦA DASHBOARD (Feedback #3) */}
            <div className="overflow-y-auto px-2 py-1.5 max-h-[calc(75vh-120px)] custom-scrollbar">
              <div className="grid grid-cols-1 gap-1">
                {navTabs.map((tab) => (
                  <NavLink
                    key={tab.name}
                    to={tab.path}
                    onClick={() => setNavDrawerOpen(false)}
                    className={({ isActive }) => cn(
                      "grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-2.5 py-2 rounded-[8px] transition-colors cursor-pointer text-xs font-semibold",
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-sky-300 font-bold border border-blue-200/70 dark:border-blue-800/60"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    )}
                  >
                    <span className="w-5 h-5 grid place-items-center text-slate-500 dark:text-slate-400 shrink-0">
                      {React.cloneElement(tab.icon as React.ReactElement<{ size?: number }>, { size: 15 })}
                    </span>
                    <span className="truncate">{tab.name}</span>
                    {Boolean((tab as any).badgeCount > 0) && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                        {(tab as any).badgeCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* 2 Nút cố định ở đáy: Home + Search */}
            <div className="border-t border-slate-200/70 dark:border-slate-800 p-2 grid grid-cols-2 gap-2 bg-slate-50/90 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setNavDrawerOpen(false)}
                className="grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] bg-white dark:bg-[#0a192f] border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-[#002e6d] dark:text-sky-300 hover:bg-slate-100 dark:hover:bg-[#0f1e36] shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Home size={13} strokeWidth={2.2} />
                <span>{isEn ? 'Home' : 'Trang chủ'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNavDrawerOpen(false);
                  navigate('/tasks?action=search');
                }}
                className="grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] bg-white dark:bg-[#0a192f] border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0f1e36] shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Search size={13} strokeWidth={2.2} />
                <span>{t('header.search')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileHomeHub;
