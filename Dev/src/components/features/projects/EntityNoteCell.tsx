import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'kcoffee.entity_notes.v1';

const getCachedNote = (entityType: string, entityId: string): string => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed[`${entityType}:${entityId}`] === 'string'
      ? parsed[`${entityType}:${entityId}`]
      : '';
  } catch {
    return '';
  }
};

const setCachedNote = (entityType: string, entityId: string, note: string) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[`${entityType}:${entityId}`] = note;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
};

interface EntityNoteCellProps {
  entityId: string;
  entityType: 'project' | 'campaign';
  workspaceId?: string | null;
  canEdit?: boolean;
  className?: string;
}

export const EntityNoteCell: React.FC<EntityNoteCellProps> = ({
  entityId,
  entityType,
  workspaceId,
  canEdit = true,
  className = '',
}) => {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);

  const [note, setNote] = useState<string>(() => getCachedNote(entityType, entityId));
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync cache and fetch remote activity_log on mount or when entity changes
  useEffect(() => {
    const cached = getCachedNote(entityType, entityId);
    setNote(cached);

    let active = true;
    void supabase
      .from('activity_log')
      .select('metadata, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('action', 'entity_note')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        const remoteNote = typeof data.metadata?.note === 'string' ? data.metadata.note : '';
        if (remoteNote !== cached) {
          setNote(remoteNote);
          setCachedNote(entityType, entityId, remoteNote);
        }
      });

    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      setDraft(note);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing, note]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(note);
  };

  const handleSave = async () => {
    const trimmed = draft.trim();
    setIsEditing(false);

    if (trimmed === note) return;

    setNote(trimmed);
    setCachedNote(entityType, entityId, trimmed);

    try {
      const { error } = await supabase.from('activity_log').insert({
        workspace_id: workspaceId || null,
        user_id: profile?.id || null,
        entity_type: entityType,
        entity_id: entityId,
        action: 'entity_note',
        metadata: { note: trimmed },
      });

      if (!error) {
        toast.success(t('projects.noteSaved'));
      }
    } catch (err) {
      console.warn('Failed to sync note to activity_log:', err);
    }
  };

  if (isEditing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`grid grid-cols-[1fr_auto_auto] items-center gap-1 w-full min-w-0 ${className}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              void handleSave();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              handleCancel();
            }
          }}
          placeholder={t('projects.notePlaceholder')}
          className="w-full text-xs px-2 py-1 rounded-md border border-primary/50 dark:border-primary/50 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary shadow-xs"
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleSave();
          }}
          className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-colors"
          title={t('common.save')}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCancel();
          }}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          title={t('common.cancel')}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        if (canEdit) {
          handleStartEdit(e);
        }
      }}
      className={`group/note grid grid-cols-[1fr_auto] items-center gap-1.5 w-full min-w-0 h-full cursor-pointer ${className}`}
      title={note || (canEdit ? t('projects.notePlaceholder') : undefined)}
    >
      {note ? (
        <>
          <span className="block truncate text-xs text-gray-700 dark:text-gray-300 font-normal">
            {note}
          </span>
          {canEdit && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="opacity-0 group-hover/note:opacity-100 p-1 text-gray-400 hover:text-primary dark:hover:text-primary rounded-md transition-opacity"
              title={t('common.edit')}
            >
              <Pencil size={13} />
            </button>
          )}
        </>
      ) : (
        canEdit && (
          <div className="opacity-0 group-hover/note:opacity-100 grid grid-flow-col auto-cols-max items-center gap-1 text-xs text-gray-400 hover:text-primary dark:hover:text-primary transition-opacity py-0.5 rounded-md">
            <Pencil size={13} />
            <span className="truncate">{t('projects.notePlaceholder')}</span>
          </div>
        )
      )}
    </div>
  );
};
