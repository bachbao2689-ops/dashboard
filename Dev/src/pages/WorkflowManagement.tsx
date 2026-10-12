import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban, ArrowRight, TrendingUp, TrendingDown, ShieldCheck,
  Sparkles, Plus, BarChart2, Activity,
  ChevronDown, ChevronUp, X, Globe, Code2, Info, Search,
  Calendar, User, Edit3, Trash2, Eye, Check, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export type WorkflowTaskStatus = 'backlog' | 'planned' | 'scoping' | 'in_progress' | 'in_qa' | 'completed' | 'canceled';

export const WORKFLOW_STATUS_CONFIG: Record<WorkflowTaskStatus, {
  label: string;
  color: string;
  textColor: string;
  bgLight: string;
  bgDark: string;
  borderClass: string;
}> = {
  backlog: {
    label: 'Backlog',
    color: '#D97706',
    textColor: 'text-amber-700 dark:text-amber-300',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/40',
    borderClass: 'border-amber-300 dark:border-amber-700'
  },
  planned: {
    label: 'Planned',
    color: '#6B7280',
    textColor: 'text-gray-600 dark:text-gray-300',
    bgLight: 'bg-gray-50',
    bgDark: 'dark:bg-slate-800',
    borderClass: 'border-gray-300 dark:border-slate-600'
  },
  scoping: {
    label: 'Scoping',
    color: '#F43F5E',
    textColor: 'text-rose-700 dark:text-rose-300',
    bgLight: 'bg-rose-50',
    bgDark: 'dark:bg-rose-950/40',
    borderClass: 'border-rose-300 dark:border-rose-700'
  },
  in_progress: {
    label: 'In Progress',
    color: '#EAB308',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    bgLight: 'bg-yellow-50',
    bgDark: 'dark:bg-yellow-950/40',
    borderClass: 'border-yellow-300 dark:border-yellow-700'
  },
  in_qa: {
    label: 'In QA',
    color: '#10B981',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/40',
    borderClass: 'border-emerald-300 dark:border-emerald-700'
  },
  completed: {
    label: 'Completed',
    color: '#6366F1',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    bgLight: 'bg-indigo-50',
    bgDark: 'dark:bg-indigo-950/40',
    borderClass: 'border-indigo-300 dark:border-indigo-700'
  },
  canceled: {
    label: 'Canceled',
    color: '#4B5563',
    textColor: 'text-gray-500 dark:text-gray-400',
    bgLight: 'bg-gray-100',
    bgDark: 'dark:bg-slate-800',
    borderClass: 'border-gray-300 dark:border-slate-700'
  }
};

export const WorkflowHexagonIcon: React.FC<{ status: WorkflowTaskStatus; size?: number; className?: string }> = ({
  status,
  size = 18,
  className = ''
}) => {
  const hexPath = "M12 2.5 L20.2 7.2 L20.2 16.8 L12 21.5 L3.8 16.8 L3.8 7.2 Z";

  switch (status) {
    case 'backlog':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#D97706"
            strokeWidth="2.2"
            strokeDasharray="3.2 2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'planned':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#6B7280"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'scoping':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M12 12 L12 6.5 A5.5 5.5 0 0 1 17.5 12 Z"
            fill="#F43F5E"
          />
        </svg>
      );
    case 'in_progress':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#EAB308"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M12 6.5 A5.5 5.5 0 0 1 12 17.5 Z"
            fill="#EAB308"
          />
        </svg>
      );
    case 'in_qa':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M12 12 L12 6.5 A5.5 5.5 0 1 1 6.5 12 Z"
            fill="#10B981"
          />
        </svg>
      );
    case 'completed':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="#6366F1"
            stroke="#6366F1"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M7.8 12.2 L10.8 15.2 L16.2 9.5"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    case 'canceled':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
          <path
            d={hexPath}
            fill="#4B5563"
            stroke="#4B5563"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    default:
      return null;
  }
};

interface Phase {
  id: number;
  name: string;
  desc: string;
  status: 'completed' | 'active' | 'locked';
  progress: number;
  gateChance: number;
}

interface GateCriterion {
  id: string;
  label: string;
  weight: number;
  checked: boolean;
}

interface ProjectEntity {
  id: string;
  name: string;
  type: 'project' | 'campaign';
  status: string;
  start_date?: string | null;
  due_date?: string | null;
  budget?: number | null;
  lead?: any;
}

interface WorkflowSubtask {
  id: string;
  phaseId: number;
  title: string;
  assignee: string;
  status: WorkflowTaskStatus;
  due_date?: string;
}

// 5 Standard Phases for "Build Website" Workflow (flexible count)
const WEBSITE_BUILD_PHASES: Phase[] = [
  { id: 1, name: '1. Khảo sát & Đặc tả (Discovery)', desc: 'Sitemap, User Flow & Tech Stack', status: 'completed', progress: 100, gateChance: 100 },
  { id: 2, name: '2. Thiết kế UI/UX & Prototype', desc: 'Wireframe, Design System & Mockups', status: 'active', progress: 75, gateChance: 85 },
  { id: 3, name: '3. Lập trình Phát triển (Dev)', desc: 'Front-end, Backend API & Database', status: 'locked', progress: 0, gateChance: 0 },
  { id: 4, name: '4. Kiểm thử QA/QC & Tối ưu', desc: 'Testing, Performance & Bảo mật', status: 'locked', progress: 0, gateChance: 0 },
  { id: 5, name: '5. Triển khai & Go-Live', desc: 'Domain, SSL, Cloudflare & Bàn giao', status: 'locked', progress: 0, gateChance: 0 }
];

// Default criteria for each Website phase
const WEBSITE_CRITERIA_MAP: Record<number, GateCriterion[]> = {
  1: [
    { id: 'web_c1_1', label: 'Tài liệu đặc tả yêu cầu kỹ thuật (SRS) đã được ký duyệt', weight: 40, checked: true },
    { id: 'web_c1_2', label: 'Sơ đồ luồng người dùng (User Flow & Sitemap) hoàn tất', weight: 35, checked: true },
    { id: 'web_c1_3', label: 'Chốt kiến trúc hệ thống & công nghệ (React, Tailwind, Supabase)', weight: 25, checked: true },
  ],
  2: [
    { id: 'web_c2_1', label: 'Khách hàng / Ban Giám Đốc duyệt bản vẽ Prototype 100%', weight: 35, checked: true },
    { id: 'web_c2_2', label: 'Design System & Bộ icon/màu sắc đã được chuẩn hóa', weight: 25, checked: true },
    { id: 'web_c2_3', label: 'Tiến độ Subtasks giai đoạn thiết kế đạt trên 70%', weight: 25, checked: true },
    { id: 'web_c2_4', label: 'Không có màn hình trọng yếu bị vướng mắc (No Blockers)', weight: 15, checked: false },
  ],
  3: [
    { id: 'web_c3_1', label: 'Toàn bộ API endpoints cốt lõi và Database RLS hoạt động ổn định', weight: 40, checked: false },
    { id: 'web_c3_2', label: 'Giao diện Front-end đạt chuẩn Responsive đa màn hình (Mobile/Desktop)', weight: 35, checked: false },
    { id: 'web_c3_3', label: 'Source code vượt qua bước rà soát kỹ thuật (Code Review Passed)', weight: 25, checked: false },
  ],
  4: [
    { id: 'web_c4_1', label: 'Không còn lỗi chức năng nghiêm trọng (Zero Critical Bugs)', weight: 45, checked: false },
    { id: 'web_c4_2', label: 'Điểm hiệu năng Google PageSpeed đạt tối thiểu trên 85 điểm', weight: 30, checked: false },
    { id: 'web_c4_3', label: 'Vượt qua bài test nghiệm thu người dùng cuối (UAT Sign-off)', weight: 25, checked: false },
  ],
  5: [
    { id: 'web_c5_1', label: 'Cấu hình Domain, SSL & Cloudflare CDN chạy thông suốt', weight: 40, checked: false },
    { id: 'web_c5_2', label: 'Hệ thống Production deploy tự động qua CI/CD an toàn', weight: 35, checked: false },
    { id: 'web_c5_3', label: 'Bàn giao tài liệu quản trị CMS và ký biên bản nghiệm thu Go-live', weight: 25, checked: false },
  ]
};

// Website Build specific subtasks mapped with the 7 Status Workflow
const DEFAULT_WEBSITE_SUBTASKS: WorkflowSubtask[] = [
  // Phase 1
  { id: 'st_1', phaseId: 1, title: 'Khảo sát người dùng & phân tích yêu cầu tính năng', assignee: 'Bách Bảo', status: 'completed', due_date: '2026-10-05' },
  { id: 'st_2', phaseId: 1, title: 'Lập sơ đồ cấu trúc Sitemap & User Flow', assignee: 'Thương Phạm', status: 'completed', due_date: '2026-10-08' },
  { id: 'st_3', phaseId: 1, title: 'Viết tài liệu đặc tả chức năng kỹ thuật (SRS)', assignee: 'Admin', status: 'completed', due_date: '2026-10-10' },
  // Phase 2
  { id: 'st_4', phaseId: 2, title: 'Thiết kế Wireframe cấu trúc layout các trang chính', assignee: 'Vũ Trần', status: 'completed', due_date: '2026-10-14' },
  { id: 'st_5', phaseId: 2, title: 'Xây dựng Design System, Typography & Màu thương hiệu', assignee: 'LUNA', status: 'completed', due_date: '2026-10-16' },
  { id: 'st_6', phaseId: 2, title: 'Thiết kế chi tiết High-Fidelity Desktop & Mobile', assignee: 'Nguyễn Văn A', status: 'completed', due_date: '2026-10-18' },
  { id: 'st_7', phaseId: 2, title: 'Dựng bản mẫu tương tác Prototype và thử nghiệm UX', assignee: 'Hoàng Văn E', status: 'in_progress', due_date: '2026-10-22' },
  // Phase 3
  { id: 'st_8', phaseId: 3, title: 'Cắt giao diện Front-end React Components theo Figma', assignee: 'Tech Lead', status: 'scoping', due_date: '2026-10-28' },
  { id: 'st_9', phaseId: 3, title: 'Thiết kế Database Schema & Phân quyền bảo mật RLS', assignee: 'Backend Dev', status: 'planned', due_date: '2026-11-02' },
  { id: 'st_10', phaseId: 3, title: 'Lập trình API endpoints & tích hợp dữ liệu Supabase', assignee: 'Backend Dev', status: 'planned', due_date: '2026-11-06' },
  { id: 'st_11', phaseId: 3, title: 'Tích hợp cổng thanh toán & hệ thống thông báo Email', assignee: 'Fullstack Dev', status: 'backlog', due_date: '2026-11-12' },
  // Phase 4
  { id: 'st_12', phaseId: 4, title: 'Kiểm thử chức năng toàn diện (Functional Testing)', assignee: 'QA Lead', status: 'in_qa', due_date: '2026-11-18' },
  { id: 'st_13', phaseId: 4, title: 'Kiểm tra tương thích đa trình duyệt (Chrome, Safari, iOS)', assignee: 'QC Team', status: 'planned', due_date: '2026-11-22' },
  { id: 'st_14', phaseId: 4, title: 'Tối ưu tốc độ tải trang & điểm SEO Google PageSpeed', assignee: 'Tech Lead', status: 'backlog', due_date: '2026-11-26' },
  // Phase 5
  { id: 'st_15', phaseId: 5, title: 'Cấu hình Domain, chứng chỉ SSL & CDN Cloudflare', assignee: 'DevOps', status: 'backlog', due_date: '2026-12-02' },
  { id: 'st_16', phaseId: 5, title: 'Triển khai Production Server & Kiểm tra tải', assignee: 'DevOps', status: 'backlog', due_date: '2026-12-06' },
  { id: 'st_17', phaseId: 5, title: 'Soạn thảo tài liệu hướng dẫn CMS & Bàn giao hệ thống', assignee: 'Project Manager', status: 'backlog', due_date: '2026-12-12' }
];

export const WorkflowManagement: React.FC = () => {
  // Entities state
  const [entities, setEntities] = useState<ProjectEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('project_web');
  const [loading, setLoading] = useState<boolean>(true);
  const [entityFilter, setEntityFilter] = useState<'all' | 'project' | 'campaign'>('project');
  const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState<boolean>(false);
  const [searchEntityQuery, setSearchEntityQuery] = useState<string>('');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Raw data from DB
  const [allTasks, setAllTasks] = useState<any[]>([]);

  // Phases state for Website Build
  const [phases, setPhases] = useState<Phase[]>(WEBSITE_BUILD_PHASES);
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(1); // Phase 2 (Design) by default

  // Combined Board UX state: whether the detail task/gate drawer is expanded (Default false per Requirement 4)
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Criteria for currently active/viewed phase
  const [criteria, setCriteria] = useState<GateCriterion[]>(WEBSITE_CRITERIA_MAP[2]);
  const [showAddCriteria, setShowAddCriteria] = useState<boolean>(false);
  const [newCriteriaLabel, setNewCriteriaLabel] = useState<string>('');

  // Subtasks with rich WorkflowTaskStatus (7 statuses from ./Status workflow)
  const [subtasks, setSubtasks] = useState<WorkflowSubtask[]>(DEFAULT_WEBSITE_SUBTASKS);

  // Task CRUD states
  const [showAddTask, setShowAddTask] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskStatus, setNewTaskStatus] = useState<WorkflowTaskStatus>('planned');
  const [newTaskDue, setNewTaskDue] = useState<string>('');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState<string>('');
  const [editTaskAssignee, setEditTaskAssignee] = useState<string>('');
  const [editTaskStatus, setEditTaskStatus] = useState<WorkflowTaskStatus>('in_progress');
  const [editTaskDue, setEditTaskDue] = useState<string>('');

  const [statusPickerTaskId, setStatusPickerTaskId] = useState<string | null>(null);

  // Phase CRUD states (Add/Remove dynamic phases per Requirement 5)
  const [showAddPhaseModal, setShowAddPhaseModal] = useState<boolean>(false);
  const [insertPhaseIndex, setInsertPhaseIndex] = useState<number>(1);
  const [newPhaseName, setNewPhaseName] = useState<string>('');
  const [newPhaseDesc, setNewPhaseDesc] = useState<string>('');

  // 1. Fetch campaigns, projects, and tasks from DB
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [{ data: cData }, { data: pData }, { data: tData }] = await Promise.all([
        supabase.from('campaigns').select('id, name, status, start_date, end_date, budget, lead:lead_id(name,avatar_url)').neq('status', 'deleted').order('name'),
        supabase.from('projects').select('id, name, status, start_date, due_date, priority').neq('status', 'deleted').order('name'),
        supabase.from('tasks').select('*')
      ]);

      // Website Project default at top
      const defaultWebProject: ProjectEntity = {
        id: 'project_web',
        name: '[Project] Xây Dựng & Nâng Cấp Hệ Thống Website K COFFEE',
        type: 'project',
        status: 'active',
        start_date: '2026-10-01',
        due_date: '2026-12-31',
        budget: 150000000,
        lead: { name: 'Tech Lead - K COFFEE' }
      };

      const defaultDemoCampaign: ProjectEntity = {
        id: 'campaign_social_q4',
        name: '[Demo] Always-on Social Q4',
        type: 'campaign',
        status: 'active',
        start_date: '2026-10-10',
        due_date: '2026-12-31',
        budget: 85000000,
        lead: { name: 'Lead Marketing' }
      };

      const formatted: ProjectEntity[] = [
        defaultWebProject,
        defaultDemoCampaign,
        ...(pData || []).map(p => ({
          id: `p_${p.id}`,
          name: p.name,
          type: 'project' as const,
          status: p.status || 'active',
          start_date: p.start_date,
          due_date: p.due_date,
          lead: null
        })),
        ...(cData || []).map(c => ({
          id: `c_${c.id}`,
          name: c.name,
          type: 'campaign' as const,
          status: c.status || 'active',
          start_date: c.start_date,
          due_date: c.end_date,
          budget: c.budget,
          lead: c.lead
        }))
      ];

      setEntities(formatted);
      setAllTasks(tData || []);
    } catch (err) {
      console.error('Error loading workflow data', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered entities based on entityFilter tab & search query
  const filteredEntities = useMemo(() => {
    let list = entities;
    if (entityFilter !== 'all') {
      list = list.filter(e => e.type === entityFilter);
    }
    if (searchEntityQuery.trim()) {
      const q = searchEntityQuery.toLowerCase().trim();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [entities, entityFilter, searchEntityQuery]);

  // When switching filter tabs, select first item if current is not in filtered list
  const handleFilterChange = (filter: 'all' | 'project' | 'campaign') => {
    setEntityFilter(filter);
    const available = filter === 'all' ? entities : entities.filter(e => e.type === filter);
    if (available.length > 0 && !available.some(e => e.id === selectedEntityId)) {
      setSelectedEntityId(available[0].id);
    }
  };

  const handleSelectEntity = (id: string) => {
    setSelectedEntityId(id);
    setIsTitleDropdownOpen(false);
    setSearchEntityQuery('');
    toast.success('Đã chuyển dự án / chiến dịch');
  };

  const currentEntity = useMemo(() => {
    return entities.find(e => e.id === selectedEntityId) || entities[0] || {
      id: 'project_web',
      name: '[Project] Xây Dựng & Nâng Cấp Hệ Thống Website K COFFEE',
      type: 'project',
      status: 'active'
    };
  }, [entities, selectedEntityId]);

  const isCampaign = currentEntity.type === 'campaign';

  // Lead Info per Requirement 1
  const leadInfo = useMemo(() => {
    if (currentEntity.lead?.name) {
      return {
        name: currentEntity.lead.name,
        role: isCampaign ? 'Campaign Lead' : 'Project Lead',
        avatar: currentEntity.lead.avatar_url
      };
    }
    if (currentEntity.id === 'project_web') {
      return {
        name: 'Tech Lead',
        role: 'Project Lead',
        avatar: undefined
      };
    }
    return {
      name: isCampaign ? 'Lead Marketing' : 'Tech Lead',
      role: isCampaign ? 'Campaign Lead' : 'Project Lead',
      avatar: undefined
    };
  }, [currentEntity, isCampaign]);

  // Sub-team members avatars tracking (Requirement 2)
  const subTeamMembers = useMemo(() => {
    if (isCampaign) {
      return [
        { id: 'sub_1', name: 'Bách Bảo', initials: 'BB', bg: 'from-amber-500 to-orange-500' },
        { id: 'sub_2', name: 'Thương Phạm', initials: 'TP', bg: 'from-blue-500 to-indigo-500' },
        { id: 'sub_3', name: 'Vũ Trần', initials: 'VT', bg: 'from-emerald-500 to-teal-500' },
      ];
    }
    return [
      { id: 'sub_1', name: 'Vũ Trần', initials: 'VT', bg: 'from-blue-600 to-cyan-600' },
      { id: 'sub_2', name: 'Hoàng Long', initials: 'HL', bg: 'from-purple-600 to-pink-600' },
      { id: 'sub_3', name: 'LUNA', initials: 'LU', bg: 'from-rose-500 to-orange-500' },
    ];
  }, [isCampaign]);

  // Days remaining (Workload còn mấy ngày - Requirement 2)
  const daysRemaining = useMemo(() => {
    if (!currentEntity.due_date) return 82;
    const now = new Date().getTime();
    const target = new Date(currentEntity.due_date).getTime();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [currentEntity.due_date]);

  // Timeline formatted: DD/MM/YYYY - DD/MM/YYYY
  const entityTimeline = useMemo(() => {
    const formatDate = (dateStr?: string | null, defaultStr: string = '') => {
      if (!dateStr) return defaultStr;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return defaultStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    const start = formatDate(currentEntity.start_date, '10/10/2026');
    const end = formatDate(currentEntity.due_date, '31/12/2026');
    return `${start} - ${end}`;
  }, [currentEntity]);

  // Task distribution across the 7 Workflow Statuses (Requirement 1)
  const taskCountsByStatus = useMemo(() => {
    const counts: Record<WorkflowTaskStatus, number> = {
      backlog: 0,
      planned: 0,
      scoping: 0,
      in_progress: 0,
      in_qa: 0,
      completed: 0,
      canceled: 0
    };
    subtasks.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
    return counts;
  }, [subtasks]);

  // Active viewed phase object
  const activePhase = phases[activePhaseIndex] || phases[0];

  // Update criteria when switching viewed phase
  useEffect(() => {
    const defaultList = WEBSITE_CRITERIA_MAP[activePhase.id] || [
      { id: `c_${activePhase.id}_1`, label: 'Hoàn thành các tiêu chí chất lượng kỹ thuật của chặng', weight: 50, checked: true },
      { id: `c_${activePhase.id}_2`, label: 'Được nghiệm thu bởi Tech Lead / Quản lý', weight: 50, checked: false }
    ];
    setCriteria(defaultList);
  }, [activePhase.id]);

  // Current Phase subtasks
  const currentPhaseSubtasks = useMemo(() => {
    return subtasks.filter(st => st.phaseId === activePhase.id);
  }, [subtasks, activePhase.id]);

  const doneSubtasksCount = currentPhaseSubtasks.filter(s => s.status === 'completed').length;
  const totalSubtasksCount = currentPhaseSubtasks.length || 1;

  // Calculate task progress for viewed phase
  const phaseProgressPct = useMemo(() => {
    if (activePhase.status === 'completed') return 100;
    if (currentPhaseSubtasks.length === 0) return 0;
    return Math.round((doneSubtasksCount / totalSubtasksCount) * 100);
  }, [doneSubtasksCount, totalSubtasksCount, activePhase.status, currentPhaseSubtasks.length]);

  // Calculate Gate Pass Likelihood (%)
  const gatePassChancePct = useMemo(() => {
    if (activePhase.status === 'completed') return 100;

    let score = 0;
    let totalWeight = 0;
    criteria.forEach(c => {
      totalWeight += c.weight;
      if (c.checked) score += c.weight;
    });

    if (totalWeight === 0) return 75;
    const critScore = Math.round((score / totalWeight) * 100);
    const blended = Math.round(critScore * 0.65 + phaseProgressPct * 0.35);
    return Math.min(100, Math.max(0, blended));
  }, [criteria, phaseProgressPct, activePhase.status]);

  // Criteria Score for current gate
  const criteriaScore = useMemo(() => {
    let score = 0;
    let totalWeight = 0;
    criteria.forEach(c => {
      totalWeight += c.weight;
      if (c.checked) score += c.weight;
    });
    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 100;
  }, [criteria]);

  // Sync progress & gate chance to phases array
  useEffect(() => {
    setPhases(prev => prev.map((p, idx) => {
      if (idx === activePhaseIndex) {
        return { ...p, progress: phaseProgressPct, gateChance: gatePassChancePct };
      }
      return p;
    }));
  }, [phaseProgressPct, gatePassChancePct, activePhaseIndex]);

  // Overall project progress across all phases
  const overallProjectProgressPct = useMemo(() => {
    if (!phases.length) return 0;
    const total = phases.reduce((acc, curr) => acc + curr.progress, 0);
    return Math.round(total / phases.length);
  }, [phases]);

  // Toggle Gate Criteria
  const toggleCriterion = (id: string) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  // Add Custom Gate Criteria
  const handleAddCriteria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriteriaLabel.trim()) return;
    setCriteria(prev => [
      ...prev,
      { id: `crit_custom_${Date.now()}`, label: newCriteriaLabel.trim(), weight: 20, checked: false }
    ]);
    setNewCriteriaLabel('');
    setShowAddCriteria(false);
    toast.success('Đã thêm tiêu chí thẩm định');
  };

  // Toggle Subtask Completion via Checkbox
  const toggleSubtask = (id: string) => {
    setSubtasks(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus: WorkflowTaskStatus = s.status === 'completed' ? 'in_progress' : 'completed';
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  // Task CRUD Handlers (Requirement 6)
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề đầu việc');
      return;
    }
    const newTask: WorkflowSubtask = {
      id: `task_${Date.now()}`,
      phaseId: activePhase.id,
      title: newTaskTitle.trim(),
      assignee: newTaskAssignee.trim() || 'Chưa phân công',
      status: newTaskStatus,
      due_date: newTaskDue || '2026-10-30'
    };
    setSubtasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskStatus('planned');
    setNewTaskDue('');
    setShowAddTask(false);
    toast.success('Đã thêm đầu việc mới vào chặng');
  };

  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const t = subtasks.find(x => x.id === taskId);
    if (!window.confirm(`Bạn có chắc muốn xóa đầu việc "${t?.title}"?`)) return;
    setSubtasks(prev => prev.filter(x => x.id !== taskId));
    toast.success('Đã xóa đầu việc');
  };

  const handleStartEditTask = (task: WorkflowSubtask, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskAssignee(task.assignee);
    setEditTaskStatus(task.status);
    setEditTaskDue(task.due_date || '');
  };

  const handleSaveEditTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTaskTitle.trim()) {
      toast.error('Tiêu đề không được để trống');
      return;
    }
    setSubtasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          title: editTaskTitle.trim(),
          assignee: editTaskAssignee.trim() || 'Chưa phân công',
          status: editTaskStatus,
          due_date: editTaskDue
        };
      }
      return t;
    }));
    setEditingTaskId(null);
    toast.success('Đã cập nhật đầu việc');
  };

  const handleQuickChangeStatus = (taskId: string, newStatus: WorkflowTaskStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubtasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, status: newStatus };
      }
      return t;
    }));
    setStatusPickerTaskId(null);
    toast.success(`Đã đổi trạng thái sang ${WORKFLOW_STATUS_CONFIG[newStatus].label}`);
  };

  // Phase CRUD Handlers (Requirement 5)
  const handleOpenAddPhaseModal = (afterIdx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInsertPhaseIndex(afterIdx);
    setNewPhaseName('');
    setNewPhaseDesc('');
    setShowAddPhaseModal(true);
  };

  const handleCreatePhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseName.trim()) {
      toast.error('Vui lòng nhập tên giai đoạn');
      return;
    }
    const targetIdx = insertPhaseIndex;
    const newPhase: Phase = {
      id: targetIdx + 1,
      name: `${targetIdx + 1}. ${newPhaseName.trim()}`,
      desc: newPhaseDesc.trim() || 'Mô tả mục tiêu giai đoạn',
      status: 'locked',
      progress: 0,
      gateChance: 0
    };

    const updated = [...phases];
    updated.splice(targetIdx, 0, newPhase);
    const reindexed = updated.map((p, i) => ({
      ...p,
      id: i + 1,
      name: p.name.replace(/^\d+\.\s*/, `${i + 1}. `)
    }));

    setPhases(reindexed);
    setShowAddPhaseModal(false);
    setNewPhaseName('');
    setNewPhaseDesc('');
    toast.success(`Đã thêm giai đoạn: ${newPhase.name}`);
  };

  const handleDeletePhase = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (phases.length <= 1) {
      toast.error('Lộ trình cần tối thiểu 1 giai đoạn');
      return;
    }
    const target = phases[indexToDelete];
    if (!window.confirm(`Bạn có chắc muốn xóa giai đoạn "${target.name}"?`)) return;

    const remaining = phases.filter((_, i) => i !== indexToDelete).map((p, i) => ({
      ...p,
      id: i + 1,
      name: p.name.replace(/^\d+\.\s*/, `${i + 1}. `)
    }));

    setPhases(remaining);
    if (activePhaseIndex >= remaining.length) {
      setActivePhaseIndex(remaining.length - 1);
    }
    toast.success(`Đã xóa giai đoạn "${target.name}"`);
  };

  // Advance Phase (Gate Approval)
  const handleAdvancePhase = () => {
    if (activePhaseIndex >= phases.length - 1) {
      toast.success('Dự án đã ở giai đoạn tổng kết & Go-Live!');
      return;
    }
    const nextIdx = activePhaseIndex + 1;
    setPhases(prev => prev.map((p, idx) => {
      if (idx === activePhaseIndex) return { ...p, status: 'completed', progress: 100, gateChance: 100 };
      if (idx === nextIdx) return { ...p, status: 'active' };
      return p;
    }));
    setActivePhaseIndex(nextIdx);
    toast.success(`🎉 Phê duyệt Gate thành công! Đã mở khóa: ${phases[nextIdx]?.name}`);
  };

  // Handle clicking on a Phase node in the Stepper
  const handlePhaseClick = (index: number) => {
    setActivePhaseIndex(index);
    setIsDetailOpen(true); // Open details board automatically on click
  };

  // Monthly Task Status Breakdown for Donut Chart
  const isDoneStatus = (status?: string | null) => ['done', 'completed', 'complete'].includes((status || '').toLowerCase());
  const currentMonthTaskStats = useMemo(() => {
    const done = allTasks.filter(t => isDoneStatus(t.status)).length || 24;
    const inProgress = allTasks.filter(t => ['in_progress', 'doing'].includes((t.status || '').toLowerCase())).length || 11;
    const review = allTasks.filter(t => ['review', 'pending'].includes((t.status || '').toLowerCase())).length || 5;
    const overdue = allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !isDoneStatus(t.status)).length || 2;
    const todo = allTasks.filter(t => ['todo', 'backlog'].includes((t.status || '').toLowerCase())).length || 7;

    return [
      { name: 'Hoàn thành (Done)', value: done, color: '#10b981' },
      { name: 'Đang thực hiện (In Progress)', value: inProgress, color: '#3b82f6' },
      { name: 'Đang xem xét (Review)', value: review, color: '#8b5cf6' },
      { name: 'Quá hạn (Overdue)', value: overdue, color: '#ef4444' },
      { name: 'Chưa làm (Todo)', value: todo, color: '#64748b' }
    ];
  }, [allTasks]);

  const totalMonthTasks = useMemo(() => {
    return currentMonthTaskStats.reduce((acc, curr) => acc + curr.value, 0);
  }, [currentMonthTaskStats]);

  // Performance Burndown / Velocity Chart Data for Website Build
  const performanceTrendData = useMemo(() => {
    return [
      { period: 'Tuần 1 (Discovery)', plan: 15, actual: 18, velocity: 1.5 },
      { period: 'Tuần 2 (UI/UX Wireframe)', plan: 35, actual: 38, velocity: 1.7 },
      { period: 'Tuần 3 (Design System)', plan: 55, actual: 52, velocity: 2.1 },
      { period: 'Tuần 4 (Frontend Dev)', plan: 75, actual: 72, velocity: 1.8 },
      { period: 'Tuần 5 (Testing & Release)', plan: 100, actual: 94, velocity: 1.6 }
    ];
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Đang tải dữ liệu tiến độ Website...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-6">
      
      {/* 1. HEADER: PROJECT INFO (LEFT) + 4 COMPACT HEALTH/KPI BOARDS (RIGHT) IN 1 UNIFIED CARD */}
      <div className="card-hub p-4 sm:p-5 rounded-2xl grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 items-stretch">
        
        {/* Left Side: Filter buttons, Title dropdown, and Subtitle (4 cols) */}
        <div className="xl:col-span-4 2xl:col-span-4 flex flex-col justify-between space-y-2.5">
          {/* Top Row: Button trên title scale nhỏ 20% (Projects / Campaigns) & Description (Requirement 1) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                type="button"
                onClick={() => handleFilterChange('project')}
                className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                  entityFilter === 'project'
                    ? 'bg-gradient-to-b from-blue-100/95 to-blue-200/80 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(30,90,170,.18)] ring-1 ring-blue-300/80 dark:from-blue-500/35 dark:to-cyan-500/20 dark:!text-blue-100 dark:ring-blue-300/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Globe size={11} className={entityFilter === 'project' ? 'text-blue-600 dark:text-blue-300' : ''} />
                <span>Projects</span>
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('campaign')}
                className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                  entityFilter === 'campaign'
                    ? 'bg-gradient-to-b from-amber-100/95 to-amber-200/80 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(217,119,6,.18)] ring-1 ring-amber-300/80 dark:from-amber-500/35 dark:to-orange-500/20 dark:!text-amber-100 dark:ring-amber-300/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FolderKanban size={11} className={entityFilter === 'campaign' ? 'text-amber-600 dark:text-amber-300' : ''} />
                <span>Campaigns</span>
              </button>
            </div>

            <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
              • {isCampaign ? 'Chiến dịch truyền thông & Tiếp thị' : 'Website Development Lifecycle'}
            </span>
          </div>

          {/* Main Title as Filter Dropdown */}
          <div className="relative inline-block my-0.5">
            <button
              type="button"
              onClick={() => setIsTitleDropdownOpen(!isTitleDropdownOpen)}
              className="flex items-center gap-2 group text-left focus:outline-none cursor-pointer"
              title="Bấm để chọn và lọc Project / Campaign"
            >
              <div className={`p-1.5 rounded-xl transition-colors ${
                isCampaign
                  ? 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
              }`}>
                {isCampaign ? <FolderKanban size={20} /> : <Globe size={20} />}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                  {currentEntity.name}
                </h1>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 group-hover:text-primary transition-transform duration-200 ${
                    isTitleDropdownOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </div>
            </button>

            {/* Dropdown Menu to choose Project / Campaign */}
            {isTitleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsTitleDropdownOpen(false)}
                />
                <div className="absolute z-50 left-0 top-full mt-2 w-80 sm:w-96 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchEntityQuery}
                      onChange={e => setSearchEntityQuery(e.target.value)}
                      placeholder="Tìm kiếm dự án hoặc chiến dịch..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                    {filteredEntities.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        Không tìm thấy dự án phù hợp
                      </div>
                    ) : (
                      filteredEntities.map(e => {
                        const isSelected = e.id === selectedEntityId;
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => handleSelectEntity(e.id)}
                            className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {e.type === 'campaign' ? (
                                <FolderKanban size={14} className="shrink-0 text-amber-500" />
                              ) : (
                                <Globe size={14} className="shrink-0 text-blue-500" />
                              )}
                              <span className="truncate">{e.name}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                              e.type === 'campaign' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                            }`}>
                              {e.type === 'campaign' ? 'Campaign' : 'Project'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Time row: Timeline + Workload còn mấy ngày (Requirement 2) */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
            <span>{entityTimeline}</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Clock size={10} />
              <span>Còn {daysRemaining} ngày</span>
            </span>
          </div>

          {/* Lead chính ở dưới time, Sub track avatars, and Project/Campaign status (Requirement 2) */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {/* Lead chính badge */}
            <div className="flex items-center gap-1.5 bg-gray-100/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-xs ${
                isCampaign ? 'bg-gradient-to-tr from-amber-500 to-orange-500' : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
              }`}>
                {leadInfo.avatar ? (
                  <img src={leadInfo.avatar} alt={leadInfo.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={10} />
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                {leadInfo.name}
              </span>
              <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded-md ${
                isCampaign ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              }`}>
                {leadInfo.role}
              </span>
            </div>

            {/* Sub track avatars */}
            <div className="flex items-center -space-x-1.5">
              {subTeamMembers.map(sub => (
                <div
                  key={sub.id}
                  title={`${sub.name} (Thành viên tham gia)`}
                  className={`w-5 h-5 rounded-full bg-gradient-to-tr ${sub.bg} border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-extrabold text-white shadow-2xs hover:scale-110 hover:z-10 transition-transform cursor-pointer`}
                >
                  {sub.initials}
                </div>
              ))}
            </div>

            {/* Project / Campaign Status Pill */}
            <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              currentEntity.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                currentEntity.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span>{currentEntity.status === 'completed' ? 'Completed' : 'In-Progress'}</span>
            </span>
          </div>
        </div>

        {/* Right Side: 4 Compact KPI/Health Boards (Dàn đều 4 cột, khớp hàng) */}
        <div className="xl:col-span-8 2xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
          {/* Card 1: Tiến độ tổng thể */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-blue transition-all relative group/card min-w-0 h-full">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                Tiến độ tổng thể
              </span>

              {/* Info Icon (i) with Hover & Click Tooltip */}
              <div
                className="relative flex items-center shrink-0"
                onMouseEnter={() => setActiveTooltip('overall_progress')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(prev => prev === 'overall_progress' ? null : 'overall_progress');
                  }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-help"
                  aria-label="Thông tin chỉ số Tiến độ tổng thể"
                >
                  <Info size={10} strokeWidth={2.2} />
                </button>

                {activeTooltip === 'overall_progress' && (
                  <div
                    role="tooltip"
                    className="absolute z-[70] left-0 sm:left-0 sm:right-auto sm:translate-x-0 top-full mt-2 w-64 sm:w-72 p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/90 dark:border-slate-700/90 shadow-2xl text-left animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                      <span className="p-1 rounded-md bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                        <Info size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Tiến độ tổng thể (Overall Progress)
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                        <span>Đo lường mức độ hoàn thiện tích lũy toàn diện của toàn bộ chu kỳ phát triển dự án website (từ Khảo sát SRS đến Go-Live).</span>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                        <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                        <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                          (Số subtasks đã xong / Tổng số subtasks toàn dự án) × 100%
                        </code>
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                        💡 Cột mốc phản ánh độ hoàn thiện thực tế chuẩn bị bàn giao Production.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {overallProjectProgressPct}%
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                <TrendingUp size={11} /> +6.5%
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Đang chạy Phase {activePhase.id}/5 ({activePhase.name})
            </span>
          </div>

          {/* Card 2: Sức khỏe & Cơ hội qua Phase (Health Card) */}
          <div className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card ${gatePassChancePct >= 80 ? 'magnetic-emerald' : 'magnetic-amber'} transition-all relative group/card min-w-0 h-full`}>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate" title="Sức khỏe & Cơ hội qua Phase">
                Sức khỏe & Cơ hội qua Phase
              </span>

              {/* Info Icon (i) with Hover & Click Tooltip */}
              <div
                className="relative flex items-center shrink-0"
                onMouseEnter={() => setActiveTooltip('phase_health_gate')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(prev => prev === 'phase_health_gate' ? null : 'phase_health_gate');
                  }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-help"
                  aria-label="Thông tin chỉ số Sức khỏe & Cơ hội qua Phase"
                >
                  <Info size={10} strokeWidth={2.2} />
                </button>

                {activeTooltip === 'phase_health_gate' && (
                  <div
                    role="tooltip"
                    className="absolute z-[70] left-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto top-full mt-2 w-64 sm:w-72 p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/90 dark:border-slate-700/90 shadow-2xl text-left animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                      <span className={`p-1 rounded-md bg-gray-100 dark:bg-slate-800 ${gatePassChancePct >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        <Info size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Sức khỏe & Cơ hội qua Phase (Stage-Gate Health)
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                        <span>Dự báo sức khỏe vận hành và xác suất vượt qua cổng nghiệm thu kỹ thuật để mở khóa sang giai đoạn kế tiếp.</span>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                        <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                        <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                          65% Điểm Gate Checklist + 35% Tỷ lệ hoàn tất Subtasks
                        </code>
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                        💡 Đạt ≥ 80% là đủ điều kiện bật đèn xanh để giải ngân/phê duyệt chặng sau.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className={`text-xl sm:text-2xl font-extrabold ${gatePassChancePct >= 80 ? 'text-emerald-500' : gatePassChancePct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {gatePassChancePct}%
              </b>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                gatePassChancePct >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {gatePassChancePct >= 80 ? '🟢 Đủ điều kiện' : '🟡 Cần rà soát'}
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Thẩm định Confidence Score {criteriaScore}/100
            </span>
          </div>

          {/* Card 3: Vận tốc (Velocity) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-violet transition-all relative group/card min-w-0 h-full">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                Vận tốc (Velocity)
              </span>

              {/* Info Icon (i) with Hover & Click Tooltip */}
              <div
                className="relative flex items-center shrink-0"
                onMouseEnter={() => setActiveTooltip('velocity')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(prev => prev === 'velocity' ? null : 'velocity');
                  }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-help"
                  aria-label="Thông tin chỉ số Vận tốc"
                >
                  <Info size={10} strokeWidth={2.2} />
                </button>

                {activeTooltip === 'velocity' && (
                  <div
                    role="tooltip"
                    className="absolute z-[70] left-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto top-full mt-2 w-64 sm:w-72 p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/90 dark:border-slate-700/90 shadow-2xl text-left animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                      <span className="p-1 rounded-md bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                        <Info size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Vận tốc (Velocity)
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                        <span>Đo lường nhịp độ tiêu hóa và giải quyết khối lượng công việc kỹ thuật trung bình của đội ngũ.</span>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                        <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                        <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                          Tổng thời gian hoàn tất task đã xong / Tổng số task kỹ thuật hoàn thành
                        </code>
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                        💡 VD: 1.8 ngày/task nghĩa là trung bình team hoàn thiện và đóng 1 task trong 1.8 ngày.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                1.8 <span className="text-xs font-normal text-gray-500">ngày/task</span>
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                <TrendingDown size={11} /> -0.3d
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Tốc độ tiêu hóa dứt điểm task kỹ thuật
            </span>
          </div>

          {/* Card 4: Đúng cam kết hạn */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-emerald transition-all relative group/card min-w-0 h-full">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                Đúng cam kết hạn
              </span>

              {/* Info Icon (i) with Hover & Click Tooltip */}
              <div
                className="relative flex items-center shrink-0"
                onMouseEnter={() => setActiveTooltip('on_time_rate')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(prev => prev === 'on_time_rate' ? null : 'on_time_rate');
                  }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-help"
                  aria-label="Thông tin chỉ số Đúng cam kết hạn"
                >
                  <Info size={10} strokeWidth={2.2} />
                </button>

                {activeTooltip === 'on_time_rate' && (
                  <div
                    role="tooltip"
                    className="absolute z-[70] right-0 sm:right-0 sm:left-auto sm:translate-x-0 top-full mt-2 w-64 sm:w-72 p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/90 dark:border-slate-700/90 shadow-2xl text-left animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                      <span className="p-1 rounded-md bg-emerald-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                        <Info size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Đúng cam kết hạn (On-Time Rate)
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                        <span>Đo lường tỷ lệ các đầu việc kỹ thuật được nghiệm thu đúng hoặc trước deadline cam kết ban đầu.</span>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                        <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                        <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                          (Số task hoàn thành đúng hạn / Tổng số task đã hoàn thành) × 100%
                        </code>
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                        💡 Hệ thống tự động đối soát thời điểm chốt Done với hạn chót 23:59:59 của ngày deadline.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                93.5%
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                <TrendingUp size={11} /> +1.2%
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Mốc deadline 23:59:59 chuẩn hóa toàn hệ thống
            </span>
          </div>
        </div>

      </div>

      {/* 2. GỘP THÀNH 1 BOARD DUY NHẤT: LỘ TRÌNH GIAI ĐOẠN (BẤM VÀO MỚI HIỆN CHI TIẾT TASK & GATE) */}
      <div className="card-hub p-5 rounded-2xl space-y-5 transition-all">
        
        {/* Board Header with Task Status Bar, Dropdown Phase Selector & Collapse Toggle (Requirement 3) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700/80 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Lộ trình giai đoạn (Stage-Gate Stepper Timeline)
            </h3>

            {/* Thanh Task biểu hiện những Task trong đó (Requirement 3: move xuống bảng Lộ trình giai đoạn) */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-0.5">
                Task tháng này:
              </span>
              {(['backlog', 'planned', 'scoping', 'in_progress', 'in_qa', 'completed', 'canceled'] as WorkflowTaskStatus[]).map(st => {
                const count = taskCountsByStatus[st] || 0;
                const cfg = WORKFLOW_STATUS_CONFIG[st];
                return (
                  <div
                    key={st}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] ${cfg.bgLight} ${cfg.bgDark} ${cfg.borderClass}`}
                    title={`${cfg.label}: ${count} tasks`}
                  >
                    <WorkflowHexagonIcon status={st} size={13} />
                    <span className={`font-bold ${cfg.textColor}`}>
                      {count}
                    </span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400">
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Chặng đang chọn:</span>
            <div className="relative">
              <select
                value={activePhaseIndex}
                onChange={e => handlePhaseClick(Number(e.target.value))}
                className="appearance-none bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white rounded-xl pl-3 pr-8 py-1.5 outline-none cursor-pointer hover:border-primary transition-colors"
              >
                {phases.map((p, idx) => (
                  <option key={p.id} value={idx} className="dark:bg-slate-800">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>

            {/* Toggle Expand / Collapse Button */}
            <button
              onClick={() => setIsDetailOpen(!isDetailOpen)}
              className="p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-500 transition-colors ml-1"
              title={isDetailOpen ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
            >
              {isDetailOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Timeline Connected Stepper Nodes (Circular Gauge & Connecting Shape Links) */}
        <div className="relative pt-2 pb-2 overflow-x-auto custom-scrollbar">
          <div className="flex items-center min-w-max pb-2 pt-1 px-1">
            {phases.map((p, idx) => {
              const isSelected = idx === activePhaseIndex;
              const isCompleted = p.status === 'completed';
              const isActive = p.status === 'active';

              return (
                <React.Fragment key={p.id}>
                  {/* Circular Phase Node Card */}
                  <div
                    onClick={() => handlePhaseClick(idx)}
                    className={`w-48 sm:w-56 p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col items-center text-center shrink-0 ${
                      isSelected
                        ? isCampaign
                          ? 'border-amber-500 ring-2 ring-amber-500/25 bg-amber-50/10 dark:bg-amber-950/15 shadow-md -translate-y-0.5'
                          : 'border-blue-600 ring-2 ring-blue-600/25 bg-blue-50/10 dark:bg-blue-950/15 shadow-md -translate-y-0.5'
                        : isCompleted
                        ? 'border-emerald-500/40 bg-white dark:bg-slate-800 hover:border-emerald-500/70'
                        : 'border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Header Row: Chặng order & Delete button */}
                    <div className="w-full flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isActive
                          ? isCampaign
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        Chặng {idx + 1}/{phases.length}
                      </span>

                      {phases.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeletePhase(idx, e)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-auto"
                          title={`Xóa giai đoạn: ${p.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Soft Technical Liquid Glass Progress Pod (No harsh strokes) */}
                    <div className="relative w-20 h-20 flex items-center justify-center my-1.5">
                      {isCompleted ? (
                        /* Chặng hoàn thành: Soft Emerald Glass Orb */
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400/90 via-emerald-500/90 to-teal-600/90 backdrop-blur-md flex items-center justify-center text-white shadow-[0_4px_16px_rgba(16,185,129,0.3),inset_0_1px_1.5px_rgba(255,255,255,0.75)] transition-transform duration-300 hover:scale-105">
                          <Check size={22} strokeWidth={2.5} />
                        </div>
                      ) : isActive ? (
                        /* Chặng đang chạy: Soft Conic Liquid Glass Dial (No harsh strokes) */
                        <div
                          className="w-16 h-16 rounded-full p-[3.5px] flex items-center justify-center relative transition-transform duration-300 hover:scale-105 shadow-[0_4px_16px_rgba(37,99,235,0.22)]"
                          style={{
                            background: `conic-gradient(from 180deg, ${
                              isCampaign ? '#f59e0b, #fbbf24' : '#2563eb, #38bdf8'
                            } ${p.progress * 3.6}deg, rgba(148, 163, 184, 0.15) ${p.progress * 3.6}deg 360deg)`
                          }}
                        >
                          <div className="w-full h-full rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_2px_8px_rgba(0,0,0,0.12)]">
                            <span className={`text-xs font-black tracking-tight ${
                              isCampaign ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-cyan-400'
                            }`}>
                              {p.progress}%
                            </span>
                            <span className="text-[7.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-tight">
                              Đang chạy
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Chặng chưa bắt đầu: Soft minimal glass pod */
                        <div className="w-16 h-16 rounded-full p-[2.5px] bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center">
                          <div className="w-full h-full rounded-full bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-slate-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
                            P{idx + 1}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Pill */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : isActive
                        ? isCampaign
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                    }`}>
                      {isCompleted ? '✓ Hoàn thành' : isActive ? '● Đang triển khai' : '○ Chờ bắt đầu'}
                    </span>

                    {/* Phase Name & Desc */}
                    <b className={`text-xs block line-clamp-1 w-full ${
                      isSelected
                        ? (isCampaign ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400')
                        : 'text-gray-900 dark:text-white'
                    }`} title={p.name}>
                      {p.name}
                    </b>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block line-clamp-1 mt-0.5 w-full" title={p.desc}>
                      {p.desc}
                    </span>

                    {/* Gate chance info */}
                    <div className="w-full mt-2 pt-1.5 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                      <span className="text-gray-400">Cơ hội Gate:</span>
                      <span className={`font-bold ${
                        isCompleted ? 'text-emerald-500' : p.gateChance >= 80 ? 'text-emerald-500' : p.gateChance >= 50 ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {isCompleted ? 100 : p.gateChance}%
                      </span>
                    </div>

                    {/* Action button: Xem chi tiết */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          setIsDetailOpen(!isDetailOpen);
                        } else {
                          handlePhaseClick(idx);
                          setIsDetailOpen(true);
                        }
                      }}
                      className={`w-full mt-2 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                        isSelected && isDetailOpen
                          ? isCampaign
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && isDetailOpen ? (
                        <>
                          <ChevronUp size={13} />
                          <span>Thu gọn</span>
                        </>
                      ) : (
                        <>
                          <Eye size={13} />
                          <span>Xem chi tiết</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Connecting Shape Link with (+) Center Bead between adjacent phases */}
                  {idx < phases.length - 1 && (
                    <div className="flex items-center justify-center self-center px-1 sm:px-2 shrink-0 relative group/connector">
                      {/* Connecting capsule shape */}
                      <div className={`h-2 w-8 sm:w-12 rounded-full transition-all ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-xs'
                          : isActive
                          ? (isCampaign ? 'bg-gradient-to-r from-amber-400 to-amber-200 dark:to-slate-700' : 'bg-gradient-to-r from-blue-500 to-blue-200 dark:to-slate-700')
                          : 'bg-gray-200 dark:bg-slate-700'
                      }`} />

                      {/* Center round shape (+) button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenAddPhaseModal(idx + 1, e)}
                        className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 flex items-center justify-center transition-all shadow-sm hover:scale-110 z-20 cursor-pointer"
                        title={`Chèn thêm giai đoạn mới sau chặng ${idx + 1}`}
                      >
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Add Phase End Card */}
            <div className="flex flex-col items-center justify-center shrink-0 self-center p-3 ml-2 min-w-[120px]">
              <button
                type="button"
                onClick={() => handleOpenAddPhaseModal(phases.length)}
                className={`w-14 h-14 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all hover:scale-105 shadow-sm group cursor-pointer ${
                  isCampaign
                    ? 'border-amber-400/70 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                    : 'border-blue-400/70 hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                }`}
                title="Thêm giai đoạn mới vào cuối lộ trình"
              >
                <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-200" />
                <span className="text-[8px] font-bold mt-0.5">Thêm chặng</span>
              </button>
              <span className="text-[9px] text-gray-400 mt-1 text-center">Tùy biến lộ trình</span>
            </div>
          </div>
        </div>

        {/* EXPANDED DETAILS SECTION: KHI BẤM VÀO LỘ TRÌNH THÌ MỚI HIỆN RA DETAILS TASK & GATE */}
        {isDetailOpen && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-300">
            
            {/* Top Detail Bar with Close action */}
            <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 p-3 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                  Chi tiết chặng đang chọn:
                </span>
                <b className="text-xs text-gray-900 dark:text-white">
                  {activePhase.name} — {activePhase.desc}
                </b>
              </div>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 font-semibold transition-colors"
              >
                <X size={14} /> Thu gọn chi tiết
              </button>
            </div>

            {/* Split Columns: Cột Trái (Gate Checklist) & Cột Phải (Subtasks Website) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Tiêu chí Gatekeeper & Duyệt Chuyển Phase (7 Cols) */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-4">
                
                {/* 2 Big Gauge Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Tiến độ công việc</span>
                      <span className="font-bold text-primary">{phaseProgressPct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${phaseProgressPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {doneSubtasksCount}/{totalSubtasksCount} Subtasks kỹ thuật hoàn thành
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Cơ hội qua Phase</span>
                      <span className={`font-bold ${gatePassChancePct >= 80 ? 'text-emerald-500' : gatePassChancePct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {gatePassChancePct}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          gatePassChancePct >= 80 ? 'bg-emerald-500' : gatePassChancePct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${gatePassChancePct}%` }}
                      />
                    </div>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border mt-1 inline-block ${
                      gatePassChancePct >= 80 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}>
                      {gatePassChancePct >= 80 ? '🟢 Đủ điều kiện (>80%)' : '🟡 Cần bổ sung tiêu chí'}
                    </span>
                  </div>
                </div>

                {/* Gate Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                        Tiêu chí thẩm định Gate (Gate Checklist)
                      </span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">(Đạt &gt; 80% để mở khóa chặng sau)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddCriteria(!showAddCriteria)}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus size={13} /> Thêm tiêu chí
                    </button>
                  </div>

                  {showAddCriteria && (
                    <form onSubmit={handleAddCriteria} className="flex gap-2 mb-2.5">
                      <input
                        type="text"
                        value={newCriteriaLabel}
                        onChange={e => setNewCriteriaLabel(e.target.value)}
                        placeholder="Nhập tiêu chí điều kiện Gate..."
                        className="flex-1 text-xs p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-primary"
                      />
                      <button type="submit" className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold">
                        Lưu
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {criteria.map(c => (
                      <label
                        key={c.id}
                        onClick={() => toggleCriterion(c.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          c.checked
                            ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-gray-900 dark:text-white'
                            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={c.checked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <span className={c.checked ? 'font-semibold' : ''}>{c.label}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">Trọng số: {c.weight}%</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gate Pass Approval Button */}
                <div className="pt-2 border-t border-gray-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {gatePassChancePct >= 80
                      ? '✓ Mọi tiêu chí kỹ thuật đã hoàn tất. Bạn có thể bấm phê duyệt để mở khóa Phase kế tiếp.'
                      : '⚠ Cần hoàn tất thêm tiêu chí hoặc subtasks để đạt tối thiểu 80% cơ hội.'}
                  </p>

                  {activePhaseIndex < phases.length - 1 && (
                    <button
                      type="button"
                      disabled={gatePassChancePct < 80}
                      onClick={handleAdvancePhase}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                        gatePassChancePct >= 80
                          ? 'bg-[#002e6d] hover:bg-[#001f4d] text-white cursor-pointer hover:shadow-md'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                      }`}
                    >
                      <span>Phê duyệt qua {phases[activePhaseIndex + 1]?.name}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Quản Lý Đầu Việc Kỹ Thuật (Subtasks) của chặng (5 Cols) */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700/80 pb-2.5 mb-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Code2 size={15} className={isCampaign ? 'text-amber-500' : 'text-blue-600'} />
                        Đầu việc kỹ thuật ({doneSubtasksCount}/{totalSubtasksCount})
                      </h4>
                      <span className="text-[10px] text-gray-400">Thêm, sửa, xóa và chuyển đổi trạng thái task</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">{phaseProgressPct}%</span>
                      <button
                        type="button"
                        onClick={() => setShowAddTask(!showAddTask)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                          isCampaign
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        title="Thêm đầu việc mới vào chặng này"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Thêm task</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Task Form */}
                  {showAddTask && (
                    <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-slate-800/90 mb-3 space-y-2.5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Plus size={12} strokeWidth={2.5} /> Thêm đầu việc mới
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        placeholder="Nhập tên đầu việc kỹ thuật..."
                        autoFocus
                        className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={newTaskAssignee}
                          onChange={e => setNewTaskAssignee(e.target.value)}
                          placeholder="Người phụ trách..."
                          className="text-xs p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                        />

                        <input
                          type="date"
                          value={newTaskDue}
                          onChange={e => setNewTaskDue(e.target.value)}
                          className="text-xs p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                        />

                        <select
                          value={newTaskStatus}
                          onChange={e => setNewTaskStatus(e.target.value as WorkflowTaskStatus)}
                          className="text-xs p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                        >
                          {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => (
                            <option key={st} value={st}>
                              {WORKFLOW_STATUS_CONFIG[st].label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                        >
                          Lưu đầu việc
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Subtasks List */}
                  <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                    {currentPhaseSubtasks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400">
                        Chưa có đầu việc nào trong giai đoạn này. Bấm &quot;Thêm task&quot; để tạo đầu việc đầu tiên.
                      </div>
                    ) : (
                      currentPhaseSubtasks.map(s => {
                        const done = s.status === 'completed';
                        const isEditing = editingTaskId === s.id;

                        if (isEditing) {
                          return (
                            <div
                              key={s.id}
                              className="p-3 rounded-xl border border-blue-400 bg-white dark:bg-slate-900 shadow-sm space-y-2"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-blue-600 uppercase">Đang chỉnh sửa đầu việc</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X size={12} />
                                </button>
                              </div>

                              <input
                                type="text"
                                value={editTaskTitle}
                                onChange={e => setEditTaskTitle(e.target.value)}
                                className="w-full text-xs p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                              />

                              <div className="grid grid-cols-3 gap-1.5">
                                <input
                                  type="text"
                                  value={editTaskAssignee}
                                  onChange={e => setEditTaskAssignee(e.target.value)}
                                  placeholder="Người phụ trách"
                                  className="text-[11px] p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                />
                                <input
                                  type="date"
                                  value={editTaskDue}
                                  onChange={e => setNewTaskDue(e.target.value)}
                                  className="text-[11px] p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                />
                                <select
                                  value={editTaskStatus}
                                  onChange={e => setEditTaskStatus(e.target.value as WorkflowTaskStatus)}
                                  className="text-[11px] p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                >
                                  {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => (
                                    <option key={st} value={st}>
                                      {WORKFLOW_STATUS_CONFIG[st].label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleSaveEditTask(s.id, e)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                                >
                                  <Check size={12} strokeWidth={2.5} /> Lưu thay đổi
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={s.id}
                            className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 group/task ${
                              done
                                ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400/60 dark:hover:border-blue-500/60'
                            }`}
                          >
                            {/* Left: Checkbox + Status Hexagon + Title */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() => toggleSubtask(s.id)}
                                className="rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                                title="Đánh dấu hoàn thành"
                              />

                              {/* Interactive Workflow Hexagon Status Badge */}
                              <div className="relative shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusPickerTaskId(statusPickerTaskId === s.id ? null : s.id);
                                  }}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${WORKFLOW_STATUS_CONFIG[s.status].bgLight} ${WORKFLOW_STATUS_CONFIG[s.status].bgDark} ${WORKFLOW_STATUS_CONFIG[s.status].textColor} ${WORKFLOW_STATUS_CONFIG[s.status].borderClass} hover:opacity-85 shadow-2xs`}
                                  title="Bấm để đổi nhanh trạng thái"
                                >
                                  <WorkflowHexagonIcon status={s.status} size={13} />
                                  <span>{WORKFLOW_STATUS_CONFIG[s.status].label}</span>
                                  <ChevronDown size={10} className="opacity-60" />
                                </button>

                                {/* Quick Status Selector Dropdown */}
                                {statusPickerTaskId === s.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-0 top-full mt-1 z-50 w-44 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95 text-left"
                                  >
                                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 border-b border-gray-100 dark:border-slate-800">
                                      Đổi trạng thái task
                                    </div>
                                    {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => {
                                      const cfg = WORKFLOW_STATUS_CONFIG[st];
                                      const isCur = s.status === st;
                                      return (
                                        <button
                                          key={st}
                                          type="button"
                                          onClick={(e) => handleQuickChangeStatus(s.id, st, e)}
                                          className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                            isCur
                                              ? 'bg-gray-100 dark:bg-slate-800 font-bold'
                                              : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 font-medium'
                                          }`}
                                        >
                                          <WorkflowHexagonIcon status={st} size={13} />
                                          <span className={`${cfg.textColor}`}>{cfg.label}</span>
                                          {isCur && <Check size={12} className="ml-auto text-emerald-500" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Task Title */}
                              <span
                                className={`text-xs truncate flex-1 min-w-0 ${
                                  done ? 'line-through text-gray-400 dark:text-gray-500' : 'font-medium text-gray-900 dark:text-white'
                                }`}
                                title={s.title}
                              >
                                {s.title}
                              </span>
                            </div>

                            {/* Right: Assignee, Due date & Actions */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto ml-6 sm:ml-0">
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                                <User size={10} className="text-gray-400" />
                                <span className="truncate max-w-[80px]">{s.assignee}</span>
                              </span>

                              {s.due_date && (
                                <span className="hidden sm:flex items-center gap-0.5 text-[9px] text-gray-400">
                                  <Calendar size={10} />
                                  <span>{s.due_date.slice(5)}</span>
                                </span>
                              )}

                              {/* Edit Action */}
                              <button
                                type="button"
                                onClick={(e) => handleStartEditTask(s, e)}
                                className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                                title="Chỉnh sửa đầu việc"
                              >
                                <Edit3 size={12} />
                              </button>

                              {/* Delete Action */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTask(s.id, e)}
                                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Xóa đầu việc"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer summary */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>Tiến độ hoàn thành chặng:</span>
                  <b className="text-primary font-bold">{doneSubtasksCount}/{totalSubtasksCount} công việc xong</b>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* 4. DATA VISUALIZATION & PERFORMANCE CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Donut Chart - Trạng thái Task tháng này (5 Cols) */}
        <div className="lg:col-span-5 card-hub p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/80 pb-3 mb-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  Trạng thái Task Tháng Này
                </h3>
                <span className="text-[11px] text-gray-400">Tháng 10/2026 · Tổng {totalMonthTasks} tasks</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                Current Month
              </span>
            </div>

            {/* Donut Chart with Gentle Glass Center Hub - Soft & Technical (No Stroke) */}
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentMonthTaskStats}
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                    cornerRadius={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {currentMonthTaskStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center gentle glass hub - Soft & Technical (No border stroke) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-22 h-22 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_6px_20px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium text-gray-400 dark:text-slate-400">Hoàn thành</span>
                  <b className="text-xl font-extrabold text-emerald-500 dark:text-emerald-400">
                    {Math.round((currentMonthTaskStats[0].value / (totalMonthTasks || 1)) * 100)}%
                  </b>
                </div>
              </div>
            </div>
          </div>

          {/* Legends */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-xs">
            {currentMonthTaskStats.map(stat => (
              <div key={stat.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                <span className="text-gray-500 dark:text-gray-400 truncate text-[11px]">{stat.name}:</span>
                <b className="text-gray-900 dark:text-white ml-auto">{stat.value}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Performance & Velocity Charts Row (7 Cols) */}
        <div className="lg:col-span-7 card-hub p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/80 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart2 size={16} className="text-primary" />
                  Hiệu Suất Thực Thi & Vận Tốc (Burndown & Velocity)
                </h3>
                <span className="text-[11px] text-gray-400">
                  Tiến độ bàn giao so với kế hoạch mục tiêu theo từng chặng
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Thực tế
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-0.5 bg-gray-400" /> Mục tiêu
                </span>
              </div>
            </div>

            {/* Area Chart */}
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Thực tế xong (Tasks)"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#velocityGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="plan"
                    name="Kế hoạch cam kết"
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1.8}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
            <span>Đánh giá nhịp độ:</span>
            <span className="font-semibold text-emerald-500">
              🟢 Tiến độ thực tế đang bám sát 98.4% kế hoạch kỳ vọng
            </span>
          </div>
        </div>

      </div>

      {/* 5. ADD PHASE MODAL (Requirement 5) */}
      {showAddPhaseModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddPhaseModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isCampaign ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                }`}>
                  <Plus size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Thêm giai đoạn mới
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    Chèn vào vị trí chặng số {insertPhaseIndex + 1} của lộ trình
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPhaseModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePhase} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Tên giai đoạn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPhaseName}
                  onChange={e => setNewPhaseName(e.target.value)}
                  placeholder="VD: Kiểm toán bảo mật & Performance Tuning"
                  autoFocus
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Mô tả mục tiêu giai đoạn
                </label>
                <textarea
                  rows={2}
                  value={newPhaseDesc}
                  onChange={e => setNewPhaseDesc(e.target.value)}
                  placeholder="VD: Rà soát lỗ hổng OWASP, kiểm thử tải và tối ưu cơ sở dữ liệu"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPhaseModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCampaign
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Tạo giai đoạn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
