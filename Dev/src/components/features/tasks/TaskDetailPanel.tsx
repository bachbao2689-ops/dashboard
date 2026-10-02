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
      style={{ 
        width: isOpen ? width : 0, 
        minWidth: isOpen ? width : 0, 
        opacity: isOpen ? 1 : 0 
      }}
      className={`h-full glass-panel rounded-l-3xl !rounded-r-none border-l border-white/40 shadow-[-10px_0_30px_-15px_rgba(31,38,135,0.15)] shrink-0 relative flex flex-col z-40 ${!isResizing ? 'transition-[width,min-width,opacity] duration-300 ease-in-out' : ''}`}
    >
      {/* Resizer Handle */}
      {isOpen && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-transparent hover:bg-primary/20 cursor-col-resize z-50 transition-all -translate-x-1/2 group flex items-center justify-center"
          onMouseDown={startResizing}
        >
          <div className="h-12 w-1 bg-gray-400/50 dark:bg-gray-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      )}

      {/* Wrapper to prevent content crushing during width=0 animation */}
      <div className="w-full h-full flex flex-col overflow-hidden" style={{ minWidth: isOpen ? 320 : 0 }}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/20 dark:border-gray-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm border border-white/40">
              {task?.task_ref || 'TK-000'}
            </span>
            <button className="text-gray-500 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-gray-700/60 text-gray-500 hover:text-gray-800 transition-colors shadow-sm border border-transparent hover:border-white/40">
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
                  <div className="flex items-center gap-3 bg-white/40 dark:bg-gray-800/40 p-2 pr-4 rounded-full border border-white/50 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">{((task as any).status || 'todo').replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/40 dark:bg-gray-800/40 p-2 pr-4 rounded-full border border-white/50 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">{((task as any).priority || 'medium')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignee & Dates */}
              <div className="grid grid-cols-2 gap-6 bg-white/30 dark:bg-gray-800/30 p-5 rounded-2xl border border-white/40 shadow-glass-inset">
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Assignee</div>
                  <div className="flex items-center gap-2">
                    {task.assignee ? (
                      <>
                        <Avatar name={task.assignee.name} src={task.assignee.avatar_url} />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{task.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-gray-500 bg-gray-100/50 dark:bg-gray-800/50 px-2 py-1 rounded-md">Unassigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Due Date</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-gray-800/50 inline-block px-3 py-1.5 rounded-lg border border-white/40 shadow-sm">
                    2026-10-15
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-gray-500" /> Description
                </div>
                <div className="bg-white/40 dark:bg-gray-800/40 p-5 rounded-2xl border border-white/50 shadow-glass-inset text-sm text-gray-700 dark:text-gray-300 leading-relaxed min-h-[100px]">
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
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0 z-10 shadow-md">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/50 shadow-glass-inset bg-white/60 dark:bg-gray-800/60 ml-4 md:ml-0 backdrop-blur-md hover:shadow-lg transition-shadow">
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
        <div className="p-5 border-t border-white/20 dark:border-gray-700/50 bg-white/20 dark:bg-gray-800/20 backdrop-blur-xl flex gap-4 shrink-0 rounded-bl-3xl">
          <button className="flex-1 px-4 py-2.5 bg-white/60 dark:bg-gray-700/60 border border-white/50 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm hover:bg-white dark:hover:bg-gray-600 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> Comment
          </button>
          <button className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Complete
          </button>
        </div>
      </div>
    </div>
  );
};
