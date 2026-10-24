import React, { useEffect, useRef, useState, useCallback } from 'react';
import { History, X, Clock, Calendar, CheckCircle2, User, Plus, Edit3, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { formatNotificationTimestamp } from '../notifications/notificationVisual';
import { displayDate } from '../../../lib/workflowHub';
import { useTranslation } from '../../../i18n/translations';

export interface TaskActivityLogItem {
  id: string;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  user?: {
    name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface TaskActivityLogPopoverProps {
  entityType?: 'task' | 'project_subtask' | 'campaign_subtask' | 'project' | 'campaign' | string | null;
  entityId?: string | null;
  workspaceId?: string;
  className?: string;
}

export const TaskActivityLogPopover: React.FC<TaskActivityLogPopoverProps> = ({
  entityType,
  entityId,
  className = '',
}) => {
  const { t, lang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<TaskActivityLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, user_id, action, entity_type, entity_id, old_value, new_value, metadata, created_at, user:user_id(name, avatar_url)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        // Lọc bỏ log generic details_updated dùng riêng để lưu checklist array khi đã có action chuyên biệt
        const filtered = (data as TaskActivityLogItem[]).filter(item => {
          if (item.action === 'details_updated') {
            const meta = item.metadata || {};
            if (meta.field || meta.title) return true;
            if (meta.is_internal_detail_sync || (meta.checklist_items && !meta.title && !meta.field)) {
              return false;
            }
          }
          return true;
        });
        setLogs(filtered);
      }
    } catch (err) {
      console.warn('Failed to load task activity log:', err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (isOpen) {
      void loadLogs();
    }
  }, [isOpen, loadLogs]);

  // Real-time subscription to activity_log for this entity
  useEffect(() => {
    if (!entityId) return;
    const channel = supabase
      .channel(`task-activity-log-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `entity_id=eq.${entityId}`,
        },
        () => {
          void loadLogs();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [entityId, loadLogs]);

  // Dismiss on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!entityId || !entityType) return null;

  const renderActionIcon = (log: TaskActivityLogItem) => {
    const action = log.action;
    const field = log.metadata?.field;

    if (action === 'deadline_extended' || field === 'due_date' || field === 'start_date') {
      return (
        <span className="grid place-items-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
          <Calendar size={13} />
        </span>
      );
    }
    if (action === 'subtask_item_added') {
      return (
        <span className="grid place-items-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Plus size={13} strokeWidth={2.5} />
        </span>
      );
    }
    if (action === 'subtask_item_toggled') {
      return (
        <span className="grid place-items-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CheckCircle2 size={13} />
        </span>
      );
    }
    if (field === 'assignee') {
      return (
        <span className="grid place-items-center w-7 h-7 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
          <User size={13} />
        </span>
      );
    }
    if (action === 'comment') {
      return (
        <span className="grid place-items-center w-7 h-7 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
          <MessageSquare size={13} />
        </span>
      );
    }
    if (action === 'creation_details') {
      return (
        <span className="grid place-items-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
          <Sparkles size={13} />
        </span>
      );
    }
    if (action === 'task_completed') {
      return (
        <span className="grid place-items-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CheckCircle2 size={13} />
        </span>
      );
    }
    return (
      <span className="grid place-items-center w-7 h-7 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
        <Edit3 size={13} />
      </span>
    );
  };

  const renderActionContent = (log: TaskActivityLogItem) => {
    const actorName = log.user?.name || log.metadata?.actor_name || (lang === 'en' ? 'Member' : 'Thành viên');
    const metadata = log.metadata || {};
    const title = metadata.title;

    if (title) {
      return (
        <div className="min-w-0">
          <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
            {title}
          </p>
          {metadata.reason && (
            <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
              {metadata.reason}
            </p>
          )}
          {metadata.description && (
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400 italic line-clamp-2">
              "{metadata.description}"
            </p>
          )}
        </div>
      );
    }

    if (log.action === 'comment') {
      const body = metadata.body || '';
      return (
        <div className="min-w-0">
          <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
            <b className="font-semibold">{actorName}</b> {lang === 'en' ? 'commented' : 'đã bình luận'}
          </p>
          {body && (
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2">
              "{body}"
            </p>
          )}
        </div>
      );
    }

    if (log.action === 'creation_details') {
      return (
        <div className="min-w-0">
          <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
            <b className="font-semibold">{actorName}</b> {lang === 'en' ? 'initialized this item' : 'đã khởi tạo mục này'}
          </p>
        </div>
      );
    }

    if (log.action === 'details_updated') {
      return (
        <div className="min-w-0">
          <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
            <b className="font-semibold">{actorName}</b> {lang === 'en' ? 'updated details' : 'đã cập nhật thông tin chi tiết'}
          </p>
        </div>
      );
    }

    if (log.action === 'deadline_extended') {
      const newDue = log.new_value?.due_date || metadata.new_due_date;
      return (
        <div className="min-w-0">
          <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
            <b className="font-semibold">{actorName}</b> {lang === 'en' ? 'extended due date to' : 'đã kéo dài hạn chót đến'}{' '}
            <span className="font-bold text-red-600 dark:text-red-400">{displayDate(newDue)}</span>
          </p>
          {metadata.reason && (
            <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
              {metadata.reason}
            </p>
          )}
        </div>
      );
    }

    if (log.action === 'subtask_item_added') {
      return (
        <div className="min-w-0">
          <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
            <b className="font-semibold">{actorName}</b> {lang === 'en' ? 'added checklist item' : 'đã thêm đầu việc'}:{' '}
            <span className="font-semibold text-primary">{metadata.item_title || ''}</span>
            {metadata.priority && (
              <span className="ml-1 text-[10px] uppercase font-bold text-gray-500">[{metadata.priority}]</span>
            )}
          </p>
        </div>
      );
    }

    if (log.action === 'subtask_item_toggled') {
      const isCompleted = metadata.completed;
      return (
        <div className="min-w-0">
          <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
            <b className="font-semibold">{actorName}</b>{' '}
            {isCompleted
              ? (lang === 'en' ? 'marked completed' : 'đã đánh dấu hoàn thành')
              : (lang === 'en' ? 'marked uncompleted' : 'đã đánh dấu chưa hoàn thành')}{' '}
            đầu việc: <span className="font-semibold">{metadata.item_title || ''}</span>
          </p>
        </div>
      );
    }

    if (log.action === 'subtask_item_deleted') {
      return (
        <div className="min-w-0">
          <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
            <b className="font-semibold">{actorName}</b> {lang === 'en' ? 'deleted checklist item' : 'đã xóa đầu việc'}:{' '}
            <span className="font-semibold text-red-600 dark:text-red-400">{metadata.item_title || ''}</span>
          </p>
        </div>
      );
    }

    return (
      <div className="min-w-0">
        <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
          <b className="font-semibold">{actorName}</b> {lang === 'en' ? 'updated this item' : 'đã cập nhật mục này'}
        </p>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title={lang === 'en' ? 'Activity Log' : 'Nhật ký hoạt động'}
        aria-label={lang === 'en' ? 'Activity Log' : 'Nhật ký hoạt động'}
        aria-expanded={isOpen}
        className={`min-h-[44px] min-w-[44px] grid place-items-center rounded-xl transition-colors shrink-0 cursor-pointer ${
          isOpen
            ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-slate-700'
            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <History size={16} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={lang === 'en' ? 'Activity Log' : 'Nhật ký hoạt động'}
          className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-[-80px] sm:top-full sm:mt-2 w-auto sm:w-[350px] max-w-[calc(100vw-24px)] z-[100] rounded-2xl border border-gray-200/90 bg-white/95 backdrop-blur-2xl shadow-2xl dark:border-slate-700/80 dark:bg-slate-900/95 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto] items-center px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <div className="grid grid-flow-col auto-cols-max items-center gap-2">
              <History size={15} className="text-blue-600 dark:text-blue-400" />
              <b className="text-xs font-bold text-gray-900 dark:text-gray-100">
                {lang === 'en' ? 'Activity Log' : 'Nhật ký hoạt động'}
              </b>
              {logs.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  {logs.length}
                </span>
              )}
            </div>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* List with Zebra Striping */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-gray-100/50 dark:divide-slate-800/50">
            {loading && logs.length === 0 ? (
              <div className="py-8 px-4 text-center text-xs text-gray-400 dark:text-slate-500">
                <Clock size={16} className="inline mr-1 animate-spin" /> {lang === 'en' ? 'Loading log...' : 'Đang tải nhật ký...'}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <AlertCircle size={20} className="mx-auto mb-1.5 text-gray-300 dark:text-slate-600" />
                <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                  {lang === 'en' ? 'No activity recorded yet for this item.' : 'Chưa có hoạt động nào được ghi lại cho mục này.'}
                </p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={log.id}
                  className={`grid grid-cols-[auto_1fr] items-start gap-3 px-4 py-3 transition-colors ${
                    index % 2 === 0
                      ? 'bg-transparent'
                      : 'bg-gray-50/70 dark:bg-slate-800/40'
                  } hover:bg-blue-50/40 dark:hover:bg-slate-800/70`}
                >
                  <div className="pt-0.5">{renderActionIcon(log)}</div>
                  <div className="min-w-0">
                    {renderActionContent(log)}
                    <time
                      dateTime={log.created_at}
                      className="mt-1 block text-[10px] text-gray-400 dark:text-slate-500"
                    >
                      {formatNotificationTimestamp(log.created_at)}
                    </time>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
