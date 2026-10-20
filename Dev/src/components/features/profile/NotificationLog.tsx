import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { markNotificationsRead } from '../../../store/notificationStore';
import { useNotificationCenter } from '../../../hooks/useNotificationCenter';
import { useWorkspaceRealtime } from '../../../hooks/useWorkspaceRealtime';
import { workspaceScope } from '../../../services/workspaceResources';
import { entityLink } from '../../../lib/taskTracking';
import { NotificationIcon, TONES, toneOf, toneStyle, PicText } from '../notifications/notificationVisual';
import { useTranslation } from '../../../i18n/translations';

type NotificationEntry = {
  id: string;
  user_id: number;
  type?: string | null;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read?: boolean | null;
  created_at: string;
  title?: string;
  metadata?: Record<string, unknown>;
};

const defaultTitles: Record<string, string> = {
  task_completed: 'Task completed',
  task_comment: 'Bình luận mới',
  weekly_report: 'Weekly Report mới',
  report_reminder: 'Nhắc report',
  task_assigned: 'Task mới được giao',
  task_updated: 'Cập nhật task',
  project_assigned: 'Dự án được giao',
  campaign_assigned: 'Chiến dịch được giao',
  project_comment: 'Bình luận dự án',
  campaign_comment: 'Bình luận chiến dịch',
  phase_assigned: 'Chặng được giao',
  phase_updated: 'Cập nhật chặng',
  phase_completed: 'Hoàn thành chặng',
  phase_ready: 'Chặng tiếp theo',
  project_updated: 'Cập nhật dự án',
  campaign_updated: 'Cập nhật chiến dịch',
  system: 'Thông báo',
};

const resolveTitle = (type?: string | null, fallback = 'Hoạt động nội bộ') => {
  if (!type) return fallback;
  return defaultTitles[type] || fallback;
};

export const NotificationLog: React.FC<{
  includeTeam?: boolean;
  onClose?: () => void;
  inline?: boolean;
  onOpenEntity?: (type: string, id: string) => boolean;
}> = ({ includeTeam = false, onClose, inline = false, onOpenEntity }) => {
  const profile = useAuthStore(state => state.profile);
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const center = useNotificationCenter();
  const scope = workspaceScope();
  const [teamScope, setTeamScope] = useState("");
  const reload = useRef<() => void>(() => {});
  const [teamEntries, setEntries] = useState<NotificationEntry[]>([]);
  const [teamLoading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  const personalEntries = useMemo(() => {
    return (center.history.filter(item => item.user_id === profile?.id).slice(0, 50) as NotificationEntry[]).map(entry => ({
      ...entry,
      title: entry.title || resolveTitle(entry.type)
    }));
  }, [center.history, profile?.id]);

  const entries = includeTeam ? (teamScope === scope ? teamEntries : []) : personalEntries;
  const loading = includeTeam ? teamLoading : Boolean(profile && !center.ready);

  useWorkspaceRealtime(['notifications'], () => reload.current(), includeTeam ? profile?.id : undefined);

  useEffect(() => {
    if (!includeTeam) return;
    let active = true;
    const load = async () => {
      if (!profile?.id) {
        if (active) { setEntries([]); setLoading(false); }
        return;
      }
      setLoading(true);
      let teamQuery = supabase.from('users').select('id,name').eq('is_active', true);
      if (!includeTeam || (!profile.department_id && profile.role !== 'admin' && profile.role !== 'manager')) {
        teamQuery = teamQuery.eq('id', profile.id);
      } else if (profile.role !== 'admin' && profile.role !== 'manager' && profile.department_id) {
        teamQuery = teamQuery.eq('department_id', profile.department_id);
      }
      const { data: team, error: teamError } = await teamQuery;
      const recipientIds = [...new Set([profile.id, ...(team || []).map((member: any) => member.id)])];
      const { data, error } = await supabase
        .from('notifications')
        .select('id,user_id,type,message,entity_type,entity_id,is_read,created_at,metadata')
        .in('user_id', recipientIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!active) return;
      if (teamError) console.warn('Could not load team notification recipients:', teamError.message);
      if (error) console.warn('Could not load notification log:', error.message);

      const seen = new Set<string>();
      const unique = ((data || []) as NotificationEntry[]).filter(entry => {
        const key = includeTeam ? `${entry.type}:${entry.entity_id}:${entry.message}:${entry.created_at.slice(0, 19)}` : entry.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const mapped = unique.map(entry => ({
        ...entry,
        title: entry.title || resolveTitle(entry.type)
      }));

      setEntries(mapped.slice(0, 50));
      setTeamScope(scope);
      setLoading(false);
    };

    reload.current = () => {
      if (document.visibilityState === 'visible') void load();
    };
    void load();
    return () => {
      active = false;
      reload.current = () => {};
    };
  }, [includeTeam, profile?.department_id, profile?.id, profile?.role, scope]);

  const unreadCount = useMemo(() => {
    return entries.filter(entry => !entry.is_read && entry.user_id === profile?.id).length;
  }, [entries, profile?.id]);

  const clearAll = async () => {
    if (!profile?.id || markingRead) return;
    setMarkingRead(true);
    try {
      const unreadIds = entries
        .filter(entry => !entry.is_read && entry.user_id === profile.id)
        .map(entry => entry.id);

      if (unreadIds.length > 0) {
        await markNotificationsRead(unreadIds);
      } else {
        await markNotificationsRead();
      }

      setEntries(current => current.map(entry => entry.user_id === profile.id ? { ...entry, is_read: true } : entry));
      toast.success(lang === 'en' ? 'Marked all as read' : 'Đã đánh dấu đã đọc tất cả');
    } catch {
      toast.error(lang === 'en' ? 'Could not mark as read. Please try again.' : 'Chưa cập nhật được thông báo. Vui lòng thử lại.');
    } finally {
      setMarkingRead(false);
    }
  };

  const dismissSingle = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    try {
      await markNotificationsRead([entryId]);
      setEntries(current => current.map(item => item.id === entryId ? { ...item, is_read: true } : item));
    } catch {
      toast.error(lang === 'en' ? 'Could not sync read status.' : 'Chưa đồng bộ trạng thái đã đọc.');
    }
  };

  const openNotification = (entry: NotificationEntry) => {
    if (entry.user_id === profile?.id && !entry.is_read) {
      void markNotificationsRead([entry.id]).catch(() => {});
      setEntries(current => current.map(item => item.id === entry.id ? { ...item, is_read: true } : item));
    }
    const handled = entry.metadata?.target === 'workflow' ? false : onOpenEntity?.(entry.entity_type!, entry.entity_id!);
    if (handled) return;
    const link = entityLink(entry.entity_type, entry.entity_id, entry.metadata);
    if (link) {
      onClose?.();
      navigate(link);
    }
  };

  return (
    <div className={inline ? 'flex flex-col' : 'card-hub flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-gray-100 shadow-sm dark:border-slate-700/50 bg-white dark:bg-slate-800'}>
      {/* Header bar */}
      <div className={`px-4 py-3 border-b border-gray-100 dark:border-slate-700/80 font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center ${inline ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
        <span className="text-xs font-semibold flex items-center">
          {!inline && <Bell size={15} className="mr-1.5 text-primary" />}
          <span>{lang === 'en' ? 'Notifications' : 'Thông báo'}</span>
          {unreadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-300">
              {unreadCount}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={markingRead || !unreadCount}
            title={lang === 'en' ? 'Mark all as read' : 'Đã đọc tất cả'}
            aria-label={lang === 'en' ? 'Mark all as read' : 'Đã đọc tất cả'}
            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 dark:text-blue-400 dark:hover:bg-slate-700/60 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            onClick={() => void clearAll()}
          >
            <Check size={16} strokeWidth={2.5} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title={lang === 'en' ? 'Collapse' : 'Thu gọn'}
              aria-label={lang === 'en' ? 'Collapse' : 'Thu gọn'}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className={inline ? 'max-h-[min(60vh,420px)] overflow-y-auto' : 'flex-1 max-h-[480px] overflow-y-auto'}>
        {loading ? (
          <p className="p-5 text-center text-xs text-gray-500 dark:text-slate-400">
            {lang === 'en' ? 'Loading notifications…' : 'Đang tải thông báo…'}
          </p>
        ) : entries.length === 0 ? (
          <p className="p-5 text-center text-xs text-gray-500 dark:text-slate-400">
            {lang === 'en' ? 'No notifications yet.' : 'Chưa có thông báo.'}
          </p>
        ) : (
          entries.map(entry => {
            const itemTitle = entry.title || resolveTitle(entry.type);
            const toneKey = toneOf(entry as any);
            const chipLabel = (toneKey === 'other' || !entry.entity_type)
              ? (lang === 'en' ? 'Internal' : 'Nội bộ')
              : TONES[toneKey].label;

            return (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                onClick={() => openNotification(entry)}
                onKeyDown={e => { if (e.key === 'Enter') openNotification(entry); }}
                style={toneStyle(entry as any)}
                title={entry.created_at ? new Date(entry.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : undefined}
                className="notif-row group flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                <NotificationIcon
                  dim={Boolean(entry.is_read)}
                  message={entry.message}
                  metadata={entry.metadata}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <b className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {itemTitle}
                    </b>
                    <span className="notif-chip rounded-full px-1.5 py-px text-[10px] font-semibold">
                      {chipLabel}
                    </span>
                  </span>
                  <span className="notif-msg mt-0.5 block text-xs leading-4">
                    <PicText message={entry.message} metadata={entry.metadata} />
                  </span>
                </span>
                {!entry.is_read && entry.user_id === profile?.id && (
                  <button
                    type="button"
                    aria-label={lang === 'en' ? 'Mark as read' : 'Đánh dấu đã đọc'}
                    onClick={e => void dismissSingle(e, entry.id)}
                    className="notif-x notif-x-static cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
