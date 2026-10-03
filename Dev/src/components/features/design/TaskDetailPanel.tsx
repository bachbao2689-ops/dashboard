import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, Calendar, AlertCircle, User, Image as ImageIcon, MessageCircle, Check, Upload, History } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../common/KpiCard';

export const mockDesignTask = {
  id: "DT-102",
  title: "Summer Campaign Social Assets",
  status: "Review",
  priority: "High",
  assignee: "Alex Rivera",
  dueDate: "Oct 12, 2026",
  brief: "Create 3 Instagram carousel posts for the upcoming Summer Iced Coffee launch. Use bright, energetic colors and emphasize the condensation on the glasses.",
  revisionCount: 2,
  maxRevisions: 3,
  requirements: [
    { label: "Include new branding logo", done: true },
    { label: "3 distinct slides per carousel", done: true },
    { label: "Mobile-first typography", done: false }
  ],
  versions: [
    { version: 1, previewUrl: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=600&auto=format&fit=crop", uploadedBy: "Alex Rivera", date: "Oct 10, 2026", status: "Rejected", feedback: "Too dark" },
    { version: 2, previewUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=600&auto=format&fit=crop", uploadedBy: "Alex Rivera", date: "Oct 11, 2026", status: "Review" }
  ],
  timeline: [
    { action: "Task created", by: "Sarah Connor", date: "Oct 8, 2026" },
    { action: "v1 Uploaded", by: "Alex Rivera", date: "Oct 10, 2026" },
    { action: "v1 Rejected", by: "Marketing Team", date: "Oct 10, 2026" },
    { action: "v2 Uploaded", by: "Alex Rivera", date: "Oct 11, 2026" }
  ],
  comments: [
    { id: "c1", author: "Marketing Team", content: "Make the blue pop more on slide 2.", resolved: false, x: 20, y: 40 },
    { id: "c2", author: "Sarah Connor", content: "Great composition overall.", resolved: true, x: 50, y: 50 }
  ]
};

export interface TaskDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    assignee: string;
    dueDate: string;
    brief: string;
    revisionCount: number;
    maxRevisions: number;
    requirements: { label: string; done: boolean }[];
    versions: { version: number; previewUrl: string; uploadedBy: string; date: string; status: string; feedback?: string }[];
    timeline: { action: string; by: string; date: string }[];
    comments: { id: string; author: string; content: string; resolved: boolean; x?: number; y?: number }[];
  } | null;
}

export function TaskDetailPanel({ isOpen, onClose, task: initialTask }: TaskDetailPanelProps) {
  // Use local state to allow mocking updates like status changes
  const [task, setTask] = useState<TaskDetailPanelProps['task']>(initialTask || mockDesignTask);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [isApproving, setIsApproving] = useState(false);

  // Sync when initialTask changes (e.g. clicking different card)
  useEffect(() => {
    if (initialTask) {
      setTask(initialTask);
      setSelectedVersion(initialTask.versions?.[initialTask.versions.length - 1]?.version || 1);
    }
  }, [initialTask]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!task) return null;

  const currentVersionData = task.versions.find(v => v.version === selectedVersion) || task.versions[0];

  const handleApprove = () => {
    setIsApproving(true);
    setTimeout(() => {
      setIsApproving(false);
      setTask(prev => prev ? { ...prev, status: 'Approved' } : null);
      
      toast((t) => (
        <div className="flex items-center gap-3">
          <div className="bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full p-1">
            <Check size={16} />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900 dark:text-white">Design Approved</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Status updated to Approved</p>
          </div>
          <button 
            onClick={() => {
              setTask(prev => prev ? { ...prev, status: initialTask?.status || 'In Progress' } : null);
              toast.dismiss(t.id);
            }}
            className="ml-auto text-sm font-medium text-primary hover:text-primary/80"
          >
            Undo
          </button>
        </div>
      ), { duration: 5000 });
      
    }, 800);
  };

  const statusColors: Record<string, string> = {
    'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Pending': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  };

  const [width, setWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 400 && newWidth < 900) {
        setWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  return (
    <div 
      style={window.innerWidth >= 768 ? { width: isOpen ? width : 0, minWidth: isOpen ? width : 0, opacity: isOpen ? 1 : 0 } : { width: isOpen ? '100%' : 0, opacity: isOpen ? 1 : 0 }}
      className={`h-full bg-white dark:bg-slate-800 rounded-l-xl md:rounded-l-3xl !rounded-r-none border-l border-gray-200 dark:border-slate-700 shadow-sm shrink-0 absolute md:relative right-0 top-0 z-[60] flex flex-col ${!isResizing ? 'transition-[width,min-width,opacity] duration-300 ease-in-out' : ''}`}
    >
      {/* Resizer Handle */}
      {isOpen && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-transparent hover:bg-primary/20 cursor-col-resize z-50 transition-all -translate-x-1/2 group hidden md:flex items-center justify-center"
          onMouseDown={startResizing}
        >
          <div className="h-12 w-1 bg-gray-400/50 dark:bg-gray-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      )}

      {/* Wrapper to prevent content crushing during width=0 animation */}
      <div className="w-full h-full flex flex-col overflow-hidden" style={{ minWidth: isOpen ? (window.innerWidth >= 768 ? 400 : '100%') : 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{task.title}</h2>
            
            {/* Status Dropdown Mock */}
            <div className="relative group cursor-pointer">
              <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full hover:opacity-80 transition-opacity", statusColors[task.status] || statusColors['Pending'])}>
                {task.status}
              </span>
              <div className="absolute left-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10 p-1">
                {Object.keys(statusColors).map(s => (
                  <div key={s} onClick={() => setTask(prev => prev ? { ...prev, status: s } : null)} className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg">
                    {s}
                  </div>
                ))}
              </div>
            </div>

          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Top Metadata row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group relative">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <User size={14} /> Assignee
              </div>
              <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {task.assignee}
              </div>
              <div className="absolute top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10 p-2 hidden sm:block">
                 <p className="text-xs text-gray-400 mb-2 px-2">Reassign to...</p>
                 <div className="space-y-1">
                   {['Alex Rivera', 'Sarah Connor', 'John Doe'].map(name => (
                     <div key={name} onClick={() => setTask(prev => prev ? { ...prev, assignee: name } : null)} className="px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg">
                       {name}
                     </div>
                   ))}
                 </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group relative">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Calendar size={14} /> Due Date
              </div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {task.dueDate}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group relative">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <AlertCircle size={14} /> Priority
              </div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {task.priority}
              </div>
              <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10 p-1 hidden sm:block">
                {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                  <div key={p} onClick={() => setTask(prev => prev ? { ...prev, priority: p } : null)} className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg">
                    {p}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <History size={14} /> Revisions
              </div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {task.revisionCount} / {task.maxRevisions}
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ImageIcon size={16} /> Current Preview
              </h3>
              <div className="flex gap-2">
                {task.versions.map(v => (
                  <button
                    key={v.version}
                    onClick={() => setSelectedVersion(v.version)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                      selectedVersion === v.version 
                        ? "bg-primary text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700"
                    )}
                  >
                    v{v.version}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 relative group">
              {currentVersionData?.previewUrl ? (
                <img 
                  src={currentVersionData.previewUrl} 
                  alt={`Version ${currentVersionData.version}`} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon size={48} className="mb-2 opacity-50" />
                  <p className="text-sm">No preview available</p>
                </div>
              )}
            </div>
          </div>

          {/* Details Tabs/Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Brief</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50/80 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                  {task.brief}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Requirements</h3>
                <div className="space-y-2">
                  {task.requirements.map((req, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 w-4 h-4 rounded flex items-center justify-center border",
                        req.done 
                          ? "bg-primary border-primary text-white" 
                          : "border-gray-300 dark:border-slate-600"
                      )}>
                        {req.done && <Check size={12} />}
                      </div>
                      <span className={cn("text-sm", req.done ? "text-gray-500 line-through" : "text-gray-700 dark:text-gray-300")}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <MessageCircle size={16} /> Comments
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {task.comments.length > 0 ? task.comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50/80 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-200 dark:border-slate-700 relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-900 dark:text-white">{comment.author}</span>
                        {comment.resolved ? (
                          <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Check size={10}/> Resolved</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Pending</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{comment.content}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500 italic">No comments yet.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock size={16} /> Timeline
                </h3>
                <div className="relative border-l border-gray-200 dark:border-slate-700 ml-2 space-y-4 py-2">
                  {task.timeline.map((event, i) => (
                    <div key={i} className="pl-6 relative">
                      <div className="absolute w-2 h-2 bg-gray-300 dark:bg-slate-600 rounded-full -left-[4.5px] top-1.5"></div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{event.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">by {event.by} • {event.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button 
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-4 py-2 transition-colors w-full sm:w-auto text-left"
            onClick={() => setSelectedVersion(prev => Math.max(1, prev - 1))}
          >
            ← Previous Version
          </button>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
              <Upload size={16} /> <span className="hidden sm:inline">Submit New</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors">
              <X size={16} /> <span className="hidden sm:inline">Reject</span>
            </button>
            <button 
              onClick={handleApprove}
              disabled={isApproving}
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {isApproving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Approve
            </button>
          </div>
        </div>

        </div>
    </div>
  );
}
