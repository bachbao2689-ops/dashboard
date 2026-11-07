import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X, ArrowRight, Loader2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { supabase } from '../../services/supabase';
import { readTaskComments, type ThreadComment } from '../../services/taskComments';
import { useTranslation } from '../../i18n/translations';

export interface CommentPreviewPopoverProps {
  entityType: 'project' | 'campaign' | 'task' | 'project_subtask' | 'campaign_subtask';
  entityId: string;
  entityTitle?: string;
  count?: number;
  hasUnreadDot?: boolean;
  iconSize?: number;
  className?: string;
  onOpenFull?: () => void;
}

interface LoadedComment {
  id: string;
  authorName: string;
  authorAvatar?: string | null;
  createdAt: string;
  body: string;
}

export const CommentPreviewPopover: React.FC<CommentPreviewPopoverProps> = ({
  entityType,
  entityId,
  entityTitle,
  count,
  hasUnreadDot = false,
  iconSize = 13,
  className = '',
  onOpenFull,
}) => {
  const { lang } = useTranslation();
  const isEn = lang === 'en';

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<LoadedComment[]>([]);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(360, window.innerWidth - 24);
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }
    if (left < 12) left = 12;

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 340 && rect.top > 280;
    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;
    setCoords({ top, left, placeAbove });
  }, []);

  const loadComments = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      if (entityType === 'project') {
        const { data, error } = await supabase
          .from('project_comments')
          .select('id, author_id, body, created_at, edited_at, author:author_id(name, avatar_url)')
          .eq('project_id', entityId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const mapped: LoadedComment[] = (data || []).map((row: any) => ({
          id: String(row.id),
          authorName: row.author?.name || (isEn ? 'Member' : 'Thành viên'),
          authorAvatar: row.author?.avatar_url,
          createdAt: row.created_at,
          body: row.body || '',
        }));
        setComments(mapped);
      } else if (entityType === 'campaign') {
        const { data, error } = await supabase
          .from('activity_log')
          .select('id, user_id, metadata, new_value, created_at, author:user_id(name, avatar_url)')
          .eq('entity_type', 'campaign')
          .eq('entity_id', entityId)
          .eq('action', 'comment')
          .order('created_at', { ascending: false });

        if (error) throw error;
        const mapped: LoadedComment[] = (data || []).map((row: any) => ({
          id: String(row.id),
          authorName: row.author?.name || (isEn ? 'Member' : 'Thành viên'),
          authorAvatar: row.author?.avatar_url,
          createdAt: row.created_at,
          body: row.metadata?.body || '',
        }));
        setComments(mapped);
      } else {
        const rows = await readTaskComments({ kind: entityType, id: entityId });
        const sorted = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const mapped: LoadedComment[] = sorted.map((row: ThreadComment) => ({
          id: String(row.id),
          authorName: row.author?.name || (isEn ? 'Member' : 'Thành viên'),
          authorAvatar: row.author?.avatar_url,
          createdAt: row.created_at,
          body: row.body || '',
        }));
        setComments(mapped);
      }
    } catch (err) {
      console.error('Failed to load comments for preview:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, isEn]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      void loadComments();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const onScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const displayedCount = typeof count === 'number' ? count : comments.length;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`relative inline-grid grid-flow-col auto-cols-max items-center gap-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer ${className}`}
        title={isEn ? `Comments (${displayedCount || 0})` : `Bình luận (${displayedCount || 0})`}
        aria-label={isEn ? `View comments for ${entityTitle || ''}` : `Xem bình luận cho ${entityTitle || ''}`}
      >
        <MessageSquare size={iconSize} className="text-blue-500" />
        {typeof count === 'number' && count > 0 && (
          <span className="text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            {count}
          </span>
        )}
        {hasUnreadDot && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-xs" />
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
            }}
            className="w-[360px] max-w-[calc(100vw-24px)] rounded-xl border border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-[#071325]/95 backdrop-blur-md shadow-xl text-xs text-gray-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
          >
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto] items-center p-3 border-b border-gray-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0a192f]/70">
              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 truncate">
                <MessageSquare size={14} className="text-blue-500" />
                <span className="font-bold text-gray-900 dark:text-white truncate">
                  {isEn ? 'Comments' : 'Bình luận'}
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-blue-100/80 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {comments.length}
                </span>
                {entityTitle && (
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] truncate max-w-[140px]" title={entityTitle}>
                    · {entityTitle}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isEn ? 'Close' : 'Đóng'}
                aria-label={isEn ? 'Close' : 'Đóng'}
              >
                <X size={14} />
              </button>
            </div>

            {/* Comments List */}
            <div className="max-h-[300px] overflow-y-auto p-3 space-y-2.5 divide-y divide-gray-100/70 dark:divide-slate-800/60">
              {loading ? (
                <div className="py-6 text-center text-slate-400 dark:text-slate-500 grid place-items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span className="text-xs">{isEn ? 'Loading comments...' : 'Đang tải bình luận...'}</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-6 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-xs">{isEn ? 'No comments yet.' : 'Chưa có bình luận nào.'}</p>
                </div>
              ) : (
                comments.map((c, idx) => (
                  <div key={c.id || idx} className={idx > 0 ? 'pt-2.5' : ''}>
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 mb-1">
                      <Avatar name={c.authorName} src={c.authorAvatar || undefined} className="w-5 h-5 text-[8.5px] border border-white dark:border-slate-800 shadow-2xs" />
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {c.authorName}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString(isEn ? 'en-GB' : 'vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : ''}
                      </span>
                    </div>
                    <div className="pl-7 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                      {c.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with full thread trigger */}
            {onOpenFull && (
              <div className="p-2.5 border-t border-gray-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0a192f]/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFull();
                  }}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{isEn ? 'Open details & reply' : 'Mở chi tiết & phản hồi'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
