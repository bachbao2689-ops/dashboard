import React from 'react';
import { X, Clock, MessageSquare, CheckCircle2, User, MoreHorizontal, Calendar, AlignLeft, Activity } from 'lucide-react';
import type { KanbanTask } from '../../../hooks/useKanban';
import { Avatar } from '../../common/Avatar';

interface TaskDetailPanelProps {
  task: KanbanTask | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, isOpen, onClose }) => {
  if (!task && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-[60] transition-opacity"
          onClick={onClose}
        ></div>
      )}
      
      {/* Slide-out Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-gray-800 shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-md uppercase tracking-wider">
              {task?.task_ref || 'TK-000'}
            </span>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {task && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 space-y-8">
              
              {/* Title Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">{task.title}</h2>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">{((task as any).status || 'todo').replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Priority</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">{((task as any).priority || 'medium')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignee & Dates */}
              <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Assignee</div>
                  <div className="flex items-center gap-2">
                    {task.assignee ? (
                      <>
                        <Avatar name={task.assignee.name} src={task.assignee.avatar_url} />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Due Date</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    2026-10-15 {/* Mock Date for Kanban */}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-gray-500" /> Description
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 leading-relaxed min-h-[100px]">
                  {task.description || 'No description provided for this task.'}
                </div>
              </div>

              {/* Activity & Comments (Mock) */}
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-500" /> Activity & Comments
                </div>
                
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-700 before:to-transparent">
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 text-gray-500 shrink-0 z-10 shadow">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm ml-4 md:ml-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">Task created</span>
                        <span className="text-xs text-gray-500">2 days ago</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Created by Admin</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex gap-3 shrink-0">
          <button className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> Comment
          </button>
          <button className="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Complete
          </button>
        </div>
      </div>
    </>
  );
};
