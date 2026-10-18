import { useMemo, useRef, useState } from 'react';
import { Reply, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../../common/Avatar';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import { useTaskComments } from '../../../hooks/useTaskComments';
import { useMobileReadOnly } from '../../../hooks/useMobileReadOnly';
import { isAdmin, isGlobalManager } from '../../../lib/roleScope';
import type { CommentTarget } from '../../../services/taskComments';
import { SmartCommentInput, type CommentMentionPerson } from './SmartCommentInput';
import { RichCommentBody } from './RichCommentBody';
import '../../../styles/task-comments.css';

type Person = CommentMentionPerson;

interface Props {
  target: CommentTarget;
  people: Person[];
  collaboratorIds?: (string | number)[];
  focusRequest?: string;
  onSent?: (body: string, mentions: number[]) => void | Promise<void>;
  onDeleted?: (commentId: string) => void | Promise<void>;
}

export function TaskComments({ target, people, collaboratorIds, focusRequest, onSent, onDeleted }: Props) {

  const readOnly = useMobileReadOnly();
  const profile = useAuthStore(state => state.profile);
  const { t, lang } = useTranslation();
  const en = lang === 'en';
  const thread = useTaskComments(target, profile?.id);
  const [text, setText] = useState('');
  const draftRef = useRef(text);
  draftRef.current = text;
  const [mentions, setMentions] = useState<Person[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const commentAuthorIds = useMemo(() => {
    return (thread.comments || []).map(c => c.author_id).filter(Boolean);
  }, [thread.comments]);

  const allCollaboratorIds = useMemo(() => {
    return Array.from(new Set([...(collaboratorIds || []), ...commentAuthorIds]));
  }, [collaboratorIds, commentAuthorIds]);


  const handleDeleteComment = async (commentId: string) => {
    if (readOnly || deletingId) return;
    const ok = window.confirm(
      en ? 'Delete this comment?' : 'Bạn có chắc chắn muốn xoá tin nhắn này?'
    );
    if (!ok) return;

    setDeletingId(commentId);
    try {
      await thread.remove(commentId);
      toast.success(en ? 'Comment deleted' : 'Đã xoá bình luận');
      try {
        await onDeleted?.(commentId);
      } catch {
        // Notification ignored
      }
    } catch {
      toast.error(en ? 'Could not delete comment.' : 'Không thể xoá bình luận.');
    } finally {
      setDeletingId(null);
    }
  };

  const registerMention = (person: Person) => {
    setMentions(current => [...current.filter(p => p.id !== person.id), person]);
  };

  const replyToPerson = (person: Person) => {
    registerMention(person);
    const tag = `@${person.name.replace(/\s+/g, '')} `;
    setText(current => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${tag}`);
    input.current?.focus();
  };

  const send = async (overrideBody?: string) => {
    const raw = typeof overrideBody === 'string' ? overrideBody : text;
    if (readOnly || thread.saving || !raw.trim()) return;
    const draft = text;
    const body = raw.trim();
    const ids = people
      .filter(
        person =>
          mentions.some(m => m.id === person.id) ||
          body.includes(`@${person.name.replace(/\s+/g, '')}`)
      )
      .map(person => Number(person.id))
      .filter(id => !Number.isNaN(id));

    try {
      if (!(await thread.send(body, ids))) return;
      if (draftRef.current === draft) {
        setText('');
        setMentions([]);
      }
      toast.success(en ? 'Comment sent' : 'Đã gửi bình luận');
      // A notification failure must never make a saved comment look unsent.
      try {
        await onSent?.(body, ids);
      } catch {
        console.warn('Comment saved; participant notification could not be delivered.');
      }
    } catch {
      toast.error(
        en
          ? 'Could not send. Your draft has been kept.'
          : 'Không thể gửi. Nội dung nháp vẫn được giữ.'
      );
    }
  };

  return (
    <section aria-label={en ? 'Task comments' : 'Bình luận công việc'}>
      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-3">
        Comments {!thread.loading && !thread.error && thread.comments.length > 0 && <span>({thread.comments.length})</span>}
      </p>

      {thread.loading && (
        <p role="status" className="text-xs text-gray-400 mb-3">
          {en ? 'Loading comments…' : 'Đang tải bình luận…'}
        </p>
      )}
      {thread.error && (
        <p role="alert" className="text-xs text-red-500 mb-3">
          {en ? 'Could not load comments.' : thread.error}{' '}
          <button type="button" className="underline" onClick={() => void thread.refresh()}>
            {en ? 'Retry' : 'Thử lại'}
          </button>
        </p>
      )}
      {!thread.loading && !thread.error && !thread.comments.length && readOnly && (
        <p className="text-xs text-gray-400 italic mb-3">{t('common.noComments')}</p>
      )}

      {thread.comments.length > 0 && (
        <div className="space-y-3.5 mb-4" aria-live="polite" aria-relevant="additions text">
          {thread.comments.map(comment => {
            const mine = String(comment.author_id) === String(profile?.id);
            const author = comment.author?.name || 'Staff';
            const person = people.find(p => String(p.id) === String(comment.author_id));
            const canDelete = !readOnly && (mine || isAdmin(profile) || isGlobalManager(profile) || Boolean(profile?.id));

            return (
              <article key={comment.id} className={`task-comment-row group ${mine ? 'is-mine' : ''}`}>
                {!mine && (
                  <Avatar
                    name={author}
                    src={comment.author?.avatar_url || undefined}
                    className="w-7 h-7 text-[10px] shrink-0 mb-1"
                  />
                )}
                <div className="task-comment-content">
                  <div className="task-comment-bubble">
                    <div className="task-comment-meta">
                      <span className={`font-extrabold tracking-tight ${mine ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{author}</span>
                      <time
                        dateTime={comment.created_at}
                        title={new Date(comment.created_at).toLocaleString(en ? 'en-GB' : 'vi-VN')}
                      >
                        {new Date(comment.created_at).toLocaleString(en ? 'en-GB' : 'vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <RichCommentBody body={comment.body} isMineBubble={mine} />
                  </div>
                </div>
                {mine && (
                  <Avatar
                    name={author}
                    src={comment.author?.avatar_url || undefined}
                    className="w-7 h-7 text-[10px] shrink-0 mb-1"
                  />
                )}
                {!readOnly && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 mb-1">
                    {person && (
                      <button
                        type="button"
                        onClick={() => replyToPerson(person)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                        title={en ? 'Reply and mention' : 'Trả lời và nhắc tên'}
                        aria-label={en ? 'Reply and mention' : 'Trả lời và nhắc tên'}
                      >
                        <Reply size={13} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        disabled={deletingId === comment.id}
                        onClick={() => void handleDeleteComment(comment.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 cursor-pointer"
                        title={en ? 'Delete comment' : 'Xoá tin nhắn'}
                        aria-label={en ? 'Delete comment' : 'Xoá tin nhắn'}
                      >
                        {deletingId === comment.id ? (
                          <Loader2 size={13} className="animate-spin text-red-500" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <SmartCommentInput
          inputRef={input}
          value={text}
          onChange={setText}
          onSubmit={send}
          people={people}
          collaboratorIds={allCollaboratorIds}
          onPickPerson={registerMention}
          disabled={!profile?.id}
          saving={thread.saving}
          placeholder="Add a comment..."
          autoFocusTrigger={focusRequest}
          ariaLabel={en ? 'Write a task comment' : 'Viết bình luận công việc'}
        />
      )}
    </section>
  );
}

