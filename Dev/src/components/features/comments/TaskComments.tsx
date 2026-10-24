import { useMemo, useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import { useTaskComments } from '../../../hooks/useTaskComments';
import { useMobileReadOnly } from '../../../hooks/useMobileReadOnly';
import type { CommentTarget } from '../../../services/taskComments';
import { SmartCommentInput, type CommentMentionPerson } from './SmartCommentInput';
import { CommentMessage } from './CommentMessage';
import '../../../styles/task-comments.css';

type Person = CommentMentionPerson;

interface Props {
  target: CommentTarget;
  people: Person[];
  collaboratorIds?: (string | number)[];
  allowMobileEditing?: boolean;
  focusRequest?: string;
  onSent?: (body: string, mentions: number[]) => void | Promise<void>;
  onDeleted?: (commentId: string) => void | Promise<void>;
}

export function TaskComments({ target, people, collaboratorIds, allowMobileEditing = false, focusRequest, onSent, onDeleted }: Props) {

  const readOnly = useMobileReadOnly(!allowMobileEditing);
  const profile = useAuthStore(state => state.profile);
  const { t, lang } = useTranslation();
  const en = lang === 'en';
  const thread = useTaskComments(target, profile?.id);
  const draftKey = target?.kind && target?.id ? `kcoffee_comment_draft_${target.kind}_${target.id}` : null;
  const [text, setText] = useState(() => (draftKey && typeof window !== 'undefined' ? sessionStorage.getItem(draftKey) || '' : ''));
  const draftRef = useRef(text);
  draftRef.current = text;

  useEffect(() => {
    if (!draftKey || typeof window === 'undefined') return;
    if (text.trim()) {
      sessionStorage.setItem(draftKey, text);
    } else {
      sessionStorage.removeItem(draftKey);
    }
  }, [text, draftKey]);
  const [mentions, setMentions] = useState<Person[]>([]);
  const input = useRef<HTMLTextAreaElement>(null);

  const commentAuthorIds = useMemo(() => {
    return (thread.comments || []).map(c => c.author_id).filter(Boolean);
  }, [thread.comments]);

  const allCollaboratorIds = useMemo(() => {
    return Array.from(new Set([...(collaboratorIds || []), ...commentAuthorIds]));
  }, [collaboratorIds, commentAuthorIds]);


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
        if (draftKey && typeof window !== 'undefined') sessionStorage.removeItem(draftKey);
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
            const person=people.find(p=>String(p.id)===String(comment.author_id));
            return <CommentMessage key={comment.id} id={comment.id} authorId={comment.author_id}
              actorId={profile?.id} authorName={comment.author?.name || 'Staff'} avatarUrl={comment.author?.avatar_url}
              body={comment.body} createdAt={comment.created_at} editedAt={comment.edited_at} readOnly={readOnly} allowMobileEditing={allowMobileEditing} variant="task"
              onReply={person ? ()=>replyToPerson(person) : undefined}
              onEdit={thread.edit} onDelete={async id=>{
                if(!(await thread.remove(id))) return false;
                try { await onDeleted?.(id); } catch { /* Parent refresh cannot undo a saved deletion. */ }
                return true;
              }}/>
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

