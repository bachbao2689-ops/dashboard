import {useCallback,useEffect,useRef,useState} from 'react';
import {retainWorkspaceRealtime} from '../services/workspaceRealtime';
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
    const local = (event: Event) => { const changed=(event as CustomEvent<CommentTarget>).detail; if (changed && commentKey(changed)===commentKey(target)) schedule(); };
    const table=target.kind==='task'?'comments':'activity_log';
    const release=retainWorkspaceRealtime(actorId,[table],schedule,()=>{},change=>{
      if(!change.table||change.eventType==='DELETE')return true;
      const row=change.new;
      return table==='comments'?row?.task_id===target.id:row?.entity_type===target.kind&&row?.entity_id===target.id&&row?.action==='comment';
    });
    window.addEventListener('task-comments:changed',local);
    return()=>{disposed=true;generation.current++;clearTimeout(timer);release();window.removeEventListener('task-comments:changed',local);};
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
