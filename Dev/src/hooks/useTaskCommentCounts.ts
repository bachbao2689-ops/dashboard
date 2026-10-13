import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../services/supabase';
import {commentTarget} from '../services/taskComments';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';

type CommentCount={count:number;lastAt:string|null};
export function useTaskCommentCounts(ids:string[],actorId?:number) {
  const key=[...new Set(ids)].sort().join(',');
  const current=useRef('');current.current=`${actorId}:${key}`;
  const [state,setState]=useState<{key:string;counts:Record<string,CommentCount>;error:boolean}>({key:'',counts:{},error:false});
  const request=useRef(0);
  const refresh=useCallback(async()=>{
    const scope=`${actorId}:${key}`,token=++request.current;
    const keys=key?key.split(','):[];
    if(!actorId||!keys.length){setState({key:scope,counts:{},error:false});return;}
    try {
      const counts:Record<string,CommentCount>={};
      for(let offset=0;offset<keys.length;offset+=200){
        const batch=keys.slice(offset,offset+200).map(commentTarget);
        const {data,error}=await supabase.rpc('workflow_task_comment_counts',{
          p_tasks:batch.filter(t=>t.kind==='task').map(t=>t.id),
          p_project_subtasks:batch.filter(t=>t.kind==='project_subtask').map(t=>t.id),
          p_campaign_subtasks:batch.filter(t=>t.kind==='campaign_subtask').map(t=>t.id)
        });
        if(error)throw error;
        for(const id of keys.slice(offset,offset+200))counts[id]={count:0,lastAt:null};
        for(const row of data||[])counts[row.task_key]={count:Number(row.comment_count),lastAt:row.last_comment_at};
      }
      if(current.current===scope&&request.current===token)setState({key:scope,counts,error:false});
    }catch{if(current.current===scope&&request.current===token)setState({key:scope,counts:{},error:true});}
  },[key,actorId]);
  useEffect(()=>{void refresh();const changed=()=>void refresh();window.addEventListener('task-comments:changed',changed);return()=>{request.current++;window.removeEventListener('task-comments:changed',changed);};},[refresh]);
  useWorkspaceRealtime(['comments','activity_log'],refresh,actorId);
  return {counts:state.key===current.current?state.counts:{},error:state.key===current.current&&state.error};
}
