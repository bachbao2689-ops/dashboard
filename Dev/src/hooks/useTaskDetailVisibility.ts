import {useLayoutEffect} from 'react';
import {retainTaskDetail} from '../store/overlayStore';
// Count mounted open details, including nested/embedded drawers and URL entry points.
export function useTaskDetailVisibility(open:boolean){
 useLayoutEffect(()=>open?retainTaskDetail():undefined,[open]);
}
