import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDeleteModal } from '../../common/ConfirmDeleteModal';
import { Edit3, Trash2, Reply, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../../common/Avatar';
import { RichCommentBody } from './RichCommentBody';
import { ownsComment } from '../../../lib/commentDeletion';
import { useTranslation } from '../../../i18n/translations';
import { useMobileReadOnly } from '../../../hooks/useMobileReadOnly';

export interface CommentMessageProps {
  id: string;
  authorId: number | string;
  authorName: string;
  avatarUrl?: string | null;
  actorId?: number | string;
  body: string;
  createdAt?: string;
  readOnly?: boolean;
  variant?: 'project' | 'task';
  onEdit: (id: string, body: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReply?: () => void;
}

/** One comment UX for Task, Subtask, Project, Campaign and Workflow panels. */
export function CommentMessage({id,authorId,authorName,avatarUrl,actorId,body,createdAt,
  readOnly=false,variant='project',onEdit,onDelete,onReply}: CommentMessageProps) {
  const { t, lang } = useTranslation();
  const en = lang === 'en';
  const mine = ownsComment(actorId,authorId);
  const [editing,setEditing] = useState(false);
  const [draft,setDraft] = useState(body);
  const [busy,setBusy] = useState(false);
  const [confirmDelete,setConfirmDelete] = useState(false);
  const lock = useRef(false);
  const mobileReadOnly=useMobileReadOnly();
  const viewOnly=readOnly||mobileReadOnly;
  const canManage = mine && !viewOnly;
  const save = async () => {
    if (!canManage || !draft.trim() || lock.current) return;
    lock.current=true; setBusy(true);
    try {
      if (await onEdit(id,draft)) {
        setEditing(false);
        toast.success(en ? 'Comment updated' : 'Đã chỉnh sửa bình luận');
      }
    } catch {
      toast.error(en ? 'Could not save. Your draft has been kept.' : 'Không thể lưu. Nội dung chỉnh sửa vẫn được giữ.');
    } finally { lock.current=false; setBusy(false); }
  };
  const remove = async () => {
    if (!canManage || lock.current) return;
    setConfirmDelete(false);
    lock.current=true; setBusy(true);
    try {
      if (await onDelete(id)) toast.success(en ? 'Comment deleted' : 'Đã xóa bình luận');
    } catch {
      toast.error(en ? 'Could not delete comment.' : 'Không thể xóa bình luận.');
    } finally { lock.current=false; setBusy(false); }
  };
  const bubble = variant === 'task' ? `task-comment-bubble ${mine ? '!rounded-bl-2xl !rounded-br-sm !bg-[#002e6d] !text-white' : ''}`
    : `rounded-2xl px-3 py-2.5 text-sm shadow-sm ${mine ? 'rounded-br-md bg-[#002e6d] text-white' : 'rounded-bl-md bg-slate-100 text-gray-800 dark:bg-slate-700 dark:text-slate-100'}`;
  const avatar = <Avatar name={authorName} src={avatarUrl || undefined} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />;
  return (<>
    <article className={`group flex ${mine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
      {!mine && avatar}
      <div className={`flex min-w-0 max-w-[85%] items-end gap-1.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={bubble}>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-[11px] font-extrabold tracking-tight ${mine ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{authorName}</span>
            {createdAt && <time dateTime={createdAt} className={`text-[9px] ${mine ? 'text-blue-200' : 'text-gray-400'}`}>
              {new Date(createdAt).toLocaleString(en ? 'en-GB' : 'vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
            </time>}
          </div>
          {canManage && editing ? <form onSubmit={event => {event.preventDefault();void save();}}>
            <textarea autoFocus aria-label={en ? 'Edit comment' : 'Chỉnh sửa bình luận'} value={draft}
              onChange={event => setDraft(event.target.value)} disabled={busy} rows={2}
              onKeyDown={event => {if(event.key==='Escape'&&!busy){event.preventDefault();setEditing(false);}}}
              className="w-full min-w-0 sm:min-w-56 rounded-lg border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
            <div className="mt-1 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={()=>setEditing(false)} className="text-xs">{t('common.cancel')}</button>
              <button type="submit" disabled={busy || !draft.trim()} className="text-xs font-bold disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : t('common.save')}</button>
            </div>
          </form> : <RichCommentBody body={body} isMineBubble={mine} />}
        </div>
        {!viewOnly && <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pb-2">
          {onReply && <button type="button" onClick={onReply} disabled={busy}
            title={en ? 'Reply' : 'Trả lời'} aria-label={en ? 'Reply' : 'Trả lời'}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-slate-700"><Reply size={14}/></button>}
          {canManage && <>
            <button type="button" disabled={busy || editing} onClick={()=>{setDraft(body);setEditing(true);}}
              title={en ? 'Edit comment' : 'Chỉnh sửa bình luận'} aria-label={en ? 'Edit comment' : 'Chỉnh sửa bình luận'}
              className="rounded-lg p-1.5 text-gray-400 hover:text-primary disabled:opacity-50"><Edit3 size={14}/></button>
            <button type="button" disabled={busy} onClick={()=>setConfirmDelete(true)}
              title={en ? 'Delete comment' : 'Xóa bình luận'} aria-label={en ? 'Delete comment' : 'Xóa bình luận'}
              className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"><Trash2 size={14}/></button>
          </>}
        </div>}
      </div>
      {mine && avatar}
    </article>
    {canManage && confirmDelete && createPortal(<ConfirmDeleteModal isOpen title={en ? 'Delete comment' : 'Xóa bình luận'}
      message={en ? 'Delete your comment?' : 'Bạn có chắc muốn xóa bình luận của mình?'}
      onConfirm={()=>void remove()} onCancel={()=>setConfirmDelete(false)}/>,document.body)}
  </>);
}
