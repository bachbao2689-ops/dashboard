import React from 'react';
import { Avatar } from '../components/common/Avatar';
import { Paperclip, MessageSquare } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useKanban } from '../hooks/useKanban';
import type { KanbanTask } from '../hooks/useKanban';
import { TaskDetailPanel } from '../components/features/tasks/TaskDetailPanel';
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';

const SortableTaskItem = ({ task, onClick }: { task: KanbanTask, onClick: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative overflow-hidden group"
      onClick={onClick}>
      
      {task.project && (
        <div className="flex items-center space-x-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary/60"></span>
          <span className="text-xs font-semibold text-primary">{task.project.name}</span>
        </div>
      )}
      
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 leading-snug">{task.title}</h4>
      {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>}
      
      <div className="flex items-center justify-between mt-4">
        <div className="flex -space-x-2">
          {task.assignee ? (
            <Avatar name={task.assignee.name} src={task.assignee.avatar_url} />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-gray-500">?</div>
          )}
        </div>
        <div className="flex items-center space-x-3 text-gray-400">
          <div className="flex items-center space-x-1">
            <MessageSquare className="w-3 h-3" />
            <span className="text-xs">{task.comments_count || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Paperclip className="w-3 h-3" />
            <span className="text-xs">{task.attachments_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProjectsKanban: React.FC<{hideHeader?: boolean}> = ({hideHeader = false}) => {
  const { columns, loading, moveTask } = useKanban();
  const [selectedTask, setSelectedTask] = React.useState<KanbanTask | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      // Find old and new col
      let oldColId, newColId;
      for (const col of columns) {
        if (col.tasks.find(t => t.id === active.id)) oldColId = col.id;
        if (col.id === over.id || col.tasks.find(t => t.id === over.id)) newColId = col.id;
      }
      
      if (oldColId && newColId) {
        // Find position index
        const destCol = columns.find(c => c.id === newColId);
        let newIndex = 0;
        if (destCol) {
          const overIndex = destCol.tasks.findIndex(t => t.id === over.id);
          newIndex = overIndex >= 0 ? overIndex : destCol.tasks.length;
        }
        moveTask(active.id, newColId, newIndex);
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Board...</div>;
  }

  return (
    <div className={hideHeader ? "h-full flex" : "h-full flex"}>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pr-4">
      { !hideHeader && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects Kanban</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Drag and drop to update status</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {columns.map(column => (
            <div key={column.id} className="flex flex-col w-80 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full bg-${column.color}-500`}></span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{column.name}</h3>
                  <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 text-xs py-0.5 px-2 rounded-full font-medium">
                    {column.tasks.length}
                  </span>
                </div>
              </div>

              <div className="card-hub rounded-xl flex-1 p-3 overflow-y-auto min-h-[200px]">
                <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {column.tasks.map(task => (
                      <SortableTaskItem key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                    ))}
                  </div>
                </SortableContext>
                {/* Empty drop zone placeholder */}
                {column.tasks.length === 0 && (
                  <div id={column.id} className="h-full w-full border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg" />
                )}
              </div>
            </div>
          ))}
        </div>
      </DndContext>
    
      </div>
      <TaskDetailPanel task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} />
</div>
  );
};
