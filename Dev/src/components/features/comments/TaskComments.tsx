import {useEffect,useRef,useState} from 'react';
import {Activity,MessageSquare,Reply,Send} from 'lucide-react';
import toast from 'react-hot-toast';
import {Avatar} from '../../common/Avatar';
import {useAuthStore} from '../../../store/authStore';
import {useTranslation} from '../../../i18n/translations';
import {useTaskComments} from '../../../hooks/useTaskComments';
import {useMobileReadOnly} from '../../../hooks/useMobileReadOnly';
import type {CommentTarget} from '../../../services/taskComments';
import '../../../styles/task-comments.css';

type Person={id:number;name:string};
interface Props {target:CommentTarget;people:Person[];focusRequest?:string;onSent?:(body:string,mentions:number[])=>void|Promise<void>}
export function TaskComments({target,people,focusRequest,onSent}:Props) {
  const readOnly=useMobileReadOnly();
  const profile=useAuthStore(state=>state.profile);
  const {t,lang}=useTranslation();const en=lang==='en';
  const thread=useTaskComments(target,profile?.id);
  const [text,setText]=useState('');
  const draftRef=useRef(text);draftRef.current=text;
  const [mentions,setMentions]=useState<Person[]>([]);
  const input=useRef<HTMLTextAreaElement>(null);
  const query=text.match(/(?:^|\s)@([^\s@]*)$/)?.[1];
  const options=query===undefined?[]:people.filter(person=>person.name.toLowerCase().includes(query.toLowerCase())).slice(0,6);
  useEffect(()=>{
    if(!focusRequest||thread.loading)return;
    const frame=requestAnimationFrame(()=>{input.current?.focus({preventScroll:true});input.current?.scrollIntoView({block:'center',behavior:'smooth'});});
    return()=>cancelAnimationFrame(frame);
  },[focusRequest,thread.loading]);
  const chooseMention=(person:Person,reply=false)=>{
    setMentions(current=>[...current.filter(p=>p.id!==person.id),person]);
    const tag=`@${person.name.replace(/\s+/g,'')} `;
    setText(current=>reply?`${current}${current&&!current.endsWith(' ')?' ':''}${tag}`:current.replace(/@[^\s@]*$/,tag));
    input.current?.focus();
  };
  const send=async()=>{
    if(readOnly||thread.saving||!text.trim())return;
    const draft=text,body=text.trim();
    const ids=mentions.filter(person=>body.includes(`@${person.name.replace(/\s+/g,'')}`)).map(person=>person.id);
    try {
      if(!await thread.send(body,ids))return;
      if(draftRef.current===draft){setText('');setMentions([]);}
      toast.success(en?'Comment sent':'Đã gửi bình luận');
      // A notification failure must never make a saved comment look unsent.
      try {await onSent?.(body,ids);}catch{console.warn('Comment saved; participant notification could not be delivered.');}
    }catch{toast.error(en?'Could not send. Your draft has been kept.':'Không thể gửi. Nội dung nháp vẫn được giữ.');}
  };
  return <section aria-label={en?'Task comments':'Bình luận công việc'}>
    <p className="text-sm font-bold mb-3"><Activity className="w-4 h-4 inline mr-2"/>{t('common.activityComments')} {!thread.loading&&!thread.error&&<span>({thread.comments.length})</span>}</p>
    {thread.loading&&<p role="status" className="text-sm text-gray-500">{en?'Loading comments…':'Đang tải bình luận…'}</p>}
    {thread.error&&<p role="alert" className="text-sm text-red-500">{en?'Could not load comments.':thread.error} <button type="button" className="underline" onClick={()=>void thread.refresh()}>{en?'Retry':'Thử lại'}</button></p>}
    {!thread.loading&&!thread.error&&!thread.comments.length&&<p className="text-sm text-gray-500">{t('common.noComments')}</p>}
    <div className="space-y-4" aria-live="polite" aria-relevant="additions text">
      {thread.comments.map(comment=>{
        const mine=Number(comment.author_id)===Number(profile?.id);
        const author=comment.author?.name||'Staff';
        const person=people.find(person=>person.id===Number(comment.author_id));
        return <article key={comment.id} className={`task-comment-row ${mine?'is-mine':''}`}>
          {!mine&&<Avatar name={author} src={comment.author?.avatar_url||undefined} className="w-7 h-7 text-[10px] shrink-0 mb-1"/>}
          <div className="task-comment-content">
            <div className="task-comment-bubble">
              <div className="task-comment-meta"><span className="font-bold">{author}</span><time dateTime={comment.created_at} title={new Date(comment.created_at).toLocaleString(en?'en-GB':'vi-VN')}>{new Date(comment.created_at).toLocaleString(en?'en-GB':'vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</time></div>
              <p className="whitespace-pre-wrap break-words leading-relaxed">{comment.body}</p>
            </div>
          </div>
          {mine&&<Avatar name={author} src={comment.author?.avatar_url||undefined} className="w-7 h-7 text-[10px] shrink-0 mb-1"/>}
          {!readOnly&&person&&<button type="button" onClick={()=>chooseMention(person,true)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary" title={en?'Reply and mention':'Trả lời và nhắc tên'}><Reply size={14}/></button>}
        </article>;
      })}
    </div>
    {!readOnly&&<div className="relative mt-4">
      {options.length>0&&<div className="task-comment-mentions">{options.map(person=><button type="button" key={person.id} onMouseDown={event=>event.preventDefault()} onClick={()=>chooseMention(person)} className="block w-full p-2 text-sm text-left hover:bg-blue-50 dark:hover:bg-slate-700">@{person.name}</button>)}</div>}
      <textarea ref={input} value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void send();}}} rows={3} placeholder={t('common.commentPlaceholder')} aria-label={en?'Write a task comment':'Viết bình luận công việc'} className="task-comment-input"/>
      <button type="button" disabled={!text.trim()||thread.saving||!profile?.id} onClick={()=>void send()} className="task-comment-send"><Send size={16}/>{thread.saving?(en?'Sending…':'Đang gửi…'):t('common.sendComment')}</button>
      <p className="mt-2 text-[11px] text-gray-400"><MessageSquare size={11} className="inline mr-1"/>{en?'Enter to send · Shift+Enter for a new line':'Enter để gửi · Shift+Enter để xuống dòng'}</p>
    </div>}
  </section>;
}
