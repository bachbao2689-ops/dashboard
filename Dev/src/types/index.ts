export interface User {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee?: User;
  comments: number;
  attachments: number;
  tags?: string[];
}

export interface KpiData {
  id: string;
  title: string;
  value: string;
  trend: number;
  trendLabel?: string;
}
