import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, User, MoreHorizontal, Calendar, Maximize2, ChevronsRight } from 'lucide-react';
import type { KanbanTask } from '../../../hooks/useKanban';
import { Avatar } from '../../common/Avatar';

interface TaskDetailPanelProps {
  task: KanbanTask | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, isOpen, onClose }) => {
  const [width, setWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate width from the right edge of the screen
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 320 && newWidth < 1000) {
        setWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection while resizing
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
      className={`h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shrink-0 relative flex flex-col z-40 ${!isResizing ? 'transition-[width,min-width,opacity] duration-300 ease-in-out' : ''}`}
    >
      {/* Resizer Handle */}
      {isOpen && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 hover:w-2 bg-transparent hover:bg-primary/50 cursor-col-resize z-50 transition-all -translate-x-1/2 group"
          onMouseDown={startResizing}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 bg-gray-300 dark:bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      )}

      {/* Wrapper to prevent content crushing during width=0 animation */}
      <div className="w-full h-full flex flex-col overflow-hidden" style={{ minWidth: isOpen ? 320 : 0 }}>
        {/* Header - Notion Style */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors flex items-center gap-1 text-xs font-medium" title="Close side peek">
              <ChevronsRight className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors" title="Open as page">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">Share</span>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {task && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 md:px-8 space-y-8">
              
              {/* Title Section */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">{task.title}</h1>
                
                {/* Properties Grid - Notion Style */}
                <div className="grid grid-cols-1 gap-y-3 gap-x-6 text-sm">
                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><User className="w-4 h-4" /> Assignee</div>
                    <div className="flex items-center gap-2">
                      {task.assignee ? (
                        <>
                          <Avatar name={task.assignee.name} src={task.assignee.avatar_url} />
                          <span className="text-gray-900 dark:text-gray-100">{task.assignee.name}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">Empty</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Status</div>
                    <div>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                        {((task as any).status || 'todo').replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[120px_1fr] items-center">
                    <div className="text-gray-500 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Due date</div>
                    <div className="text-gray-900 dark:text-gray-100">
                      08/30/2025
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Comment */}
              <div className="pt-2">
                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
                  <img src="https://i.pravatar.cc/150?u=byewind" className="w-7 h-7 rounded-full" alt="Me" />
                  <input type="text" placeholder="Add a comment..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder-gray-400 outline-none" />
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Task description</h3>
                <div className="text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed">
                  {task.description || 'Provide an overview of the task and related details.'}
                </div>
              </div>
              
              {/* Checklist / Subtasks mock */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Sub-tasks</h3>
                <div className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="mt-1 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="line-through text-gray-400">Benchmark đối thủ</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="mt-1 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="line-through text-gray-400">Visual trends 2026</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input type="checkbox" className="mt-1 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span>Xu hướng quốc tế</span>
                  </label>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};
