import React, { useState } from 'react';
import { Avatar } from '../components/common/Avatar';
import { Paperclip, MessageSquare } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import tasksData from '../data/tasks.json';

interface Task {
  id: string;
  tag: string;
  title: string;
  desc: string;
  comments: number;
  attachments: number;
  users: string[];
}

// Convert JSON tasks to Kanban format
const loadColumns = () => {
  const cols: Record<string, Task[]> = {
    'Yet to Start': [],
    'In Progress': [],
    'Feedback': [],
    'Completed': []
  };

  tasksData.forEach(t => {
    const status = (t['Trạng thái'] || '').toLowerCase();
    let col = 'Yet to Start';
    if (status.includes('done')) col = 'Completed';
    else if (status.includes('feedback')) col = 'Feedback';
    else if (status.includes('progress') || status.includes('on going')) col = 'In Progress';

    const task: Task = {
      id: t['ID'],
      tag: t['Dự án'] || 'N/A',
      title: t['Tên công việc'] || 'Untitled',
      desc: (t['Nội dung'] || '').replace('Link\n(gắn link vào đây)', '').trim() || t['Sản phẩm cần giao'] || '',
      comments: Math.floor(Math.random() * 5),
      attachments: Math.floor(Math.random() * 3),
      users: [t['Người phụ trách']]
    };

    if (cols[col]) {
      cols[col].push(task);
    }
  });
  return cols;
};

const SortableTaskItem = ({ task }: { task: Task }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`glass-panel p-5 rounded-2xl mb-4 cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-50 scale-105 shadow-xl z-50' : 'hover:-translate-y-1 hover:shadow-lg z-10'}`}>
      <div className="bg-white/50 backdrop-blur text-primary font-medium text-xs px-2.5 py-1 rounded-lg inline-block mb-3 border border-white/60 shadow-sm">{task.tag}</div>
      <h4 className="font-bold text-gray-800 mb-2 text-sm">{task.title}</h4>
      {task.desc && <p className="text-xs text-gray-500 mb-5 line-clamp-2 leading-relaxed">{task.desc}</p>}
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex -space-x-2">
          {task.users.map((u, i) => <Avatar key={i} name={u} className="w-7 h-7 border-2 border-white text-[10px] shadow-sm" />)}
        </div>
        <div className="flex items-center gap-4 text-gray-400 text-xs font-medium">
          <span className="flex items-center gap-1 hover:text-primary transition-colors"><Paperclip size={14} /> {task.attachments}</span>
          <span className="flex items-center gap-1 hover:text-primary transition-colors"><MessageSquare size={14} /> {task.comments}</span>
        </div>
      </div>
    </div>
  );
};

export const ProjectsKanban: React.FC = () => {
  const [columns] = useState(loadColumns());

  return (
    <div className="h-full flex flex-col z-10 relative">
      <div className="flex justify-between items-center mb-8 px-2">
        <div className="flex gap-8 text-sm font-semibold text-gray-400 w-full overflow-x-auto custom-scrollbar pb-1">
          {['Overview', 'Board', 'Timeline', 'Files', 'Activity'].map((tab, i) => (
            <span key={tab} className={`pb-2 whitespace-nowrap cursor-pointer transition-colors relative ${i === 1 ? 'text-gray-900' : 'hover:text-gray-700'}`}>
              {tab}
              {i === 1 && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full shadow-[0_0_8px_rgba(0,46,109,0.5)]"></span>}
            </span>
          ))}
        </div>
        <div className="flex gap-3 ml-8 flex-shrink-0">
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-xl transition-all shadow-md">
             Add Task
          </button>
        </div>
      </div>

      <DndContext collisionDetection={closestCenter}>
        <div className="flex gap-6 h-full overflow-x-auto pb-4 custom-scrollbar">
          {Object.entries(columns).map(([colName, tasks], i) => (
            <div key={colName} className="min-w-[300px] max-w-[300px] flex-1 flex flex-col">
              <div className="flex items-center gap-3 font-bold text-gray-800 mb-6 px-2">
                {colName} 
                <span className="bg-white/50 backdrop-blur border border-white/60 text-gray-500 font-semibold text-xs px-2 py-0.5 rounded-full shadow-sm">
                  {tasks.length}
                </span>
                <div className={`ml-auto w-8 h-1 rounded-full ${
                  i === 0 ? 'bg-gray-300' : 
                  i === 1 ? 'bg-blue-400' : 
                  i === 2 ? 'bg-orange-400' : 
                  'bg-emerald-400'
                }`}></div>
              </div>
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
                  {tasks.map(task => (
                    <SortableTaskItem key={task.id} task={task} />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
};
