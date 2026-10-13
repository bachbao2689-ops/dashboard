import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../services/supabase';
import {commentKey,readTaskComments,writeTaskComment,type CommentTarget,type ThreadComment} from '../services/taskComments';

export function useTaskComments(target: CommentTarget, actorId?: number) {
  const key = `${actorId || ''}:${commentKey(target)}`;
  const current = useRef(key); current.current = key;
  const generation = useRef(0), sending = useRef(false);
  const [state,setState] = useState<{key:string;rows:ThreadComment[];loading:boolean;error:string}>({key,rows:[],loading:true,error:''});
  const [saving,setSaving] = useState(false);
  const refresh = useCallback(async () => {
    const token = ++generation.current;
    try {
      const rows = actorId ? await readTaskComments(target) : [];
      if (current.current === key && generation.current === token) setState({key,rows,loading:false,error:''});
    } catch {
      if (current.current === key && generation.current === token) setState(previous=>({key,rows:previous.key===key ? previous.rows : [],loading:false,error:'Không thể tải bình luận. Bấm thử lại.'}));
    }
  },[key,target.kind,target.id,actorId]);
  useEffect(() => {
    setState({key,rows:[],loading:true,error:''});
    void refresh();
    if (!actorId) return;
    let disposed=false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { if(disposed)return; clearTimeout(timer); timer=setTimeout(()=>void refresh(),120); };
    const visible = () => { if (document.visibilityState==='visible') schedule(); };
    const local = (event: Event) => { const changed=(event as CustomEvent<CommentTarget>).detail; if (changed && commentKey(changed)===commentKey(target)) schedule(); };
    // DELETE events cannot be filtered reliably. RLS still controls every reread.
    const table=target.kind==='task'?'comments':'activity_log';
    const channel=supabase.channel(`task-thread-${key}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes',{event:'*',schema:'public',table},schedule)
      .subscribe(status=>{if(status==='SUBSCRIBED')schedule();});
    window.addEventListener('task-comments:changed',local);
    window.addEventListener('focus',visible);
    document.addEventListener('visibilitychange',visible);
    const fallback=setInterval(visible,30000);
    return()=>{disposed=true;generation.current++;clearTimeout(timer);clearInterval(fallback);window.removeEventListener('task-comments:changed',local);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);void supabase.removeChannel(channel);};
  },[key,actorId,refresh,target.kind,target.id]);
  const send = async (body:string,mentions:number[]) => {
    if (sending.current || !actorId || !body.trim()) return false;
    sending.current=true;setSaving(true);
    try {await writeTaskComment(target,actorId,body,mentions);await refresh();return true;}
    finally {sending.current=false;setSaving(false);}
  };
  const visible=state.key===key;
  return {comments:visible?state.rows:[],loading:!visible||state.loading,error:visible?state.error:'',saving,send,refresh};
}
