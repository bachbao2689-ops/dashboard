import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import { isAdmin, isGlobalManager, isDepartmentLeader } from '../../../lib/roleScope';
import { Avatar } from '../../common/Avatar';
import { formatNotificationTimestamp } from '../notifications/notificationVisual';
import { FileText, CheckCircle2, PlusCircle, MessageSquare, Edit3, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActivityItem {
  id: string;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

interface DashboardActivityHistoryProps {
  users: Array<{
    id: number | string;
    name: string;
    email?: string;
    avatar_url?: string | null;
    role?: string | null;
    employment_level?: string | null;
    department_id?: string | null;
    departments?: { name?: string; id?: string } | null;
  }>;
  className?: string;
}

export const DashboardActivityHistory: React.FC<DashboardActivityHistoryProps> = ({
  users,
  className = '',
}) => {
  const { t, lang } = useTranslation();
  const profile = useAuthStore(state => state.profile);
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, user_id, action, entity_type, entity_id, old_value, new_value, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(80);

      if (!error && data) {
        setLogs(data as ActivityItem[]);
      }
    } catch (err) {
      console.warn('Failed to load dashboard activities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActivities();

    const channel = supabase
      .channel('dashboard-activity-history-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        () => {
          void fetchActivities();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  const userMap = useMemo(() => {
    const map = new Map<string, (typeof users)[0]>();
    users.forEach(u => {
      map.set(String(u.id), u);
    });
    return map;
  }, [users]);

  // Phân quyền theo chỉ thị của bro:
  // - Manager/Admin: Thấy hoạt động của tất cả các Leader.
  // - Leader: Thấy hoạt động của các Staff thuộc phòng ban của mình.
  // - Staff: Thấy hoạt động của các thành viên cùng phòng ban của mình.
  const filteredActivities = useMemo(() => {
    const isUserAdmin = isAdmin(profile);
    const isUserManager = isGlobalManager(profile);
    const isUserLeader = isDepartmentLeader(profile);
    const myDeptId = profile?.department_id ? String(profile.department_id) : null;

    return logs.filter(item => {
      const author = userMap.get(String(item.user_id));
      if (!author) return true; // Nếu log hệ thống không map được tác giả, giữ lại để không mất log

      const authorRole = (author.role || '').toLowerCase();
      const authorLevel = (author.employment_level || '').toLowerCase();
      const isAuthorLeader = authorRole === 'leader' || authorLevel === 'leader';
      const authorDeptId = author.department_id ? String(author.department_id) : null;

      if (isUserAdmin || isUserManager) {
        // Cấp bậc Manager thì thấy các hoạt động của Leader (và Admin)
        return isAuthorLeader || authorRole === 'admin' || authorLevel === 'manager';
      }

      if (isUserLeader) {
        // Cấp Leader thì thấy các hoạt động của Staff thuộc phòng ban của mình
        const isSameDept = myDeptId && authorDeptId && myDeptId === authorDeptId;
        const isStaff = !isAuthorLeader && authorRole !== 'admin';
        return isSameDept && isStaff;
      }

      // Cấp Staff: Thấy hoạt động của các thành viên cùng phòng ban của mình
      if (myDeptId && authorDeptId) {
        return myDeptId === authorDeptId;
      }
      return String(author.id) === String(profile?.id);
    });
  }, [logs, userMap, profile]);

  const getActionBadge = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('done') || act.includes('complete')) {
      return {
        icon: <CheckCircle2 size={10} className="text-emerald-500" />,
        text: lang === 'en' ? 'Done' : 'Xong',
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-800/60',
      };
    }
    if (act.includes('create') || act.includes('add')) {
      return {
        icon: <PlusCircle size={10} className="text-blue-500" />,
        text: lang === 'en' ? 'New' : 'Tạo mới',
        color: 'text-blue-600 dark:text-sky-400 bg-blue-50/90 dark:bg-blue-950/40 border-blue-200/90 dark:border-blue-800/60',
      };
    }
    if (act.includes('comment')) {
      return {
        icon: <MessageSquare size={10} className="text-amber-500" />,
        text: lang === 'en' ? 'Chat' : 'Trao đổi',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/90 dark:border-amber-800/60',
      };
    }
    return {
      icon: <Edit3 size={10} className="text-violet-500" />,
      text: lang === 'en' ? 'Edit' : 'Sửa',
      color: 'text-violet-600 dark:text-violet-400 bg-violet-50/90 dark:bg-violet-950/40 border-violet-200/90 dark:border-violet-800/60',
    };
  };

  const getActionSummary = (item: ActivityItem) => {
    const meta = item.metadata || {};
    const rawTitle = meta.title || meta.task_title || meta.name;
    const fallbackTitle =
      item.entity_type === 'project'
        ? (lang === 'en' ? 'Project' : 'Dự án')
        : item.entity_type === 'campaign'
        ? (lang === 'en' ? 'Campaign' : 'Chiến dịch')
        : (lang === 'en' ? 'Task' : 'Công việc');

    // Filter out raw UUIDs
    const isUuid = typeof rawTitle === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawTitle);
    const displayTitle = !rawTitle || isUuid
      ? fallbackTitle
      : rawTitle.length > 34
      ? `${rawTitle.slice(0, 33)}…`
      : rawTitle;

    const body = meta.body ? `: "${meta.body.slice(0, 24)}${meta.body.length > 24 ? '…' : ''}"` : '';

    const act = (item.action || '').toLowerCase();
    if (act.includes('comment')) {
      return `${lang === 'en' ? 'Note' : 'Ý kiến'}: ${displayTitle}${body}`;
    }
    if (act.includes('complete') || act.includes('done')) {
      return `${lang === 'en' ? 'Done' : 'Đã xong'}: ${displayTitle}`;
    }
    if (act.includes('create') || act.includes('add')) {
      return `${lang === 'en' ? 'Created' : 'Mở mới'}: ${displayTitle}`;
    }
    return `${lang === 'en' ? 'Updated' : 'Cập nhật'}: ${displayTitle}`;
  };

  const handleItemClick = (item: ActivityItem) => {
    if (item.entity_type === 'project' || item.entity_type === 'campaign') {
      navigate('/projects');
    } else {
      navigate(`/tasks?task=${encodeURIComponent(item.entity_id)}`);
    }
  };

  return (
    <section className={`card-hub px-4 pt-4 pb-3 grid grid-cols-1 gap-2 ${className}`}>
      <div className="grid grid-flow-col justify-between items-center mb-1">
        <div className="grid grid-cols-1 gap-0.5">
          <span className="block text-xs font-semibold tracking-[1.8px] uppercase text-gray-500 dark:text-gray-400">
            HISTORY
          </span>
          <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
            {t('dashboard.history')}
          </h2>
        </div>
        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
            {isAdmin(profile) || isGlobalManager(profile)
              ? (lang === 'en' ? 'Leader Activities' : 'Hoạt động Leader')
              : isDepartmentLeader(profile)
              ? (lang === 'en' ? 'Team Activities' : 'Hoạt động Team')
              : (lang === 'en' ? 'Dept Activities' : 'Hoạt động Phòng')}
          </span>
          <i className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-6 text-xs text-gray-400 dark:text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent mb-1" />
          <span>{t('common.loading')}</span>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="grid grid-cols-1 place-items-center text-center py-5">
          <FileText size={22} className="text-[#b9c6d8] dark:text-slate-500 mb-1.5" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('dashboard.noHistory')}</h3>
          <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">
            {isAdmin(profile) || isGlobalManager(profile)
              ? (lang === 'en' ? 'No recent leader activities.' : 'Chưa có hoạt động nào từ các Leader.')
              : isDepartmentLeader(profile)
              ? (lang === 'en' ? 'No recent team activities.' : 'Chưa có hoạt động nào từ nhân viên trong phòng.')
              : t('dashboard.noHistoryDesc')}
          </p>
        </div>
      ) : (
        <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
          {filteredActivities.slice(0, 15).map(item => {
            const author = userMap.get(String(item.user_id));
            const badge = getActionBadge(item.action);
            const summary = getActionSummary(item);

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="w-full text-left p-2 rounded-[8px] border border-gray-100 dark:border-slate-800/90 bg-white/70 dark:bg-[#0a192f]/70 hover:bg-slate-50 dark:hover:bg-[#0f1e36] transition-all cursor-pointer grid grid-cols-[auto_1fr] items-start gap-2 shadow-2xs group"
              >
                <div className="pt-0.5 shrink-0">
                  <Avatar
                    name={author?.name || 'User'}
                    src={author?.avatar_url || undefined}
                    className="w-6 h-6 rounded-full text-[9px] font-bold"
                  />
                </div>
                <div className="min-w-0 grid grid-cols-1 gap-0.5">
                  <div className="grid grid-flow-col auto-cols-max justify-between items-center gap-1">
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[130px]">
                      {author?.name || 'Thành viên'}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded-[4px] text-[9px] font-semibold border grid grid-flow-col auto-cols-max items-center gap-1 ${badge.color}`}>
                      {badge.icon}
                      <span>{badge.text}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-slate-300 font-medium line-clamp-2 leading-tight">
                    {summary}
                  </p>
                  <div className="grid grid-flow-col auto-cols-max justify-between items-center text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                    <time>{formatNotificationTimestamp(item.created_at, lang)}</time>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary dark:text-sky-400 font-semibold grid grid-flow-col auto-cols-max items-center gap-0.5">
                      <span>{lang === 'en' ? 'View' : 'Xem'}</span>
                      <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
