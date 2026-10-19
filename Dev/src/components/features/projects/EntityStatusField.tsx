import {useId} from 'react';
import {useTranslation} from '../../../i18n/translations';
import {statusMeta} from '../../../utils/statusTheme';

/** Keep legacy values intact until the user explicitly chooses another status. */
export function EntityStatusField({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const {lang}=useTranslation();
 const en=lang==='en';
 const options=[{value:'planning',label:en?'Planning':'Lên kế hoạch'},{value:'active',label:en?'In progress':'Đang thực hiện'},{value:'completed',label:en?'Completed':'Hoàn thành'}];
 const id=useId();
 return <div><label htmlFor={id} className="text-xs font-semibold text-gray-500 uppercase">{en?'Status':'Trạng thái'}</label><select id={id} value={value} onChange={event=>onChange(event.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm">
  {!options.some(option=>option.value===value)&&<option value={value}>{statusMeta(value).label}</option>}
  {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
 </select></div>;
}
