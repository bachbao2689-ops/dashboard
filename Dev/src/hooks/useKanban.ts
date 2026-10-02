import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

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
          id, task_ref, title, description, comments_count, attachments_count, column_id, position,
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
