import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  position: number;
  tasks: KanbanTask[];
}

export interface KanbanTask {
  id: string;
  task_ref: string;
  title: string;
  description: string;
  comments_count: number;
  attachments_count: number;
  project?: { name: string };
  assignee?: { name: string; avatar_url: string };
  department?: { name: string };
  priority?: string;
  status?: string;
  due_date?: string;
  start_date?: string;
  column_id: string;
  position: number;
}

export function useKanban() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoard();

    const channel = supabase
      .channel('kanban_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchBoard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBoard = async () => {
    try {
      setLoading(true);

      if (useAuthStore.getState().user?.id === 'dev-admin-id') {
        const mockCols: KanbanColumn[] = [
          { id: 'col1', name: 'To Do', color: '#6b7280', position: 1, tasks: [
            { id: '1', task_ref: 'TK01', title: 'Hoàn thiện giao diện UI/UX', description: 'Design update', comments_count: 2, attachments_count: 1, project: { name: 'K COFFEE Web' }, assignee: { name: 'Bách Bảo', avatar_url: '' }, column_id: 'col1', position: 1 },
            { id: '2', task_ref: 'TK02', title: 'Tối ưu hoá Database', description: 'SQL index', comments_count: 0, attachments_count: 0, project: { name: 'Backend System' }, assignee: { name: 'Admin', avatar_url: '' }, column_id: 'col1', position: 2 }
          ]},
          { id: 'col2', name: 'In Progress', color: '#3b82f6', position: 2, tasks: [
            { id: '3', task_ref: 'TK03', title: 'Viết tài liệu API', description: 'Swagger docs', comments_count: 5, attachments_count: 2, project: { name: 'Backend System' }, assignee: { name: 'Test Staff', avatar_url: '' }, column_id: 'col2', position: 1 }
          ]},
          { id: 'col3', name: 'Done', color: '#10b981', position: 3, tasks: [
            { id: '4', task_ref: 'TK04', title: 'Lên plan Marketing Q4', description: 'Facebook ads', comments_count: 1, attachments_count: 1, project: { name: 'Marketing Q4' }, assignee: { name: 'Admin', avatar_url: '' }, column_id: 'col3', position: 1 }
          ]}
        ];
        setColumns(mockCols);
        setLoading(false);
        return;
      }

      // Fetch columns
      const { data: colsData, error: colsErr } = await supabase
        .from('columns')
        .select('*')
        .order('position', { ascending: true });
      
      if (colsErr) throw colsErr;

      // Fetch tasks
      const { data: tasksData, error: tasksErr } = await supabase
        .from('tasks')
        .select(`
          id, task_ref, title, description, comments_count, attachments_count, column_id, position, priority,
          project:project_id(name),
          assignee:assignee_id(name, avatar_url)
        `)
        .order('position', { ascending: true });

      if (tasksErr) throw tasksErr;

      // Group tasks by column
      const board = colsData.map(col => ({
        id: col.id,
        name: col.name,
        color: col.color,
        position: col.position,
        tasks: (tasksData as any[]).filter(t => t.column_id === col.id).sort((a, b) => a.position - b.position)
      }));

      setColumns(board);
    } catch (err) {
      console.error('Error fetching kanban board', err);
    } finally {
      setLoading(false);
    }
  };

  const moveTask = async (taskId: string, newColumnId: string, newPosition: number) => {
    try {
      // Optimistic update
      setColumns(prev => {
        const newCols = [...prev];
        let taskToMove: any;
        
        // Remove from old
        for (const col of newCols) {
          const idx = col.tasks.findIndex(t => t.id === taskId);
          if (idx !== -1) {
            taskToMove = col.tasks[idx];
            col.tasks.splice(idx, 1);
            break;
          }
        }
        
        // Add to new
        if (taskToMove) {
          taskToMove.column_id = newColumnId;
          const targetCol = newCols.find(c => c.id === newColumnId);
          if (targetCol) {
            targetCol.tasks.splice(newPosition, 0, taskToMove);
          }
        }
        return newCols;
      });

      // DB update
      await supabase
        .from('tasks')
        .update({ column_id: newColumnId, position: newPosition })
        .eq('id', taskId);
        
    } catch (err) {
      console.error('Move error', err);
      fetchBoard(); // Revert
    }
  };

  return { columns, loading, moveTask, refetch: fetchBoard };
}
