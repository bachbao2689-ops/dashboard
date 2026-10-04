import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, MessageSquare, CheckCircle2, User, MoreHorizontal, Calendar, AlignLeft, Activity } from 'lucide-react';
import type { KanbanTask } from '../../../hooks/useKanban';
import { Avatar } from '../../common/Avatar';

interface TaskDetailPanelProps {
  task: KanbanTask | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, isOpen, onClose }) => {
  const [width, setWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 320 && newWidth < 800) {
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
          <div className="h-12 w-1 bg-gray-400/50 dark:bg-slate-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      )}

      {/* Wrapper to prevent content crushing during width=0 animation */}
      <div className="w-full h-full flex flex-col overflow-hidden" style={{ minWidth: isOpen ? (window.innerWidth >= 768 ? 320 : '100%') : 0 }}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm border border-gray-200 dark:border-slate-700">
              {task?.task_ref || 'TK-000'}
            </span>
            <button className="text-gray-500 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {task && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 md:px-8 space-y-8">
              
              {/* Title Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">{task.title}</h2>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 pr-4 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">{((task as any).status || 'todo').replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 pr-4 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">{((task as any).priority || 'medium')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-6 bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Assignee</div>
                  <div className="flex items-center gap-2">
                    {task.assignee ? (
                      <>
                        <Avatar name={task.assignee.name} src={task.assignee.avatar_url} />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{task.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md">Unassigned</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Due Date</div>
                  {task.due_date ? (
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800 inline-block px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                      {task.due_date}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md">N/A</span>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Start Date</div>
                  {(task as any).start_date ? (
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800 inline-block px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                      {(task as any).start_date}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md">N/A</span>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Project</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {task.project?.name || <span className="text-gray-500 font-medium">No Project</span>}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Department</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {(task as any).department?.name || <span className="text-gray-500 font-medium">N/A</span>}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-gray-500" /> Description
                </div>
                <div className="bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300 leading-relaxed min-h-[100px] whitespace-pre-wrap">
                  {task.description || 'No description provided for this task.'}
                </div>
              </div>

              {/* Activity & Comments (Timeline) */}
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-5 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-500" /> Activity & Comments
                </div>
                
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 dark:before:via-gray-600 before:to-transparent">
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-500 shrink-0 z-10 shadow-sm">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 ml-4 md:ml-0 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">Task created</span>
                        <span className="text-xs font-medium text-gray-500">2 days ago</span>
                      </div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Created by Admin</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
        
        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-4 shrink-0 rounded-bl-xl">
          <button className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-slate-600 transition-all shadow-sm flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> Comment
          </button>
          <button className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Complete
          </button>
        </div>
      </div>
    </div>
  );
};
