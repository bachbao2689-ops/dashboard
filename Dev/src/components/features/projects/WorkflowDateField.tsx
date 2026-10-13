import { displayDate, inputDate } from '../../../lib/workflowHub';
export function WorkflowDateField({ id, value, onChange, minDate, maxDate, label }: { id: string; value: string; onChange: (value: string) => void; minDate?: string; maxDate?: string; label?: string }) {
  return <div className="tw-calendar-picker min-w-0"><input id={id} type="text" readOnly value={displayDate(value).replace('—', '')} placeholder="dd/mm/yyyy" aria-label={label || (id.endsWith('start') ? 'Ngày bắt đầu' : 'Ngày kết thúc')} onChange={e => onChange(inputDate(e.target.value) || '')} onClick={e => (window as any).openCalendar?.({ displayId: id, mode: 'single', minDate, maxDate }, e)} className="workflow-calendar-input" /></div>;
}
