import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Sparkles } from 'lucide-react';

export type WorkflowTaskStatus = 'backlog' | 'planned' | 'scoping' | 'in_progress' | 'in_qa' | 'completed' | 'canceled';

export const WORKFLOW_STATUS_CONFIG: Record<WorkflowTaskStatus, {
  label: string;
  color: string;
  textColor: string;
  bgLight: string;
  bgDark: string;
  borderClass: string;
}> = {
  backlog: {
    label: 'Backlog',
    color: '#D97706',
    textColor: 'text-amber-700 dark:text-amber-300',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/40',
    borderClass: 'border-amber-300 dark:border-amber-700'
  },
  planned: {
    label: 'Planned',
    color: '#6B7280',
    textColor: 'text-gray-600 dark:text-gray-300',
    bgLight: 'bg-gray-50',
    bgDark: 'dark:bg-slate-800',
    borderClass: 'border-gray-300 dark:border-slate-600'
  },
  scoping: {
    label: 'Scoping',
    color: '#F43F5E',
    textColor: 'text-rose-700 dark:text-rose-300',
    bgLight: 'bg-rose-50',
    bgDark: 'dark:bg-rose-950/40',
    borderClass: 'border-rose-300 dark:border-rose-700'
  },
  in_progress: {
    label: 'In Progress',
    color: '#EAB308',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    bgLight: 'bg-yellow-50',
    bgDark: 'dark:bg-yellow-950/40',
    borderClass: 'border-yellow-300 dark:border-yellow-700'
  },
  in_qa: {
    label: 'In QA',
    color: '#10B981',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/40',
    borderClass: 'border-emerald-300 dark:border-emerald-700'
  },
  completed: {
    label: 'Completed',
    color: '#6366F1',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    bgLight: 'bg-indigo-50',
    bgDark: 'dark:bg-indigo-950/40',
    borderClass: 'border-indigo-300 dark:border-indigo-700'
  },
  canceled: {
    label: 'Canceled',
    color: '#4B5563',
    textColor: 'text-gray-500 dark:text-gray-400',
    bgLight: 'bg-gray-100',
    bgDark: 'dark:bg-slate-800',
    borderClass: 'border-gray-300 dark:border-slate-700'
  }
};

export interface MarketingStatusGuide {
  status: WorkflowTaskStatus;
  marketingTitle: string;
  shortDesc: string;
  usageRule: string;
}

export const MARKETING_STATUS_GUIDES: MarketingStatusGuide[] = [
  {
    status: 'backlog',
    marketingTitle: 'Backlog (Ý tưởng & Chờ duyệt)',
    shortDesc: 'Kho lưu trữ ý tưởng, đề xuất nội dung & hạng mục tiềm năng cho các chiến dịch tương lai, chưa xếp lịch đợt này.',
    usageRule: 'Gán khi task mới nảy sinh ý tưởng hoặc đang xếp hàng chờ duyệt ngân sách / thời điểm.'
  },
  {
    status: 'planned',
    marketingTitle: 'Planned (Đã lên kế hoạch)',
    shortDesc: 'Đã chốt đưa vào kế hoạch tuần/tháng hoặc chiến dịch sắp tới; đã phân bổ nhân sự nhưng chưa bắt đầu sản xuất ngay.',
    usageRule: 'Gán khi đã chốt timeline & người phụ trách, chờ đến ngày bấm máy triển khai.'
  },
  {
    status: 'scoping',
    marketingTitle: 'Scoping (Làm rõ Brief & Phạm vi)',
    shortDesc: 'Hoàn thiện creative brief, chốt mục tiêu, thông điệp truyền thông, tiêu chí nghiệm thu (acceptance criteria) trước khi làm.',
    usageRule: 'Gán khi đang trao đổi brief với khách hàng / lead trước khi bắt tay thực thi.'
  },
  {
    status: 'in_progress',
    marketingTitle: 'In Progress (Đang triển khai)',
    shortDesc: 'Đội ngũ Marketing / Design / Content / Media đang trực tiếp sản xuất nội dung, thiết kế ấn phẩm và thực thi chiến dịch.',
    usageRule: 'Gán ngay khi nhân sự bắt đầu sản xuất nội dung / ấn phẩm truyền thông.'
  },
  {
    status: 'in_qa',
    marketingTitle: 'In QA (Rà soát & Duyệt nội dung)',
    shortDesc: 'Bản nháp / ấn phẩm hoàn tất đang được Leader hoặc QC rà soát câu từ, visual và đối soát brand guidelines.',
    usageRule: 'Gán khi nộp bản draft chờ Leader / khách hàng duyệt và phản hồi feedback.'
  },
  {
    status: 'completed',
    marketingTitle: 'Completed (Đã nghiệm thu & Hoàn tất)',
    shortDesc: 'Ấn phẩm / chiến dịch đã được phê duyệt chính thức, xuất bản hoặc bàn giao đạt chuẩn yêu cầu ban đầu.',
    usageRule: 'Gán khi đã hoàn thành nghiệm thu toàn bộ tiêu chí chất lượng.'
  },
  {
    status: 'canceled',
    marketingTitle: 'Canceled (Đã hủy bỏ)',
    shortDesc: 'Dừng thực hiện do thay đổi định hướng chiến dịch, trùng lặp nội dung hoặc không còn phù hợp với mục tiêu kinh doanh.',
    usageRule: 'Gán thay vì xóa task để lưu vết lịch sử quyết định và tài nguyên đã nghiên cứu.'
  }
];

export const STATUS_MARKETING_SUBTITLE: Record<WorkflowTaskStatus, string> = {
  backlog: 'Ý tưởng & Chờ duyệt',
  planned: 'Đã lên kế hoạch',
  scoping: 'Làm rõ Brief & Phạm vi',
  in_progress: 'Đang triển khai',
  in_qa: 'Rà soát & Duyệt nội dung',
  completed: 'Đã nghiệm thu & Hoàn tất',
  canceled: 'Đã hủy bỏ'
};

export const WorkflowHexagonIcon: React.FC<{ status: WorkflowTaskStatus; size?: number; className?: string }> = ({
  status,
  size = 18,
  className = ''
}) => {
  const hexPath = "M12 2.5 L20.2 7.2 L20.2 16.8 L12 21.5 L3.8 16.8 L3.8 7.2 Z";

  switch (status) {
    case 'backlog':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#D97706"
            strokeWidth="2.2"
            strokeDasharray="3.2 2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'planned':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#6B7280"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'scoping':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M12 12 L12 6.5 A5.5 5.5 0 0 1 17.5 12 Z"
            fill="#F43F5E"
          />
        </svg>
      );
    case 'in_progress':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#EAB308"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M12 6.5 A5.5 5.5 0 0 1 12 17.5 Z"
            fill="#EAB308"
          />
        </svg>
      );
    case 'in_qa':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M12 12 L12 6.5 A5.5 5.5 0 1 1 6.5 12 Z"
            fill="#10B981"
          />
        </svg>
      );
    case 'completed':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="#6366F1"
            stroke="#6366F1"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M7.8 12.2 L10.8 15.2 L16.2 9.5"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    case 'canceled':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="#4B5563"
            stroke="#4B5563"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    default:
      return null;
  }
};


export const canonicalWorkflowStatus: Record<WorkflowTaskStatus,string> = {backlog:'todo',planned:'todo',scoping:'in_progress',in_progress:'in_progress',in_qa:'in_review',completed:'done',canceled:'cancelled'};
export function workflowStage(status: string, stage?: string | null): WorkflowTaskStatus {
  if (stage && stage in WORKFLOW_STATUS_CONFIG) return stage as WorkflowTaskStatus;
  if (['done','completed','complete'].includes(status)) return 'completed';
  if (['cancelled','canceled'].includes(status)) return 'canceled';
  if (['in_review','review','in_qa'].includes(status)) return 'in_qa';
  if (['in_progress','in-progress','doing'].includes(status)) return 'in_progress';
  return 'backlog';
}
export function WorkflowStatusPicker({status,stage,disabled,onChange}: {status:string;stage?:string|null;disabled?:boolean;onChange:(stage:WorkflowTaskStatus)=>Promise<void>}) {
  const value=workflowStage(status,stage);
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [position,setPosition]=useState({left:0,top:0,maxHeight:340});
  const button=useRef<HTMLButtonElement>(null);
  const popup=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!open) return;
    const close=(event:Event)=>{if(!button.current?.contains(event.target as Node)&&!popup.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    const resize=()=>setOpen(false);
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
    window.addEventListener('resize',resize);
    document.addEventListener('scroll',close,true);
    return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);window.removeEventListener('resize',resize);document.removeEventListener('scroll',close,true);};
  },[open]);
  const toggle=()=>{
    const r=button.current!.getBoundingClientRect();
    const height=Math.min(340,window.innerHeight-32);
    const below=window.innerHeight-r.bottom-12;
    const above=r.top-12;
    const down=below>=Math.min(height,180)||below>=above;
    const available=Math.max(80,Math.min(height,down?below:above));
    setPosition({left:Math.max(12,Math.min(r.left,window.innerWidth-276)),top:down?r.bottom+6:Math.max(12,r.top-available-6),maxHeight:available});
    setOpen(v=>!v);
  };
  return <><button ref={button} disabled={disabled||saving} onClick={toggle} aria-label="Đổi trạng thái task" aria-expanded={open} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold transition-colors ${WORKFLOW_STATUS_CONFIG[value].bgLight} ${WORKFLOW_STATUS_CONFIG[value].bgDark} ${WORKFLOW_STATUS_CONFIG[value].textColor} ${WORKFLOW_STATUS_CONFIG[value].borderClass} disabled:cursor-default`}><WorkflowHexagonIcon status={value} size={13}/>{WORKFLOW_STATUS_CONFIG[value].label}{!disabled&&<ChevronDown size={10}/>}</button>
  {open&&createPortal(<div ref={popup} style={{position:'fixed',left:position.left,top:position.top,maxHeight:position.maxHeight,width:'min(264px,calc(100vw - 24px))'}} className="z-[200] overflow-y-auto p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-gray-200/90 dark:border-slate-700/80 shadow-xl space-y-1">
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 p-2"><Sparkles size={11}/>Đổi trạng thái task</p>
    {MARKETING_STATUS_GUIDES.map(g=><button key={g.status} disabled={saving} title={g.usageRule} onClick={async()=>{setSaving(true);try{await onChange(g.status);setOpen(false);}catch{/* Caller displays the write error; keep the picker open. */}finally{setSaving(false);}}} className="w-full p-2 text-left rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"><span className="flex items-center gap-2 text-xs font-bold"><WorkflowHexagonIcon status={g.status} size={16}/>{WORKFLOW_STATUS_CONFIG[g.status].label}{g.status===value&&<Check size={13}/>}</span><span className="block mt-1 text-[10px] text-gray-500">{STATUS_MARKETING_SUBTITLE[g.status]}</span><span className="block mt-1 text-[10px] text-gray-400 leading-relaxed">{g.shortDesc}</span></button>)}
  </div>,document.body)}</>;
}
