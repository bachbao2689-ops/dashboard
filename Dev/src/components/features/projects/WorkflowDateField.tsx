import { displayDate, inputDate } from '../../../lib/workflowHub';
export function WorkflowDateField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return <div className="tw-calendar-picker min-w-0"><input id={id} type="text" readOnly value={displayDate(value).replace('—', '')} placeholder="dd/mm/yyyy" aria-label={id.endsWith('start') ? 'Ngày bắt đầu' : 'Ngày kết thúc'} onChange={e => onChange(inputDate(e.target.value) || '')} onClick={e => (window as any).openCalendar?.({ displayId: id, mode: 'single' }, e)} className="w-full cursor-pointer p-2 rounded-xl text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none" /></div>;
}
