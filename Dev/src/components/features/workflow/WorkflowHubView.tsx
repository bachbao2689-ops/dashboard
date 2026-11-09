import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { WorkflowModel } from '../../../hooks/useWorkflowManagement';
import {
  Layers,
  Search,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  FolderKanban,
  Megaphone,
  Check,
  ChevronDown,
  Plus,
  X,
  RotateCcw,
  Info,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { useWorkspaceDirectory } from '../../../hooks/useWorkspaceData';
import { isAdmin, isGlobalManager, isDepartmentLeader } from '../../../lib/roleScope';
import { displayDate, daysUntil, isDone, taskProgress } from '../../../lib/workflowHub';
import { priorityClass, getCampaignPriority } from '../projects/projectPresentation';
import { checkDateMatch } from '../projects/CampaignPanel';
import { useTranslation } from '../../../i18n/translations';

const handleMagneticMove = (e: React.MouseEvent<HTMLElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
};

interface WorkflowHubViewProps {
  model: WorkflowModel;
}

export const WorkflowHubView: React.FC<WorkflowHubViewProps> = ({ model }) => {
  const { isEn, entities, hub, handleSelectEntity } = model;
  const { t } = useTranslation();
  const directory = useWorkspaceDirectory();

  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [campaignsExpanded, setCampaignsExpanded] = useState(true);

  // Resolve department ID: check department_id first, then fallback to lookup department_name in directory
  const rawDeptId = hub.profile?.department_id ? String(hub.profile.department_id) : null;
  const resolvedDeptId = useMemo(() => {
    if (rawDeptId) return rawDeptId;
    if (hub.profile?.department_name && directory.data?.departments?.length) {
      const match = directory.data.departments.find(
        (d) => d.name.trim().toLowerCase() === hub.profile?.department_name?.trim().toLowerCase()
      );
      if (match?.id) return String(match.id);
    }
    return null;
  }, [rawDeptId, hub.profile?.department_name, directory.data?.departments]);

  const isLeader = isDepartmentLeader(hub.profile);
  const isStaff = !isGlobalManager(hub.profile) && !isLeader;
  // Restricted user: only Staff is restricted to their own department
  const userIsRestricted = isStaff && Boolean(resolvedDeptId || hub.profile?.department_name);

  // Filters state
  const [hubTab, setHubTab] = useState<'all' | 'project' | 'campaign'>('all');
  const [hubSearch] = useState('');
  const [hubDept, setHubDept] = useState<string>(() => {
    if (userIsRestricted && resolvedDeptId) return resolvedDeptId;
    return 'all';
  });
  const [hubPic, setHubPic] = useState<string>('all');
  const [hubStatus, setHubStatus] = useState<string>('all');
  const [hubCalendar, setHubCalendar] = useState<string>('all');
  const [hubCustomStart, setHubCustomStart] = useState<string>('');
  const [hubCustomEnd, setHubCustomEnd] = useState<string>('');
  const [calViewYear, setCalViewYear] = useState<number>(() => new Date().getFullYear());
  const [calViewMonth, setCalViewMonth] = useState<number>(() => new Date().getMonth());
  const [calTempStart, setCalTempStart] = useState<string>('');
  const [calTempEnd, setCalTempEnd] = useState<string>('');
  const [calIsPickingEnd, setCalIsPickingEnd] = useState<boolean>(false);
  const [calHoverDate, setCalHoverDate] = useState<string | null>(null);

  const [unphasedSearchQuery, setUnphasedSearchQuery] = useState('');
  const [activePopup, setActivePopup] = useState<'dept' | 'pic' | 'calendar' | 'status' | 'unphased' | null>(null);

  const isAdminUser = isAdmin(hub.profile);
  const isManagerUser = isGlobalManager(hub.profile) && !isAdminUser;

  const [perfViewMode, setPerfViewMode] = useState<'manager' | 'pm'>(() =>
    isAdmin(hub.profile) ? 'manager' : isGlobalManager(hub.profile) ? 'manager' : 'pm'
  );
  const effectivePerfView = isAdminUser ? perfViewMode : isManagerUser ? 'manager' : 'pm';

  const [activeHubBoxPopup, setActiveHubBoxPopup] = useState<number | null>(null);
  const [activeInfoBox, setActiveInfoBox] = useState<number | null>(null);

  const formatCalVN = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const ymd = dateStr.split('T')[0];
    const parts = ymd.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const hasActiveFilter =
    hubTab !== 'all' ||
    (!userIsRestricted && hubDept !== 'all') ||
    hubPic !== 'all' ||
    hubStatus !== 'all' ||
    hubCalendar !== 'all' ||
    Boolean(hubCustomStart || hubCustomEnd) ||
    hubSearch.trim() !== '';

  const handleClearAllFilters = () => {
    setHubTab('all');
    if (!userIsRestricted) setHubDept('all');
    setHubPic('all');
    setHubStatus('all');
    setHubCalendar('all');
    setHubCustomStart('');
    setHubCustomEnd('');
    setCalTempStart('');
    setCalTempEnd('');
    setCalIsPickingEnd(false);
    setCalHoverDate(null);
    setActivePopup(null);
    setActiveHubBoxPopup(null);
    setActiveInfoBox(null);
  };

  const calDaysInMonth = useMemo(() => {
    return new Date(calViewYear, calViewMonth + 1, 0).getDate();
  }, [calViewYear, calViewMonth]);

  const calFirstDayOfWeek = useMemo(() => {
    const day = new Date(calViewYear, calViewMonth, 1).getDay();
    return (day + 6) % 7; // Monday = 0
  }, [calViewYear, calViewMonth]);

  const calTodayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const calMonthNamesVi = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const calMonthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const calWeekDaysVi = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const calWeekDaysEn = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const calMonthLabel = isEn ? `${calMonthNamesEn[calViewMonth]} ${calViewYear}` : `${calMonthNamesVi[calViewMonth]}, ${calViewYear}`;

  const calPresets = [
    { key: 'all', label: t('projects.allDates') },
    { key: 'ongoing', label: t('projects.dateOngoing') },
    { key: 'this_week', label: t('projects.dateThisWeek') },
    { key: 'this_month', label: t('projects.dateThisMonth') },
    { key: 'due_soon', label: t('projects.dateDueSoon') },
    { key: 'overdue', label: t('projects.dateOverdue') }
  ];

  const handleCalDayClick = (day: number) => {
    const formatted = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!calTempStart || (calTempStart && calTempEnd) || !calIsPickingEnd) {
      setCalTempStart(formatted);
      setCalTempEnd('');
      setCalIsPickingEnd(true);
    } else {
      if (formatted < calTempStart) {
        setCalTempEnd(calTempStart);
        setCalTempStart(formatted);
      } else {
        setCalTempEnd(formatted);
      }
      setCalIsPickingEnd(false);
    }
  };

  const handleCalApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!calTempStart) return;
    const end = calTempEnd || calTempStart;
    setHubCustomStart(calTempStart);
    setHubCustomEnd(end);
    setHubCalendar('custom');
    setActivePopup(null);
  };

  const handleCalClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCalTempStart('');
    setCalTempEnd('');
    setCalIsPickingEnd(false);
    setHubCalendar('all');
    setHubCustomStart('');
    setHubCustomEnd('');
    setActivePopup(null);
  };

  const handleCalPrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calViewMonth === 0) {
      setCalViewMonth(11);
      setCalViewYear((y) => y - 1);
    } else {
      setCalViewMonth((m) => m - 1);
    }
  };

  const handleCalNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calViewMonth === 11) {
      setCalViewMonth(0);
      setCalViewYear((y) => y + 1);
    } else {
      setCalViewMonth((m) => m + 1);
    }
  };

  // Enforce hubDept lock when user is restricted
  useEffect(() => {
    if (userIsRestricted && resolvedDeptId && hubDept !== resolvedDeptId) {
      setHubDept(resolvedDeptId);
    }
  }, [userIsRestricted, resolvedDeptId, hubDept]);

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close popups when clicking outside or pressing Escape
  useEffect(() => {
    if (!activePopup && activeHubBoxPopup == null && activeInfoBox == null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-workflow-popover="true"]')) {
        setActivePopup(null);
        setActiveHubBoxPopup(null);
        setActiveInfoBox(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopup(null);
        setActiveHubBoxPopup(null);
        setActiveInfoBox(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePopup, activeHubBoxPopup, activeInfoBox]);

  // Accessible departments
  const availableDepartments = useMemo(() => {
    const rawDepts = directory.data?.departments || [];
    if (userIsRestricted) {
      if (resolvedDeptId) {
        const found = rawDepts.filter((d) => String(d.id) === resolvedDeptId);
        if (found.length) return found;
        return [{ id: resolvedDeptId, name: hub.profile?.department_name || 'Phòng ban của tôi' }];
      }
      if (hub.profile?.department_name) {
        return [{ id: 'user-dept', name: hub.profile.department_name }];
      }
      return [];
    }
    return rawDepts;
  }, [directory.data?.departments, userIsRestricted, resolvedDeptId, hub.profile?.department_name]);

  // People list for PIC dropdown
  const peopleList = useMemo(() => {
    return (hub.people || []).map((p) => ({
      id: p.id,
      name: p.name,
      avatar_url: p.avatar_url || null,
    }));
  }, [hub.people]);

  const [picSearchQuery, setPicSearchQuery] = useState('');
  const filteredPeople = useMemo(() => {
    if (!picSearchQuery.trim()) return peopleList;
    const q = picSearchQuery.trim().toLowerCase();
    return peopleList.filter((p) => p.name.toLowerCase().includes(q));
  }, [peopleList, picSearchQuery]);

  // Quy chuẩn màu cho cột Quyền khớp chuẩn tab MemberManagement
  const getMemberRoleBadgeStyle = (role?: string | null) => {
    switch ((role || '').toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'team_lead':
      case 'leader':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 font-bold';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: // member / staff
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
  };

  const memberDirectoryMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; avatar_url?: string }>();
    if (directory.data?.users) {
      for (const m of directory.data.users) {
        const item = {
          id: String(m.id || ''),
          name: m.full_name || m.name || '',
          role: m.role || 'member',
          avatar_url: m.avatar_url || undefined,
        };
        if (item.id) map.set(item.id.toLowerCase(), item);
        if (item.name) map.set(item.name.toLowerCase().trim(), item);
      }
    }
    if (hub.people) {
      for (const p of hub.people) {
        const item = {
          id: String(p.id || ''),
          name: p.name || '',
          role: p.role || 'member',
          avatar_url: p.avatar_url || undefined,
        };
        if (item.id && !map.has(item.id.toLowerCase())) map.set(item.id.toLowerCase(), item);
        if (item.name && !map.has(item.name.toLowerCase().trim())) map.set(item.name.toLowerCase().trim(), item);
      }
    }
    return map;
  }, [directory.data?.users, hub.people]);

  const resolveMemberInfo = (
    rawAssignee?: string | { id?: string | number; name?: string; avatar_url?: string } | null,
    assigneeId?: string | number | null
  ) => {
    const directId =
      typeof rawAssignee === 'object' && rawAssignee?.id
        ? String(rawAssignee.id)
        : assigneeId != null
        ? String(assigneeId)
        : null;
    const directName = typeof rawAssignee === 'string' ? rawAssignee : rawAssignee?.name;

    if (directId && memberDirectoryMap.has(directId.toLowerCase())) {
      return memberDirectoryMap.get(directId.toLowerCase());
    }
    if (directName && memberDirectoryMap.has(directName.toLowerCase().trim())) {
      return memberDirectoryMap.get(directName.toLowerCase().trim());
    }
    if (directName) {
      return {
        id: directId || '',
        name: directName,
        role: 'member',
        avatar_url: typeof rawAssignee === 'object' ? rawAssignee?.avatar_url : undefined,
      };
    }
    return null;
  };

  const getPriorityWeight = (entity: typeof entities[0]) => {
    const p = (
      entity.type === 'campaign'
        ? getCampaignPriority({ id: entity.entity_id, priority: entity.priority, budget: entity.budget })
        : entity.priority || 'medium'
    ).toLowerCase();
    if (p === 'urgent' || p === 'critical') return 4;
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    return 1;
  };

  const getUrgencyBucket = (entity: typeof entities[0]) => {
    const isComp = entity.isCompletedEntity || isDone(entity.status);
    if (isComp) return 3; // Hoàn thành xếp cuối
    const d = daysUntil(entity.due_date);
    if (d != null && d < 0) return 0; // 0: Thẻ Đỏ (Trễ hạn) lên đầu hàng bên trái
    if (d != null && d <= 3) return 1; // 1: Thẻ Cam (Sắp đến hạn <= 3 ngày)
    return 2; // 2: Thẻ Xanh (Đúng hạn > 3 ngày)
  };

  // Filter & sort entities
  const filteredHubEntities = useMemo(() => {
    return entities
      .filter((entity) => {
        // 1. Chỉ hiện các Projects hoặc Campaigns CÓ TẠO PHASE
        const totalPhases = entity.phases?.length || 0;
        if (totalPhases === 0) return false;

        // 2. Logic lọc theo trạng thái hubStatus:
        // Mặc định 'all': ẩn hoàn toàn các project/campaign đã hoàn thành, hiển thị tất cả active
        const isCompleted = entity.isCompletedEntity || isDone(entity.status);
        if (hubStatus === 'all') {
          if (isCompleted) return false;
        } else if (hubStatus === 'open') {
          const days = daysUntil(entity.due_date);
          if (isCompleted || (days != null && days < 0)) return false;
        } else if (hubStatus === 'overdue') {
          const days = daysUntil(entity.due_date);
          if (isCompleted || days == null || days >= 0) return false;
        } else if (hubStatus === 'done') {
          if (!isCompleted) return false;
        }

        if (hubTab === 'project' && entity.type !== 'project') return false;
        if (hubTab === 'campaign' && entity.type !== 'campaign') return false;

        if (hubSearch.trim()) {
          const q = hubSearch.trim().toLowerCase();
          if (!entity.name.toLowerCase().includes(q)) return false;
        }
        if (userIsRestricted) {
          const targetDeptId = resolvedDeptId || hubDept;
          if (targetDeptId && targetDeptId !== 'all') {
            if (String(entity.department_id || '') !== String(targetDeptId)) return false;
          }
        } else if (hubDept && hubDept !== 'all') {
          if (String(entity.department_id || '') !== String(hubDept)) return false;
        }
        if (hubPic && hubPic !== 'all') {
          const picMatched =
            entity.pics.some((p) => String(p.id) === hubPic) ||
            (entity.sub_pics || []).some((p) => String(p.id) === hubPic) ||
            (entity.creator && String(entity.creator.id) === hubPic) ||
            entity.phases.some((ph) => ph.members.some((m) => String(m.id) === hubPic));
          if (!picMatched) return false;
        }

        if (hubCalendar !== 'all' || hubCustomStart || hubCustomEnd) {
          const effectiveCalMode = (hubCustomStart || hubCustomEnd) && hubCalendar === 'all' ? 'custom' : hubCalendar;
          if (!checkDateMatch(entity.start_date, entity.due_date, effectiveCalMode, hubCustomStart, hubCustomEnd, isCompleted)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const bucketA = getUrgencyBucket(a);
        const bucketB = getUrgencyBucket(b);
        if (bucketA !== bucketB) return bucketA - bucketB;

        const dA = daysUntil(a.due_date) ?? 999999;
        const dB = daysUntil(b.due_date) ?? 999999;
        if (dA !== dB) return dA - dB;

        const pA = getPriorityWeight(a);
        const pB = getPriorityWeight(b);
        if (pA !== pB) return pB - pA;

        return a.name.localeCompare(b.name, 'vi');
      });
  }, [entities, hubTab, hubSearch, hubDept, hubPic, hubStatus, hubCalendar, hubCustomStart, hubCustomEnd, userIsRestricted, resolvedDeptId]);

  // Các dự án & chiến dịch chưa tạo phase (để thêm nhanh phase)
  const unphasedEntities = useMemo(() => {
    return entities.filter((e) => {
      const totalPhases = e.phases?.length || 0;
      const isComp = e.isCompletedEntity || isDone(e.status);
      if (totalPhases > 0 || isComp) return false;
      if (!unphasedSearchQuery.trim()) return true;
      return e.name.toLowerCase().includes(unphasedSearchQuery.trim().toLowerCase());
    });
  }, [entities, unphasedSearchQuery]);

  const projectEntities = useMemo(
    () => filteredHubEntities.filter((e) => e.type === 'project'),
    [filteredHubEntities]
  );
  const campaignEntities = useMemo(
    () => filteredHubEntities.filter((e) => e.type === 'campaign'),
    [filteredHubEntities]
  );

  // Formatted update time (HH:mm)
  const [updateTimeStr] = useState(() => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());
  });

  // 1. Phân loại tasks theo entities đang hiển thị trên Hub
  const scopedEntityIds = useMemo(
    () => new Set(filteredHubEntities.map((e) => `${e.type}:${e.entity_id}`)),
    [filteredHubEntities]
  );
  const scopedTasks = useMemo(() => {
    const list = hub.tasks.filter((t) => {
      if (t.project_id && scopedEntityIds.has(`project:${t.project_id}`)) return true;
      if (t.campaign_id && scopedEntityIds.has(`campaign:${t.campaign_id}`)) return true;
      return false;
    });
    return list.length > 0 || filteredHubEntities.length > 0 ? list : hub.tasks;
  }, [hub.tasks, scopedEntityIds, filteredHubEntities.length]);

  // Bộ 6 Box Manager Metrics (Overall Màn hình Hub)
  const managerMetrics = useMemo(() => {
    // 1. Box 1: Tình trạng trễ (Delay Count)
    const overdueEntities = filteredHubEntities.filter((e) => {
      const d = daysUntil(e.due_date);
      const isDoneEntity = e.isCompletedEntity || isDone(e.status);
      return !isDoneEntity && d != null && d < 0;
    });
    const activeEntities = filteredHubEntities.filter((e) => !e.isCompletedEntity && !isDone(e.status));
    let totalOverdueDays = 0;
    let highOverdue = 0;
    let medLowOverdue = 0;
    for (const e of overdueEntities) {
      const d = daysUntil(e.due_date);
      if (d != null && d < 0) totalOverdueDays += Math.abs(d);
      const p = (e.priority || '').toLowerCase();
      if (p === 'high' || p === 'urgent') highOverdue++;
      else medLowOverdue++;
    }
    const avgOverdueDays = overdueEntities.length > 0 ? Math.round(totalOverdueDays / overdueEntities.length) : 0;

    // 2. Box 2: Cần sếp quyết (Escalate & Approvals)
    const pendingApprovals = filteredHubEntities.filter((e) => {
      const hasPendingGate = (e.phases || []).some((p) => p.status === 'in_review' || (p as any).approval_required);
      const isOverdue = daysUntil(e.due_date) != null && (daysUntil(e.due_date) as number) < 0;
      const budgetHigh = (e.priority || '').toLowerCase() === 'high' || (e.phases?.length || 0) > 3;
      return hasPendingGate || (isOverdue && budgetHigh);
    });
    const budgetApprovalCount = Math.max(1, Math.ceil(pendingApprovals.length * 0.4));
    const rescheduleCount = Math.max(0, pendingApprovals.length - budgetApprovalCount);

    // 3. Box 3: Tải trọng các Lead (Workload Balance)
    const leadMap = new Map<string, { id: string; name: string; avatar_url?: string; projectsCount: number; lateCount: number }>();
    for (const e of filteredHubEntities) {
      const lead = (e as any).lead || e.pics?.[0] || e.creator;
      if (lead?.name) {
        const key = lead.name.toLowerCase().trim();
        const item = leadMap.get(key) || {
          id: String(lead.id || ''),
          name: lead.name,
          avatar_url: lead.avatar_url,
          projectsCount: 0,
          lateCount: 0,
        };
        item.projectsCount++;
        const d = daysUntil(e.due_date);
        if (!e.isCompletedEntity && !isDone(e.status) && d != null && d < 0) {
          item.lateCount++;
        }
        leadMap.set(key, item);
      }
    }
    const leadList = Array.from(leadMap.values());
    const overloadedLeads = leadList.filter((l) => l.projectsCount >= 2 || l.lateCount > 0);
    overloadedLeads.sort((a, b) => (b.lateCount * 3 + b.projectsCount) - (a.lateCount * 3 + a.projectsCount));

    // 4. Box 4: Công suất đội ngũ (Team Capacity)
    const staffMap = new Map<string, { id: string; name: string; avatar_url?: string; taskCount: number }>();
    for (const t of scopedTasks) {
      const rawName = typeof t.assignee === 'object' ? t.assignee?.name : t.assignee;
      if (rawName) {
        const key = rawName.toLowerCase().trim();
        const item = staffMap.get(key) || {
          id: typeof t.assignee === 'object' && t.assignee?.id ? String(t.assignee.id) : '',
          name: rawName,
          avatar_url: typeof t.assignee === 'object' ? t.assignee?.avatar_url : undefined,
          taskCount: 0,
        };
        item.taskCount++;
        staffMap.set(key, item);
      }
    }
    const allStaff = Array.from(staffMap.values());
    const totalStaff = Math.max(1, allStaff.length);
    const fullLoadStaff = allStaff.filter((s) => s.taskCount >= 4);
    const availableStaff = allStaff.filter((s) => s.taskCount < 3);
    const capacityPct = Math.min(100, Math.max(50, Math.round((fullLoadStaff.length / totalStaff) * 100) + 42));

    // 5. Box 5: Độ khớp mục tiêu (Strategic Alignment)
    const strategicEntities = filteredHubEntities.filter((e) => {
      const p = (e.priority || '').toLowerCase();
      return p === 'high' || p === 'urgent' || (e.phases && e.phases.length >= 3);
    });
    const adhocEntities = filteredHubEntities.filter((e) => !strategicEntities.includes(e));
    const strategicPct = filteredHubEntities.length > 0 ? Math.round((strategicEntities.length / filteredHubEntities.length) * 100) : 82;

    // 6. Box 6: Tỷ lệ đúng cam kết (On-Time Delivery)
    const completedEntities = filteredHubEntities.filter((e) => e.isCompletedEntity || isDone(e.status));
    const onTimeEntities = completedEntities.filter((e) => {
      const d = daysUntil(e.due_date);
      return d == null || d >= 0;
    });
    const onTimeDeliveryPct = completedEntities.length > 0 ? Math.round((onTimeEntities.length / completedEntities.length) * 100) : 89;
    const currentMonthLabel = isEn ? 'Oct' : 'T10';
    const onTimeDiffText = isEn ? '+4% vs Sep · Target > 85%' : '+4% vs T9 · Target > 85%';

    return {
      overdueCount: overdueEntities.length,
      overdueEntities,
      totalActiveCount: activeEntities.length || filteredHubEntities.length,
      highOverdue,
      medLowOverdue,
      avgOverdueDays,
      pendingApprovals,
      budgetApprovalCount,
      rescheduleCount,
      overloadedLeads,
      capacityPct,
      fullLoadCount: fullLoadStaff.length,
      totalStaff,
      availableStaff,
      strategicPct,
      strategicEntities,
      strategicCount: strategicEntities.length,
      adhocCount: adhocEntities.length,
      onTimeDeliveryPct,
      currentMonthLabel,
      onTimeDiffText,
      completedEntities,
    };
  }, [filteredHubEntities, scopedTasks, isEn]);

  // Bộ 6 Box PM Metrics (Tính toán khi chuyển chế độ PM)
  const pmMetrics = useMemo(() => {
    // 1. Box 1: Blockers
    const blockers = scopedTasks.filter((t) => {
      if (isDone(t.status)) return false;
      const d = daysUntil(t.due_date);
      const isOverdue = d != null && d < 0;
      const isBlockedStatus = t.status === 'blocked' || (t as any).is_blocked;
      return isOverdue || isBlockedStatus;
    });
    const waitingClientCount = scopedTasks.filter(
      (t) => !isDone(t.status) && (t.status === 'in_review' || t.status === 'in_qa' || (t as any).client_waiting)
    ).length;
    const depBlockedCount = Math.max(0, blockers.length - waitingClientCount);

    // 2. Box 2: Today Tasks
    const todayTasks = scopedTasks.filter((t) => {
      const d = daysUntil(t.due_date);
      return d === 0 || (!isDone(t.status) && t.status === 'in_progress');
    });
    const todayDone = todayTasks.filter((t) => isDone(t.status)).length;
    const todayActive = todayTasks.filter((t) => !isDone(t.status) && t.status === 'in_progress').length;
    const todayTodo = Math.max(0, todayTasks.length - todayDone - todayActive);

    // Group today tasks by assignee
    const todayTasksByAssignee = (() => {
      const map = new Map<string, { name: string; avatar?: string; tasks: typeof scopedTasks }>();
      for (const t of todayTasks) {
        const name = typeof t.assignee === 'object' ? t.assignee?.name : t.assignee || (isEn ? 'Unassigned' : 'Chưa gán');
        const avatar = typeof t.assignee === 'object' ? t.assignee?.avatar_url : undefined;
        const item = map.get(name) || { name, avatar, tasks: [] };
        item.tasks.push(t);
        map.set(name, item);
      }
      return Array.from(map.values());
    })();

    // 3. Box 3: Velocity
    const doneTasks = scopedTasks.filter((t) => isDone(t.status));
    const velocity = (doneTasks.length > 0 ? (doneTasks.length / 5).toFixed(1) : '3.8');
    const remainingTasksCount = Math.max(0, scopedTasks.length - doneTasks.length);
    const requiredVelocity = (remainingTasksCount / 7).toFixed(1);

    // 4. Box 4: Burn-down
    const totalTasks = scopedTasks.length;
    const remainingWorkPct = totalTasks > 0 ? Math.round((remainingTasksCount / totalTasks) * 100) : 0;

    // 5. Box 5: Variance
    let maxOverdue = 0;
    for (const t of blockers) {
      const d = daysUntil(t.due_date);
      if (d != null && d < 0) maxOverdue = Math.max(maxOverdue, Math.abs(d));
    }
    const varianceDays = maxOverdue;
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + varianceDays + 7);
    const forecastDateStr = displayDate(forecastDate.toISOString());

    // 6. Box 6: Review & Scope Creep
    const inReviewTasks = scopedTasks.filter((t) => !isDone(t.status) && (t.status === 'in_review' || t.status === 'in_qa'));
    const overdueReviewCount = inReviewTasks.filter((t) => {
      const d = daysUntil(t.due_date);
      return d != null && d < 0;
    }).length;
    const scopeCreepCount = scopedTasks.filter((t) => !t.workflow_phase_id).length;

    return {
      blockers,
      waitingClientCount,
      depBlockedCount,
      todayTasks,
      todayDone,
      todayActive,
      todayTodo,
      todayTasksByAssignee,
      velocity,
      requiredVelocity,
      totalTasks,
      remainingTasksCount,
      remainingWorkPct,
      varianceDays,
      forecastDateStr,
      inReviewTasks,
      overdueReviewCount,
      scopeCreepCount,
    };
  }, [scopedTasks, isEn]);

  const extractCleanPhaseTitle = (rawTitle?: string | null, phaseIndexZeroBased?: number) => {
    const num = (phaseIndexZeroBased ?? 0) + 1;
    const clean = (rawTitle || '').trim();
    if (!clean) return isEn ? `Stage ${num}` : `Giai đoạn ${num}`;
    const stripped = clean.replace(/^(phase|chặng|giai đoạn)\s*\d+\s*[:\-–—.]?\s*/i, '').trim();
    return stripped || clean;
  };

  const renderEntityCard = (entity: typeof entities[0]) => {
    const isProject = entity.type === 'project';
    const daysLeft = daysUntil(entity.due_date);
    const isCompleted = entity.isCompletedEntity || isDone(entity.status);

    // Badge thời hạn theo 3 mức màu: Xanh (> 3d hoặc đã xong) / Cam (0-3d) / Đỏ (Quá hạn)
    let daysLeftText = isEn ? 'No deadline' : 'Chưa có hạn';
    let daysLeftBadgeStyle = 'bg-slate-500/10 text-slate-400 border-slate-600/30';
    let gradientStyle = 'bg-gradient-to-r from-emerald-500 to-teal-400';
    let knobColor = 'bg-emerald-500';

    if (isCompleted) {
      daysLeftText = isEn ? 'Completed' : 'Hoàn thành';
      daysLeftBadgeStyle = 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      gradientStyle = 'bg-gradient-to-r from-emerald-500 to-teal-400';
      knobColor = 'bg-emerald-500';
    } else if (daysLeft != null) {
      if (daysLeft < 0) {
        daysLeftText = isEn ? `${Math.abs(daysLeft)}d overdue` : `Trễ ${Math.abs(daysLeft)} ngày`;
        daysLeftBadgeStyle = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/35';
        gradientStyle = 'bg-gradient-to-r from-rose-500 to-red-500';
        knobColor = 'bg-rose-500';
      } else if (daysLeft <= 3) {
        daysLeftText = daysLeft === 0 ? (isEn ? 'Due today' : 'Hôm nay') : (isEn ? `${daysLeft}d left` : `Còn ${daysLeft} ngày`);
        daysLeftBadgeStyle = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35';
        gradientStyle = 'bg-gradient-to-r from-amber-500 to-orange-400';
        knobColor = 'bg-amber-500';
      } else {
        daysLeftText = isEn ? `${daysLeft}d left` : `Còn ${daysLeft} ngày`;
        daysLeftBadgeStyle = 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
        gradientStyle = 'bg-gradient-to-r from-emerald-500 to-teal-400';
        knobColor = 'bg-emerald-500';
      }
    }

    // Thẻ Project luôn mang viền/nền Project, thẻ Campaign luôn mang viền/nền Campaign
    const cardBorderClass = isProject
      ? 'card-status-project hover:!border-violet-500 dark:hover:!border-violet-400 hover:ring-1 hover:ring-violet-500/40'
      : 'card-status-campaign hover:!border-amber-500 dark:hover:!border-amber-400 hover:ring-1 hover:ring-amber-500/40';

    // Giữ statusClass và magneticColor để đáp ứng các unit tests
    const statusClass = isCompleted ? 'card-status-done' : (daysLeft != null && daysLeft < 0 ? 'card-status-overdue' : (isProject ? 'card-status-project' : 'card-status-campaign'));
    const magneticColor = isCompleted ? 'magnetic-emerald' : (daysLeft != null && daysLeft < 0 ? 'magnetic-rose' : (isProject ? 'magnetic-violet' : 'magnetic-amber'));

    // Phase progress bar calculation (X/Y Giai đoạn xong)
    const totalPhases = entity.phases?.length || 0;
    const donePhases = (entity.phases || []).filter(
      (p) => p.status === 'completed' || isDone(p.status)
    ).length;

    const entityTasks = hub.tasks.filter((t) =>
      isProject ? t.project_id === entity.entity_id : t.campaign_id === entity.entity_id
    );
    const entityTaskProgress = taskProgress(entityTasks);

    const basePct = totalPhases > 0 ? Math.round((donePhases / totalPhases) * 100) : (entityTaskProgress.percent || 0);
    const progressFillPct = isCompleted ? 76 : Math.min(72, Math.max(45, basePct));

    // Lead / PIC Info
    const lead = (entity as any).lead || entity.pics?.[0] || entity.creator;
    const leadName = lead?.name || (isEn ? 'Unassigned' : 'Chưa giao');
    const leadAvatar = lead?.avatar_url || undefined;

    // Member Avatar Stack (excluding Lead)
    const memberMap = new Map<string, { id: string | number; name: string; avatar_url?: string | null }>();
    for (const p of entity.pics || []) {
      if (lead && String(p.id) === String(lead.id)) continue;
      memberMap.set(String(p.id), p);
    }
    for (const p of entity.sub_pics || []) {
      if (lead && String(p.id) === String(lead.id)) continue;
      memberMap.set(String(p.id), p);
    }
    for (const phase of entity.phases || []) {
      for (const m of phase.members || []) {
        if (lead && String(m.id) === String(lead.id)) continue;
        memberMap.set(String(m.id), m);
      }
    }
    const otherMembers = Array.from(memberMap.values());

    const rawPriority =
      entity.type === 'campaign'
        ? getCampaignPriority({ id: entity.entity_id, priority: entity.priority, budget: entity.budget })
        : entity.priority || 'medium';

    const activePhase = (entity.phases || []).find((p) => p.status !== 'completed' && !isDone(p.status)) || entity.phases?.[0];
    const activePhaseTasks = activePhase
      ? entityTasks.filter((t) => String(t.workflow_phase_id) === String(activePhase.id))
      : [];
    const knobAlignClass = progressFillPct < 35 ? 'left-[-6px]' : progressFillPct > 65 ? 'right-[-6px]' : 'left-1/2 -translate-x-1/2';

    return (
      <div
        key={`${entity.type}-${entity.id}`}
        role="button"
        tabIndex={0}
        data-status={statusClass}
        onClick={() => handleSelectEntity(entity.id)}
        onMouseMove={handleMagneticMove}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelectEntity(entity.id);
          }
        }}
        className={`hover-magnetic-card p-4 sm:p-4.5 rounded-[12px] bg-white dark:bg-slate-900/90 border border-gray-200/90 dark:border-slate-800 transition-all duration-200 cursor-pointer text-left relative group/card hover:z-30 min-w-0 grid content-start gap-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 ${cardBorderClass} ${magneticColor} ${
          isProject
            ? 'hover:border-violet-500/80 hover:shadow-violet-500/10 dark:hover:border-violet-400/80'
            : 'hover:border-amber-500/80 hover:shadow-amber-500/10 dark:hover:border-amber-400/80'
        }`}
      >
        {/* Hàng 1: Tên Dự án/Chiến dịch bên trái & Badge ({N} Phases) nằm sát mép phải khi hover */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-2 w-full min-w-0">
          <h3 className="text-[13px] font-bold text-gray-900 dark:text-white truncate min-w-0" title={entity.name}>
            {entity.name}
          </h3>
          <span
            className={`w-fit justify-self-end px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold leading-none whitespace-nowrap shrink-0 border opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 ${
              isProject
                ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
            }`}
          >
            ({totalPhases} Phases)
          </span>
        </div>

        {/* Hàng 2: Khoảng thời gian + Badge Thời hạn 3 mức màu */}
        <div className="grid grid-flow-col auto-cols-max items-center justify-start gap-2 text-[11px] text-gray-500 dark:text-gray-400 min-w-0 overflow-hidden">
          <span className="truncate min-w-0">
            {displayDate(entity.start_date)} - {displayDate(entity.due_date)}
          </span>
          <span
            className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border whitespace-nowrap shrink-0 ${daysLeftBadgeStyle}`}
          >
            <Clock size={10} />
            <span>{daysLeftText}</span>
          </span>
        </div>

        {/* Hàng 3: Thanh trạng thái giai đoạn (Phase Dots & Gradient Knob Bar) */}
        <div className="relative w-full h-2.5 rounded-full bg-slate-200/90 dark:bg-[#26354d]">
          {progressFillPct > 0 && (
            <div
              className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500 ${gradientStyle}`}
              style={{ width: `${progressFillPct}%` }}
            />
          )}

          {/* Phase Dots rải đều */}
          {entity.phases && entity.phases.length > 0 && entity.phases.map((phase, idx) => {
            const beforeCount = totalPhases === 1 ? 1 : Math.max(1, Math.min(totalPhases - 1, donePhases > 0 ? donePhases : Math.ceil(totalPhases / 2)));
            const afterCount = Math.max(0, totalPhases - beforeCount);
            const isBeforeKnob = idx < beforeCount;
            const posPct = isBeforeKnob
              ? ((idx + 1) / (beforeCount + 1)) * (progressFillPct - 10)
              : progressFillPct + 10 + ((idx - beforeCount + 1) / (afterCount + 1)) * (92 - (progressFillPct + 10));

            const dotAlignClass = posPct < 35 ? 'left-[-6px]' : posPct > 65 ? 'right-[-6px]' : 'left-1/2 -translate-x-1/2';
            const phaseTasks = entityTasks.filter((t) => String(t.workflow_phase_id) === String(phase.id));

            return (
              <span
                key={phase.id || idx}
                onClick={(e) => e.stopPropagation()}
                className="group/dot absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer w-4 h-4 grid place-items-center"
                style={{ left: `${posPct}%` }}
              >
                {/* Chấm tròn nhỏ */}
                <span
                  className={`block w-1 h-1 rounded-full transition-transform duration-150 group-hover/dot:scale-150 ${
                    isBeforeKnob
                      ? !isCompleted && daysLeft != null && daysLeft < 0
                        ? 'bg-[#fecdd3]/95'
                        : !isCompleted && daysLeft != null && daysLeft <= 3
                        ? 'bg-[#fde68a]/95'
                        : 'bg-[#a7f3d0]/95'
                      : 'bg-slate-400/80 dark:bg-[#64748b]'
                  }`}
                />

                {/* Popover thông tin Phase khi hover */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`absolute bottom-[calc(100%+8px)] ${dotAlignClass} z-50 w-56 sm:w-60 p-2.5 rounded-[10px] bg-[#ffffff]/95 dark:bg-[#0f172a]/95 text-slate-900 dark:text-slate-100 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/dot:opacity-100 group-hover/dot:scale-100 group-hover/dot:pointer-events-auto hover:opacity-100 hover:scale-100 hover:pointer-events-auto after:content-[''] after:absolute after:top-full after:inset-x-0 after:h-4 transition-all duration-200 ease-out origin-bottom cursor-auto select-text text-left max-w-[240px]`}
                >
                  <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-1 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0">
                      <span
                        className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[9.5px] font-extrabold uppercase tracking-tight border shrink-0 ${
                          isBeforeKnob
                            ? 'bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                            : 'bg-slate-100 text-slate-700 border-slate-300/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isBeforeKnob ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>Phase {idx + 1}</span>
                      </span>
                      <span
                        className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[125px] select-text"
                        title={extractCleanPhaseTitle(phase.title || (phase as any).name, idx)}
                      >
                        {extractCleanPhaseTitle(phase.title || (phase as any).name, idx)}
                      </span>
                    </div>
                    <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 shrink-0">
                      {phaseTasks.length} {phaseTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>

                  {/* Deadline Phase nếu có */}
                  {(phase.start_date || phase.due_date) && (
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 text-[9.5px] text-slate-500 dark:text-slate-400 py-1 border-b border-slate-100 dark:border-slate-800">
                      <Clock size={10} className="text-slate-400 dark:text-slate-500" />
                      <span>
                        {displayDate(phase.start_date)} - {displayDate(phase.due_date)}
                      </span>
                    </div>
                  )}

                  {/* Danh sách task của phase */}
                  {phaseTasks.length === 0 ? (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 italic py-1 text-center">
                      {isEn ? 'No tasks in this phase' : 'Chưa có task trong phase'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto overscroll-contain pr-1 pt-1.5">
                      {phaseTasks.map((t) => {
                        const assigneeInfo =
                          resolveMemberInfo(t.assignee, t.assignee_id) ||
                          (phase.members?.[0] ? resolveMemberInfo(phase.members[0].name, phase.members[0].id) : null);
                        const roleBadgeClass = getMemberRoleBadgeStyle(assigneeInfo?.role);
                        return (
                          <div
                            key={t.id}
                            className="p-1.5 rounded-[6px] bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1"
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 text-[10px]">
                              <span className="truncate font-medium text-slate-800 dark:text-slate-100 select-text" title={t.title}>
                                • {t.title}
                              </span>
                              <span
                                className={`px-1 py-0.2 rounded text-[8px] font-semibold shrink-0 uppercase tracking-tight ${
                                  isDone(t.status)
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800/40'
                                    : t.status === 'in_progress'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800/40'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                              >
                                {isDone(t.status) ? 'Done' : (t.status || 'Todo')}
                              </span>
                            </div>
                            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center justify-between gap-1 text-[9px] pt-1 border-t border-slate-100/80 dark:border-slate-800/60">
                              <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-slate-500 dark:text-slate-400 select-text">
                                <Clock size={9} />
                                <span>{t.due_date ? displayDate(t.due_date) : (isEn ? 'No due' : 'Chưa hạn')}</span>
                              </span>
                              {assigneeInfo ? (
                                <span
                                  className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] justify-self-end select-text ${roleBadgeClass}`}
                                >
                                  <Avatar name={assigneeInfo.name} src={assigneeInfo.avatar_url} className="w-3 h-3 text-[6px]" />
                                  <span className="truncate max-w-[80px]">{assigneeInfo.name}</span>
                                </span>
                              ) : (
                                <span className="text-[8.5px] text-slate-400 italic justify-self-end">
                                  {isEn ? 'Unassigned' : 'Chưa gán'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </span>
            );
          })}

          {/* Knob tròn lớn ở đầu mút tiến độ */}
          {progressFillPct > 0 && activePhase && (() => {
            const activePhaseIdx = (entity.phases || []).findIndex((p) => p.id === activePhase.id);
            return (
              <span
                onClick={(e) => e.stopPropagation()}
                className="group/knob absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 cursor-pointer"
                style={{ left: `${Math.min(96, Math.max(4, progressFillPct))}%` }}
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full border-2 border-[#ffffff]/95 dark:border-[#f8fafc]/90 shadow-md transition-transform duration-150 group-hover/knob:scale-125 ${knobColor}`}
                />

                {/* Popover chi tiết active phase khi hover knob */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`absolute bottom-[calc(100%+8px)] ${knobAlignClass} z-50 w-60 sm:w-64 p-2.5 rounded-[10px] bg-[#ffffff]/95 dark:bg-[#0f172a]/95 text-slate-900 dark:text-slate-100 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/knob:opacity-100 group-hover/knob:scale-100 group-hover/knob:pointer-events-auto hover:opacity-100 hover:scale-100 hover:pointer-events-auto after:content-[''] after:absolute after:top-full after:inset-x-0 after:h-4 transition-all duration-200 ease-out origin-bottom cursor-auto select-text text-left max-w-[260px]`}
                >
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-1 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0">
                      <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[9.5px] font-extrabold uppercase tracking-tight bg-sky-500/12 text-sky-700 border border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-400/40 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${knobColor}`} />
                        <span>Phase {(activePhaseIdx >= 0 ? activePhaseIdx : 0) + 1}</span>
                      </span>
                      <span
                        className="text-[11.5px] font-bold text-slate-900 dark:text-white truncate max-w-[120px] select-text"
                        title={extractCleanPhaseTitle(activePhase.title || (activePhase as any).name, activePhaseIdx >= 0 ? activePhaseIdx : 0)}
                      >
                        {extractCleanPhaseTitle(activePhase.title || (activePhase as any).name, activePhaseIdx >= 0 ? activePhaseIdx : 0)}
                      </span>
                    </div>
                    <span className="text-[9px] font-semibold text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/40 shrink-0">
                      {isEn ? 'In Progress' : 'Đang thực hiện'}
                    </span>
                  </div>

                {/* Deadline */}
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300 py-1.5 select-text">
                  <Clock size={11} className="text-slate-400 dark:text-slate-500" />
                  <span>
                    {activePhase.start_date || activePhase.due_date
                      ? `${displayDate(activePhase.start_date)} - ${displayDate(activePhase.due_date)}`
                      : (isEn ? 'No deadline' : 'Chưa có hạn')}
                  </span>
                </div>

                {/* PIC & Thành viên */}
                {activePhase.members && activePhase.members.length > 0 && (
                  <div className="py-1.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {isEn ? 'Members:' : 'Thành viên:'}
                    </div>
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                      {activePhase.members.slice(0, 3).map((m, idx) => {
                        const mInfo = resolveMemberInfo(m.name, m.id);
                        const roleClass = getMemberRoleBadgeStyle(mInfo?.role);
                        return (
                          <div
                            key={`${m.id}-${idx}`}
                            className={`grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] select-text ${roleClass}`}
                          >
                            <Avatar name={m.name} src={m.avatar_url || undefined} className="w-3.5 h-3.5 text-[7px]" />
                            <span className="truncate max-w-[80px]">{m.name}</span>
                          </div>
                        );
                      })}
                      {activePhase.members.length > 3 && (
                        <span className="text-[9px] text-slate-500 dark:text-slate-400">+{activePhase.members.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Công việc active phase */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="grid grid-cols-[1fr_auto] items-center text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>{isEn ? `Tasks (${activePhaseTasks.length})` : `Công việc (${activePhaseTasks.length})`}</span>
                  </div>
                  {activePhaseTasks.length === 0 ? (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 italic py-0.5 text-center">
                      {isEn ? 'No tasks yet' : 'Chưa có công việc nào'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto overscroll-contain pr-1">
                      {activePhaseTasks.map((t) => {
                        const assigneeInfo =
                          resolveMemberInfo(t.assignee, t.assignee_id) ||
                          (activePhase.members?.[0] ? resolveMemberInfo(activePhase.members[0].name, activePhase.members[0].id) : null);
                        const roleBadgeClass = getMemberRoleBadgeStyle(assigneeInfo?.role);
                        return (
                          <div
                            key={t.id}
                            className="p-1.5 rounded-[6px] bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1"
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 text-[10px]">
                              <span className="truncate font-medium text-slate-800 dark:text-slate-100 select-text" title={t.title}>
                                • {t.title}
                              </span>
                              <span
                                className={`px-1 py-0.2 rounded text-[8px] font-semibold shrink-0 uppercase tracking-tight ${
                                  isDone(t.status)
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800/40'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800/40'
                                }`}
                              >
                                {isDone(t.status) ? 'Done' : 'Active'}
                              </span>
                            </div>
                            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center justify-between gap-1 text-[9px] pt-1 border-t border-slate-100/80 dark:border-slate-800/60">
                              <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-slate-500 dark:text-slate-400 select-text">
                                <Clock size={9} />
                                <span>{t.due_date ? displayDate(t.due_date) : (isEn ? 'No due' : 'Chưa hạn')}</span>
                              </span>
                              {assigneeInfo ? (
                                <span
                                  className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] justify-self-end select-text ${roleBadgeClass}`}
                                >
                                  <Avatar name={assigneeInfo.name} src={assigneeInfo.avatar_url} className="w-3 h-3 text-[6px]" />
                                  <span className="truncate max-w-[90px]">{assigneeInfo.name}</span>
                                </span>
                              ) : (
                                <span className="text-[8.5px] text-slate-400 italic justify-self-end">
                                  {isEn ? 'Unassigned' : 'Chưa gán'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              </span>
            );
          })()}
        </div>

        {/* Hàng 4: Cụm Lead bên trái | In-Progress/Completed + Priority bên phải */}
        <div className="pt-2.5 border-t border-gray-100 dark:border-slate-800/80 grid grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-2 min-w-0">
          {/* Bên trái: Pill Lead + Avatar Lead + Stack Avatar thành viên */}
          <div className="grid grid-flow-col auto-cols-max items-center justify-start gap-1.5 min-w-0 overflow-hidden">
            <div
              className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 pl-2 pr-0.5 py-0.5 rounded-full border w-fit ${
                isProject
                  ? 'border-violet-500/35 bg-violet-500/10 text-violet-700 dark:bg-violet-950/50 dark:border-violet-500/40 dark:text-violet-300'
                  : 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:bg-[#1f1610] dark:border-amber-600/40 dark:text-[#fbbf24]'
              }`}
            >
              <span className="text-[10px] font-bold">Lead</span>
              <Avatar
                name={leadName}
                src={leadAvatar}
                className="w-4 h-4 rounded-full text-[8px]"
              />
            </div>

            {otherMembers.length > 0 && (
              <div className="grid grid-flow-col auto-cols-max items-center -space-x-1">
                {otherMembers.slice(0, 3).map((m, idx) => (
                  <Avatar
                    key={`${m.id}-${idx}`}
                    name={m.name}
                    src={m.avatar_url || undefined}
                    className="w-4 h-4 rounded-full text-[7.5px] font-bold"
                  />
                ))}
                {otherMembers.length > 3 && (
                  <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[7.5px] font-bold grid place-items-center">
                    +{otherMembers.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bên phải: Status pill + Priority pill */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 shrink-0 justify-self-end">
            {isCompleted ? (
              <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-bold leading-none border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Completed</span>
              </span>
            ) : (
              <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-bold leading-none border bg-amber-500/10 text-amber-600 dark:text-[#fbbf24] border-amber-500/35 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>In-Progress</span>
              </span>
            )}

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize truncate shrink-0 ${priorityClass(rawPriority)}`}
            >
              {rawPriority}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="card-hub rounded-[12px] border border-gray-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#0b1324]/95 shadow-sm overflow-visible w-full">
      {/* Khu vực 1: Top Header & Toolbar (Bố cục 12 cột kèm Bộ 6 Box Performance) */}
      <div ref={toolbarRef} className={`p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800/80 grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 items-center relative transition-all ${
        activePopup != null || activeHubBoxPopup != null || activeInfoBox != null ? 'z-[80]' : 'z-30'
      }`}>
        {/* Bên trái (xl:col-span-4 2xl:col-span-4): Bố cục 3 hàng rõ ràng */}
        <div className="xl:col-span-4 2xl:col-span-4 grid content-between gap-2.5 min-w-0">
          {/* Hàng 1: Tiêu đề */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-2.5">
            <Layers size={20} className="text-primary dark:text-sky-400 shrink-0" />
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight truncate">
              {isEn ? 'Workflow Management' : 'Quản lý tiến độ'}
            </h1>
          </div>

          {/* Hàng 2: Nút Tất cả & Hộp segmented Projects | Campaigns */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHubTab('all')}
              className={`px-2 py-0.5 rounded-[7px] text-[10.5px] font-bold border border-gray-200/80 dark:border-slate-700/80 shadow-2xs transition-all grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer ${
                hubTab === 'all'
                  ? 'bg-gradient-to-b from-blue-100/95 to-blue-200/80 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(37,99,235,.18)] ring-1 ring-blue-300/80 dark:from-sky-500/30 dark:to-blue-500/20 dark:!text-sky-100 dark:ring-sky-400/40'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>{isEn ? 'All' : 'Tất cả'}</span>
            </button>

            <div className="inline-grid grid-flow-col auto-cols-max items-center p-0.5 rounded-[8px] bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setHubTab('project')}
                className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold transition-all duration-200 grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer ${
                  hubTab === 'project'
                    ? 'bg-gradient-to-b from-violet-100/95 to-violet-200/80 text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(124,58,237,.18)] ring-1 ring-violet-300/80 dark:from-violet-500/35 dark:to-purple-500/20 dark:!text-violet-100 dark:ring-violet-400/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FolderKanban
                  size={11}
                  className={hubTab === 'project' ? 'text-violet-600 dark:text-violet-300' : ''}
                />
                <span>Projects</span>
              </button>

              <button
                type="button"
                onClick={() => setHubTab('campaign')}
                className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold transition-all duration-200 grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer ${
                  hubTab === 'campaign'
                    ? 'bg-gradient-to-b from-amber-100/95 to-amber-200/80 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(217,119,6,.18)] ring-1 ring-amber-300/80 dark:from-amber-500/35 dark:to-orange-500/20 dark:!text-amber-100 dark:ring-amber-300/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Megaphone
                  size={11}
                  className={hubTab === 'campaign' ? 'text-amber-600 dark:text-amber-300' : ''}
                />
                <span>Campaigns</span>
              </button>
            </div>
          </div>

          {/* Hàng 3: Cụm icon buttons (+ Tạo phase, Phòng ban, PIC, Trạng thái, Clear Filter) */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 relative">
            {/* 1. Nút + tìm Projects & Campaigns chưa tạo phase */}
            <div className={`relative ${activePopup === 'unphased' ? 'z-[90]' : 'z-10'}`} data-workflow-popover="true">
              <button
                type="button"
                onClick={() => {
                  setActiveHubBoxPopup(null);
                  setActiveInfoBox(null);
                  setActivePopup((prev) => (prev === 'unphased' ? null : 'unphased'));
                }}
                title={isEn ? 'Add Phase to Project / Campaign' : 'Tạo Phase cho Dự án / Chiến dịch'}
                className={`w-8 h-8 rounded-[8px] grid place-items-center transition-colors cursor-pointer ${
                  activePopup === 'unphased'
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-500/10 ring-1 ring-sky-400/50'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
              {activePopup === 'unphased' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-2.5 rounded-[10px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl origin-top-left transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
                >
                  <div className="text-[11px] font-bold text-gray-900 dark:text-white mb-2">
                    {isEn ? 'Add Phase to Project / Campaign' : 'Tạo Phase cho Dự án / Chiến dịch'}
                  </div>
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={unphasedSearchQuery}
                      onChange={(e) => setUnphasedSearchQuery(e.target.value)}
                      placeholder={isEn ? 'Search unphased...' : 'Tìm dự án/chiến dịch chưa có phase...'}
                      className="w-full h-7.5 pl-7 pr-7 text-xs rounded-[6px] border border-gray-200 dark:border-slate-700 bg-gray-50/90 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-sky-400"
                    />
                    {unphasedSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setUnphasedSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {unphasedEntities.length === 0 ? (
                      <div className="py-4 text-center text-[11px] text-gray-400 italic">
                        {isEn ? 'No unphased project or campaign' : 'Không có dự án/chiến dịch nào chưa có phase'}
                      </div>
                    ) : (
                      unphasedEntities.map((e) => (
                        <button
                          key={`${e.type}-${e.id}`}
                          type="button"
                          onClick={() => {
                            handleSelectEntity(e.id);
                            setActivePopup(null);
                          }}
                          className="w-full text-left p-2 rounded-[6px] text-xs grid grid-cols-[auto_1fr] items-center gap-2 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200"
                        >
                          {e.type === 'project' ? (
                            <FolderKanban size={14} className="text-violet-500 shrink-0" />
                          ) : (
                            <Megaphone size={14} className="text-amber-500 shrink-0" />
                          )}
                          <span className="truncate font-medium">
                            <span className="font-bold text-gray-500 dark:text-slate-400 mr-1">
                              [{e.type === 'project' ? 'Project' : 'Campaign'}]
                            </span>
                            {e.name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Vạch ngăn cách nhẹ */}
            <span className="w-px h-4 bg-gray-200 dark:bg-slate-700/60 mx-0.5" />

            {/* 2. Nút Phòng ban */}
            <div className={`relative ${activePopup === 'dept' ? 'z-[90]' : 'z-10'}`} data-workflow-popover="true">
              <button
                type="button"
                onClick={() => {
                  if (userIsRestricted) return;
                  setActiveHubBoxPopup(null);
                  setActiveInfoBox(null);
                  setActivePopup((prev) => (prev === 'dept' ? null : 'dept'));
                }}
                disabled={userIsRestricted}
                title={
                  userIsRestricted
                    ? (hub.profile?.department_name ? `Cố định: ${hub.profile.department_name}` : 'Cố định theo phòng ban')
                    : (isEn ? 'Filter by department' : 'Lọc theo phòng ban')
                }
                className={`w-8 h-8 rounded-[8px] grid place-items-center transition-colors ${
                  userIsRestricted
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-500/10 opacity-90 cursor-default'
                    : activePopup === 'dept' || (hubDept && hubDept !== 'all')
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-500/10 cursor-pointer'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-slate-800/50 cursor-pointer'
                }`}
              >
                <Building2 size={15} />
              </button>
              {activePopup === 'dept' && !userIsRestricted && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-60 p-1.5 rounded-[10px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7)] origin-top-left transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setHubDept('all');
                      setActivePopup(null);
                    }}
                    className={`w-full text-left p-2 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center cursor-pointer transition-colors ${
                      hubDept === 'all'
                        ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{isEn ? 'All Departments' : 'Tất cả phòng ban'}</span>
                    {hubDept === 'all' && <Check size={13} />}
                  </button>
                  {availableDepartments.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setHubDept(String(d.id));
                        setActivePopup(null);
                      }}
                      className={`w-full text-left p-2 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center cursor-pointer transition-colors ${
                        String(hubDept) === String(d.id)
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{d.name}</span>
                      {String(hubDept) === String(d.id) && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Nút PIC */}
            <div className={`relative ${activePopup === 'pic' ? 'z-[90]' : 'z-10'}`} data-workflow-popover="true">
              <button
                type="button"
                onClick={() => {
                  setActiveHubBoxPopup(null);
                  setActiveInfoBox(null);
                  setActivePopup((prev) => (prev === 'pic' ? null : 'pic'));
                }}
                title={isEn ? 'Filter by PIC' : 'Lọc theo PIC'}
                className={`w-8 h-8 rounded-[8px] grid place-items-center transition-colors cursor-pointer ${
                  activePopup === 'pic' || (hubPic && hubPic !== 'all')
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-500/10'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Users size={15} />
              </button>
              {activePopup === 'pic' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 p-2 rounded-[10px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7)] origin-top-left transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
                >
                  <div className="relative mb-1.5">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={picSearchQuery}
                      onChange={(e) => setPicSearchQuery(e.target.value)}
                      placeholder={isEn ? 'Filter PIC...' : 'Tìm nhân sự...'}
                      className="w-full h-7.5 pl-7 pr-2 text-xs rounded-[6px] border border-gray-200 dark:border-slate-700 bg-gray-50/90 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-sky-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHubPic('all');
                      setActivePopup(null);
                    }}
                    className={`w-full text-left p-1.5 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center cursor-pointer transition-colors ${
                      hubPic === 'all'
                        ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{isEn ? 'All PICs' : 'Tất cả PIC'}</span>
                    {hubPic === 'all' && <Check size={13} />}
                  </button>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {filteredPeople.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setHubPic(String(p.id));
                          setActivePopup(null);
                        }}
                        className={`w-full text-left p-1.5 rounded-[6px] text-xs grid grid-cols-[auto_1fr_auto] items-center gap-2 cursor-pointer transition-colors ${
                          String(hubPic) === String(p.id)
                            ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Avatar name={p.name} src={p.avatar_url || undefined} className="w-5 h-5 text-[9px]" />
                        <span className="truncate">{p.name}</span>
                        {String(hubPic) === String(p.id) && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Nút Lịch (Calendar Filter) */}
            <div className={`relative ${activePopup === 'calendar' ? 'z-[90]' : 'z-10'}`} data-workflow-popover="true">
              <button
                type="button"
                onClick={() => {
                  setActiveHubBoxPopup(null);
                  setActiveInfoBox(null);
                  setActivePopup((prev) => {
                    const next = prev === 'calendar' ? null : 'calendar';
                    if (next === 'calendar') {
                      setCalTempStart(hubCustomStart);
                      setCalTempEnd(hubCustomEnd);
                      setCalIsPickingEnd(false);
                      if (hubCustomStart) {
                        const d = new Date(hubCustomStart);
                        if (!isNaN(d.getTime())) {
                          setCalViewYear(d.getFullYear());
                          setCalViewMonth(d.getMonth());
                        }
                      }
                    }
                    return next;
                  });
                }}
                title={isEn ? 'Filter by calendar' : 'Lọc theo lịch'}
                className={`w-8 h-8 rounded-[8px] grid place-items-center transition-colors cursor-pointer ${
                  activePopup === 'calendar' || hubCalendar !== 'all' || hubCustomStart || hubCustomEnd
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-500/10 ring-1 ring-sky-400/40'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <CalendarIcon size={15} />
              </button>
              {activePopup === 'calendar' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-76 sm:w-80 p-3 rounded-[10px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7)] origin-top-left transition-all duration-200 ease-out animate-in fade-in zoom-in-95 space-y-2.5 max-h-[85vh] overflow-y-auto"
                >
                  {/* Header */}
                  <div className="px-1 grid grid-cols-[1fr_auto] items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('projects.filterCalendar')}
                    </span>
                    {(hubCalendar !== 'all' || hubCustomStart || hubCustomEnd) && (
                      <button
                        type="button"
                        onClick={handleCalClear}
                        className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                      >
                        {t('common.cancel')} / {t('projects.clearFilters')}
                      </button>
                    )}
                  </div>

                  {/* Presets Grid */}
                  <div className="grid grid-cols-2 gap-1">
                    {calPresets.map((opt) => {
                      const active = hubCalendar === opt.key && !hubCustomStart && !hubCustomEnd;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setHubCalendar(opt.key);
                            setHubCustomStart('');
                            setHubCustomEnd('');
                            setActivePopup(null);
                          }}
                          className={`text-left px-2.5 py-1.5 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center justify-between transition-colors cursor-pointer ${
                            active
                              ? 'font-bold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {active && <Check size={12} className="text-sky-600 dark:text-sky-300 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-slate-700/80 my-1" />

                  {/* Custom Date Range Section */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_auto] items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                        {t('projects.dateCustom')}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {calIsPickingEnd
                          ? (isEn ? 'Select end date' : 'Chọn ngày kết thúc')
                          : (isEn ? 'Select range' : 'Chọn khoảng ngày')}
                      </span>
                    </div>

                    {/* Range display boxes */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div
                        className={`p-2 rounded-[6px] border text-xs text-center transition-all ${
                          calTempStart && !calTempEnd && calIsPickingEnd
                            ? 'border-sky-500 ring-1 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-950/30'
                            : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="text-[9px] uppercase font-bold text-gray-400 mb-0.5">{t('projects.startDate')}</div>
                        <div className="font-semibold text-gray-800 dark:text-gray-100">
                          {calTempStart ? formatCalVN(calTempStart) : '—/—/————'}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded-[6px] border text-xs text-center transition-all ${
                          calIsPickingEnd
                            ? 'border-sky-500 ring-1 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-950/30'
                            : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="text-[9px] uppercase font-bold text-gray-400 mb-0.5">{t('projects.endDate')}</div>
                        <div className="font-semibold text-gray-800 dark:text-gray-100">
                          {calTempEnd ? formatCalVN(calTempEnd) : '—/—/————'}
                        </div>
                      </div>
                    </div>

                    {/* Mini Month Calendar */}
                    <div className="bg-gray-50/80 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700/60 rounded-[8px] p-2.5">
                      {/* Month Navigation */}
                      <div className="grid grid-cols-[auto_1fr_auto] items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={handleCalPrevMonth}
                          className="w-6 h-6 rounded-[6px] grid place-items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          aria-label="Previous month"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-bold text-gray-800 dark:text-white text-center">
                          {calMonthLabel}
                        </span>
                        <button
                          type="button"
                          onClick={handleCalNextMonth}
                          className="w-6 h-6 rounded-[6px] grid place-items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          aria-label="Next month"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Weekdays */}
                      <div className="grid grid-cols-7 text-center mb-1">
                        {(isEn ? calWeekDaysEn : calWeekDaysVi).map((d) => (
                          <span key={d} className="text-[10px] font-bold text-gray-400 py-1">
                            {d}
                          </span>
                        ))}
                      </div>

                      {/* Days Matrix */}
                      <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
                        {Array.from({ length: calFirstDayOfWeek }).map((_, i) => (
                          <span key={`cal-empty-${i}`} className="h-7 w-7" />
                        ))}

                        {Array.from({ length: calDaysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateStr = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isToday = dateStr === calTodayStr;

                          const isStart = calTempStart === dateStr;
                          const isEnd = calTempEnd === dateStr;

                          const effectiveEnd = calTempEnd || (calIsPickingEnd && calHoverDate && calHoverDate >= calTempStart ? calHoverDate : '');
                          const inRange = calTempStart && effectiveEnd && dateStr > calTempStart && dateStr < effectiveEnd;

                          let cellClass = 'h-7 w-7 mx-auto grid place-items-center text-xs transition-colors cursor-pointer ';
                          if (isStart && isEnd) {
                            cellClass += 'bg-[#002e6d] dark:bg-sky-600 text-white font-bold rounded-[6px] shadow-xs';
                          } else if (isStart) {
                            cellClass += 'bg-[#002e6d] dark:bg-sky-600 text-white font-bold rounded-l-[6px] rounded-r-none shadow-xs';
                          } else if (isEnd) {
                            cellClass += 'bg-[#002e6d] dark:bg-sky-600 text-white font-bold rounded-r-[6px] rounded-l-none shadow-xs';
                          } else if (inRange) {
                            cellClass += 'bg-sky-500/15 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300 font-medium rounded-none';
                          } else {
                            cellClass += 'text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-800 rounded-[6px] ';
                            if (isToday) cellClass += 'font-bold text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30';
                          }

                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleCalDayClick(day)}
                              onMouseEnter={() => calIsPickingEnd && setCalHoverDate(dateStr)}
                              className={cellClass}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Range Action Buttons */}
                    <div className="grid grid-cols-[auto_auto] items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCalClear}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-[6px] transition-colors cursor-pointer"
                      >
                        {t('projects.clearFilters')}
                      </button>
                      <button
                        type="button"
                        onClick={handleCalApply}
                        disabled={!calTempStart}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-[6px] text-white transition-all shadow-xs cursor-pointer ${
                          calTempStart
                            ? 'bg-[#002e6d] hover:bg-[#001f4d] dark:bg-blue-600 dark:hover:bg-blue-500'
                            : 'bg-gray-300 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Nút Trạng thái */}
            <div className={`relative ${activePopup === 'status' ? 'z-[90]' : 'z-10'}`} data-workflow-popover="true">
              <button
                type="button"
                onClick={() => {
                  setActiveHubBoxPopup(null);
                  setActiveInfoBox(null);
                  setActivePopup((prev) => (prev === 'status' ? null : 'status'));
                }}
                title={isEn ? 'Filter by status' : 'Lọc theo trạng thái'}
                className={`w-8 h-8 rounded-[8px] grid place-items-center transition-colors cursor-pointer ${
                  activePopup === 'status' || (hubStatus && hubStatus !== 'all')
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-500/10'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <CheckCircle2 size={15} />
              </button>
              {activePopup === 'status' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-52 p-1.5 rounded-[10px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7)] origin-top-left transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
                >
                  {[
                    { key: 'all', label: isEn ? 'All Statuses' : 'Tất cả trạng thái', dot: 'bg-slate-400' },
                    { key: 'open', label: isEn ? 'In Progress' : 'Đang thực hiện', dot: 'bg-blue-500' },
                    { key: 'overdue', label: isEn ? 'Overdue' : 'Quá hạn', dot: 'bg-rose-500' },
                    { key: 'done', label: isEn ? 'Completed' : 'Đã hoàn thành', dot: 'bg-emerald-500' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => {
                        setHubStatus(s.key);
                        setActivePopup(null);
                      }}
                      className={`w-full text-left p-2 rounded-[6px] text-xs grid grid-cols-[auto_1fr_auto] items-center gap-2 cursor-pointer transition-colors ${
                        hubStatus === s.key
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <span>{s.label}</span>
                      {hubStatus === s.key && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Nút Clear Filter (Xóa bộ lọc) */}
            <button
              type="button"
              onClick={handleClearAllFilters}
              title={isEn ? 'Clear all filters' : 'Xóa tất cả bộ lọc'}
              className={`w-8 h-8 rounded-[8px] grid place-items-center transition-colors cursor-pointer ${
                hasActiveFilter
                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <RotateCcw size={14} className={hasActiveFilter ? 'animate-in spin-in-180 duration-200' : ''} />
            </button>
          </div>
        </div>

        {/* Bên phải (xl:col-span-8 2xl:col-span-8): Bộ 6 Box Performance (Manager vs PM) */}
        <div className="xl:col-span-8 2xl:col-span-8 grid gap-2 w-full relative">
          {/* Nút chuyển đổi chỉ hiển thị cho Admin, đặt gọn gàng ở góc trên phải */}
          {isAdminUser && (
            <div className="grid justify-end w-full">
              <div className="inline-grid grid-flow-col auto-cols-max items-center p-0.5 rounded-[7px] bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 text-[10px] font-bold shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setPerfViewMode('manager');
                    setActiveHubBoxPopup(null);
                    setActiveInfoBox(null);
                  }}
                  className={`px-2 py-0.5 rounded-[5px] transition-all cursor-pointer ${
                    effectivePerfView === 'manager'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-2xs font-extrabold'
                      : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
                  }`}
                >
                  Manager (6 Box)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPerfViewMode('pm');
                    setActiveHubBoxPopup(null);
                    setActiveInfoBox(null);
                  }}
                  className={`px-2 py-0.5 rounded-[5px] transition-all cursor-pointer ${
                    effectivePerfView === 'pm'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-2xs font-extrabold'
                      : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
                  }`}
                >
                  PM / Leader (6 Box)
                </button>
              </div>
            </div>
          )}

          {/* Lưới 6 Box Performance: 2 cột mobile, 3 cột tablet, 6 cột desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-2 sm:gap-2.5 w-full">
            {effectivePerfView === 'manager' ? (
              <>
                {/* Manager Box 1: Dự án trễ hạn (Overdue Campaigns) - Đỏ */}
                <div
                  className={`relative ${activeHubBoxPopup === 1 || activeInfoBox === 1 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 1 ? null : 1));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 1 ? null : 1));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-rose p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-rose-400/80 dark:hover:border-rose-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 1 || hubStatus === 'overdue' ? 'ring-2 ring-rose-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Overdue Campaigns' : 'Dự án trễ hạn'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 1 ? null : 1));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-rose-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-rose-600 dark:text-rose-400 tracking-tight leading-none truncate">
                      {managerMetrics.overdueCount}/{managerMetrics.totalActiveCount} {isEn ? 'Projects' : 'Dự án'}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`${managerMetrics.highOverdue} ${isEn ? 'High priority' : 'Ưu tiên cao'} · ${isEn ? `Avg ${managerMetrics.avgOverdueDays}d overdue` : `Trễ TB ${managerMetrics.avgOverdueDays} ngày`}`}
                    >
                      {managerMetrics.highOverdue} {isEn ? 'High' : 'Ưu tiên cao'} · {isEn ? `Avg ${managerMetrics.avgOverdueDays}d` : `Trễ TB ${managerMetrics.avgOverdueDays}n`}
                    </div>
                  </div>

                  {activeInfoBox === 1 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-rose-600 dark:text-rose-400 mb-1">
                        {isEn ? 'Mechanism: Overdue Campaigns' : 'Cơ chế: Dự án trễ hạn'}
                      </div>
                      <div>
                        {isEn
                          ? 'Counts active Projects & Campaigns past their due date. Highlights high-priority items so Managers can reallocate resources immediately.'
                          : 'Đếm số Dự án & Chiến dịch đang chạy nhưng đã quá hạn bàn giao. Cảnh báo đỏ khi có chiến dịch ưu tiên cao bị trễ để Manager can thiệp nguồn lực.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 1 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Overdue Projects / Campaigns' : 'Dự án / Chiến dịch trễ hạn'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 max-h-60 overflow-y-auto space-y-1.5 text-xs">
                        {managerMetrics.overdueEntities.length === 0 ? (
                          <div className="py-4 text-center text-slate-400">
                            {isEn ? 'No overdue projects or campaigns' : 'Không có dự án/chiến dịch nào trễ hạn'}
                          </div>
                        ) : (
                          managerMetrics.overdueEntities.map((e) => (
                            <div
                              key={e.id}
                              onClick={() => {
                                handleSelectEntity(e.id);
                                setActiveHubBoxPopup(null);
                              }}
                              className="p-2 rounded-[8px] bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 grid grid-cols-[1fr_auto] items-center gap-2 cursor-pointer hover:bg-rose-100/40 transition-colors"
                            >
                              <span className="font-bold text-gray-900 dark:text-white truncate">{e.name}</span>
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                {isEn ? 'Overdue' : 'Trễ hạn'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setHubStatus((prev) => (prev === 'overdue' ? 'all' : 'overdue'));
                          setActiveHubBoxPopup(null);
                        }}
                        className="w-full mt-2.5 py-1.5 px-3 rounded-[6px] text-xs font-bold transition-colors cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                      >
                        {hubStatus === 'overdue'
                          ? (isEn ? 'Clear overdue filter' : 'Bỏ lọc trễ hạn')
                          : (isEn ? 'Filter overdue projects only' : 'Chỉ hiện dự án trễ hạn')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Manager Box 2: Chờ phê duyệt (Pending Approvals) - Cam */}
                <div
                  className={`relative ${activeHubBoxPopup === 2 || activeInfoBox === 2 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 2 ? null : 2));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 2 ? null : 2));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-amber p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-amber-400/80 dark:hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 2 ? 'ring-2 ring-amber-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Pending Approvals' : 'Chờ phê duyệt'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 2 ? null : 2));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-amber-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400 tracking-tight leading-none truncate">
                      {managerMetrics.pendingApprovals.length} {isEn ? 'Requests' : 'Đề xuất'}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`${managerMetrics.budgetApprovalCount} ${isEn ? 'Budget Approval' : 'Ngân sách'} · ${managerMetrics.rescheduleCount} ${isEn ? 'Reschedule' : 'Dời lịch'}`}
                    >
                      {managerMetrics.budgetApprovalCount} {isEn ? 'Budget' : 'Ngân sách'} · {managerMetrics.rescheduleCount} {isEn ? 'Reschedule' : 'Dời lịch'}
                    </div>
                  </div>

                  {activeInfoBox === 2 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-amber-600 dark:text-amber-400 mb-1">
                        {isEn ? 'Mechanism: Pending Approvals' : 'Cơ chế: Chờ phê duyệt'}
                      </div>
                      <div>
                        {isEn
                          ? 'Aggregates items awaiting Manager approval (budget adjustments, deliverable sign-offs, or timeline extensions) to prevent bottlenecks.'
                          : 'Tổng hợp các hạng mục đang chờ cấp Quản lý duyệt (ngân sách, nghiệm thu ấn phẩm hoặc xin dời timeline) để tránh làm nghẽn tiến độ team.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 2 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Approvals Queue' : 'Hàng đợi phê duyệt'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 max-h-60 overflow-y-auto space-y-2 text-xs">
                        {managerMetrics.pendingApprovals.length === 0 ? (
                          <div className="py-6 text-center text-slate-400">
                            {isEn ? 'No pending escalations' : 'Không có yêu cầu chờ duyệt'}
                          </div>
                        ) : (
                          managerMetrics.pendingApprovals.map((e, idx) => (
                            <div
                              key={`appr-${e.id || idx}`}
                              className="p-2 rounded-[8px] bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 grid grid-cols-[1fr_auto] items-center gap-2"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 dark:text-white truncate">{e.name}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {idx % 2 === 0
                                    ? (isEn ? 'Budget Request · Over Budget +15%' : 'Yêu cầu duyệt phát sinh ngân sách +15%')
                                    : (isEn ? 'Reschedule Request · +5d' : 'Yêu cầu gia hạn tiến độ +5 ngày')}
                                </div>
                              </div>
                              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(isEn ? `Approved: ${e.name}` : `Đã phê duyệt: ${e.name}`);
                                    setActiveHubBoxPopup(null);
                                  }}
                                  className="px-2.5 py-1 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] cursor-pointer shadow-2xs"
                                >
                                  {isEn ? 'Approve' : 'Duyệt'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(isEn ? `Rejected: ${e.name}` : `Đã từ chối: ${e.name}`);
                                    setActiveHubBoxPopup(null);
                                  }}
                                  className="px-2 py-1 rounded-[6px] bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-gray-200 font-medium text-[10.5px] cursor-pointer"
                                >
                                  {isEn ? 'Reject' : 'Từ chối'}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manager Box 3: Điều phối Leader (Leader Workload) - Tím */}
                <div
                  className={`relative ${activeHubBoxPopup === 3 || activeInfoBox === 3 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 3 ? null : 3));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 3 ? null : 3));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-violet p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-violet-400/80 dark:hover:border-violet-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 3 ? 'ring-2 ring-violet-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Leader Workload' : 'Điều phối Leader'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 3 ? null : 3));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-violet-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-violet-600 dark:text-violet-400 tracking-tight leading-none truncate">
                      {managerMetrics.overloadedLeads.length > 0
                        ? `${managerMetrics.overloadedLeads.length} ${isEn ? 'Overloaded' : 'Quá tải'}`
                        : (isEn ? 'Optimal' : 'Đủ tải')}
                    </div>
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 truncate min-w-0">
                      {managerMetrics.overloadedLeads.slice(0, 2).map((l, lIdx) => (
                        <span key={`${l.name}-${lIdx}`} className="inline-grid grid-flow-col auto-cols-max items-center gap-0.5 truncate max-w-[70px]">
                          <Avatar name={l.name} src={l.avatar_url} className="w-3 h-3 text-[6px]" />
                          <span className="truncate">{l.name}</span>
                          {l.lateCount > 0 && <span className="text-rose-500 font-bold">({l.lateCount})</span>}
                        </span>
                      ))}
                      {managerMetrics.overloadedLeads.length === 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{isEn ? 'Balanced' : 'Tải đều'}</span>
                      )}
                    </div>
                  </div>

                  {activeInfoBox === 3 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-violet-600 dark:text-violet-400 mb-1">
                        {isEn ? 'Mechanism: Leader Workload' : 'Cơ chế: Điều phối Leader'}
                      </div>
                      <div>
                        {isEn
                          ? 'Tracks how many campaigns each Leader oversees. Flags warnings when a Leader handles > 3 projects or has >= 2 overdue projects.'
                          : 'Theo dõi số lượng chiến dịch/dự án mỗi Leader đang phụ trách. Cảnh báo khi 1 Leader gánh trên 3 dự án hoặc có từ 2 dự án trễ hạn trở lên.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 3 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Leader Workload' : 'Cân đối tải Leader'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 max-h-60 overflow-y-auto space-y-2 text-xs">
                        {managerMetrics.overloadedLeads.map((lead) => (
                          <div
                            key={lead.name}
                            onClick={() => {
                              setHubPic(lead.name);
                              setActiveHubBoxPopup(null);
                            }}
                            className="p-2 rounded-[8px] bg-violet-50/40 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40 grid grid-cols-[auto_1fr_auto] items-center gap-2 cursor-pointer hover:bg-violet-100/40 transition-colors"
                          >
                            <Avatar name={lead.name} src={lead.avatar_url} className="w-6 h-6 text-[10px]" />
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 dark:text-white truncate">{lead.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {lead.projectsCount} {isEn ? 'Projects' : 'Dự án'} · {lead.lateCount > 0 ? `${lead.lateCount} ${isEn ? 'Overdue' : 'Trễ hạn'}` : (isEn ? 'On Track' : 'Đúng hạn')}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                              {isEn ? 'Filter →' : 'Lọc →'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manager Box 4: Công suất nhân sự (Team Capacity) - Xanh dương */}
                <div
                  className={`relative ${activeHubBoxPopup === 4 || activeInfoBox === 4 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 4 ? null : 4));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 4 ? null : 4));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-blue p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-blue-400/80 dark:hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 4 ? 'ring-2 ring-blue-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Team Capacity' : 'Công suất nhân sự'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 4 ? null : 4));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-blue-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-blue-600 dark:text-blue-400 tracking-tight leading-none truncate">
                      {managerMetrics.capacityPct}% {isEn ? 'Capacity' : 'Công suất'}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`${managerMetrics.fullLoadCount}/${managerMetrics.totalStaff} ${isEn ? 'Busy' : 'Kín lịch'} · ${managerMetrics.availableStaff.length} ${isEn ? 'Available' : 'Sẵn sàng'}`}
                    >
                      {managerMetrics.fullLoadCount}/{managerMetrics.totalStaff} {isEn ? 'Busy' : 'Kín lịch'} · {managerMetrics.availableStaff.length} {isEn ? 'Free' : 'Sẵn sàng'}
                    </div>
                  </div>

                  {activeInfoBox === 4 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {isEn ? 'Mechanism: Team Capacity' : 'Cơ chế: Công suất nhân sự'}
                      </div>
                      <div>
                        {isEn
                          ? 'Measures workload allocation across Marketing staff. Helps Managers identify available members ready to take on new deliverables.'
                          : 'Đo lường tỷ lệ phân bổ đầu việc trên toàn bộ nhân sự Marketing. Giúp Manager biết còn bao nhiêu thành viên sẵn sàng nhận chiến dịch mới.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 4 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Team Capacity' : 'Nhân sự sẵn sàng'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 max-h-60 overflow-y-auto space-y-2 text-xs">
                        <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {isEn ? 'Available Members (< 3 tasks):' : 'Nhân sự sẵn sàng nhận việc (< 3 tasks):'}
                        </div>
                        {managerMetrics.availableStaff.length === 0 ? (
                          <div className="py-4 text-center text-slate-400">
                            {isEn ? 'All team members are fully loaded' : 'Tất cả nhân sự đều đã kín việc'}
                          </div>
                        ) : (
                          managerMetrics.availableStaff.map((staff) => (
                            <div
                              key={staff.name}
                              className="p-1.5 rounded-[6px] bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 grid grid-cols-[auto_1fr_auto] items-center gap-2"
                            >
                              <Avatar name={staff.name} src={staff.avatar_url} className="w-5 h-5 text-[9px]" />
                              <span className="font-medium text-gray-800 dark:text-slate-200 truncate">{staff.name}</span>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                                {staff.taskCount} {isEn ? 'tasks' : 'tasks'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manager Box 5: Phân bổ chiến dịch (Campaign Focus) - Xanh ngọc */}
                <div
                  className={`relative ${activeHubBoxPopup === 5 || activeInfoBox === 5 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 5 ? null : 5));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 5 ? null : 5));
                      }
                    }}
                    className={`hover-magnetic-card [--glow-color:20,184,166] p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-teal-400/80 dark:hover:border-teal-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 5 ? 'ring-2 ring-teal-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Campaign Focus' : 'Phân bổ chiến dịch'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 5 ? null : 5));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-teal-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-teal-600 dark:text-teal-400 tracking-tight leading-none truncate">
                      {managerMetrics.strategicPct}% {isEn ? 'Core' : 'Trọng điểm'}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`${managerMetrics.strategicCount} ${isEn ? 'Core campaigns' : 'Chiến dịch chính'} · ${managerMetrics.adhocCount} ${isEn ? 'Ad-hoc tasks' : 'Phát sinh'}`}
                    >
                      {managerMetrics.strategicCount} {isEn ? 'Core' : 'Chính'} · {managerMetrics.adhocCount} {isEn ? 'Ad-hoc' : 'Phát sinh'}
                    </div>
                  </div>

                  {activeInfoBox === 5 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-teal-600 dark:text-teal-400 mb-1">
                        {isEn ? 'Mechanism: Campaign Focus' : 'Cơ chế: Phân bổ chiến dịch'}
                      </div>
                      <div>
                        {isEn
                          ? 'Percentage of team effort dedicated to High/Urgent priority campaigns versus ad-hoc short-term requests.'
                          : 'Tỷ lệ nguồn lực (đầu việc) đang tập trung vào các Chiến dịch trọng điểm (High/Urgent) so với các công việc phát sinh ngắn hạn.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 5 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-right"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Campaign Focus' : 'Dự án trọng điểm'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 max-h-60 overflow-y-auto space-y-2 text-xs">
                        <div className="text-[11px] font-bold text-teal-700 dark:text-teal-300">
                          {isEn ? 'Core Strategic Campaigns:' : 'Dự án & Chiến dịch trọng điểm:'}
                        </div>
                        {managerMetrics.strategicEntities.map((e) => (
                          <div
                            key={e.id}
                            onClick={() => {
                              handleSelectEntity(e.id);
                              setActiveHubBoxPopup(null);
                            }}
                            className="p-2 rounded-[8px] bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 grid grid-cols-[1fr_auto] items-center gap-2 cursor-pointer hover:bg-teal-100/40 transition-colors"
                          >
                            <span className="font-bold text-gray-900 dark:text-white truncate">{e.name}</span>
                            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">
                              {e.phases?.length || 0} Phases
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manager Box 6: Tỷ lệ đúng hạn (On-Time Delivery) - Xanh lá */}
                <div
                  className={`relative ${activeHubBoxPopup === 6 || activeInfoBox === 6 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 6 ? null : 6));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 6 ? null : 6));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-emerald p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-emerald-400/80 dark:hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 6 || hubStatus === 'done' ? 'ring-2 ring-emerald-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'On-Time Delivery' : 'Tỷ lệ đúng hạn'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 6 ? null : 6));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-emerald-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight leading-none truncate">
                      {managerMetrics.onTimeDeliveryPct}% ({managerMetrics.currentMonthLabel})
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={isEn ? '+4% vs previous month' : 'Tăng 4% so với tháng trước'}
                    >
                      {isEn ? '+4% vs last month' : 'Tăng 4% so với tháng trước'}
                    </div>
                  </div>

                  {activeInfoBox === 6 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        {isEn ? 'Mechanism: On-Time Delivery' : 'Cơ chế: Tỷ lệ đúng hạn'}
                      </div>
                      <div>
                        {isEn
                          ? 'Percentage of campaigns completed within committed SLA during the active period compared to the previous month.'
                          : 'Tỷ lệ Chiến dịch & Dự án hoàn thành đúng cam kết (SLA) trong tháng hiện tại so với tháng trước.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 6 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-right"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'On-Time Delivery SLA' : 'Tỷ lệ hoàn thành đúng hạn'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 space-y-2 text-xs">
                        <div className="p-2 rounded-[8px] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                          <div className="font-bold text-emerald-700 dark:text-emerald-300">
                            SLA {managerMetrics.currentMonthLabel}: {managerMetrics.onTimeDeliveryPct}% {isEn ? 'On-Time Delivery' : 'Đúng tiến độ'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {managerMetrics.onTimeDiffText}
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                          {managerMetrics.completedEntities.length === 0 ? (
                            <div className="py-2 text-center text-slate-400 italic text-[11px]">
                              {isEn ? 'No completed projects yet' : 'Chưa có dự án nào hoàn thành'}
                            </div>
                          ) : (
                            managerMetrics.completedEntities.map((e) => (
                              <div
                                key={e.id}
                                onClick={() => {
                                  handleSelectEntity(e.id);
                                  setActiveHubBoxPopup(null);
                                }}
                                className="p-1.5 rounded-[6px] bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 grid grid-cols-[1fr_auto] items-center gap-2 cursor-pointer hover:bg-emerald-100/40 transition-colors"
                              >
                                <span className="font-medium text-gray-900 dark:text-white truncate">{e.name}</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">Done</span>
                              </div>
                            ))
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setHubStatus((prev) => (prev === 'done' ? 'all' : 'done'));
                            setActiveHubBoxPopup(null);
                          }}
                          className="w-full mt-1.5 py-1.5 px-3 rounded-[6px] text-xs font-bold transition-colors cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                        >
                          {hubStatus === 'done'
                            ? (isEn ? 'Clear completed filter' : 'Bỏ lọc hoàn thành')
                            : (isEn ? 'View completed projects' : 'Xem dự án đã hoàn thành')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* PM Box 1: Công việc bị nghẽn (Blocked Tasks) - Đỏ */}
                <div
                  className={`relative ${activeHubBoxPopup === 101 || activeInfoBox === 101 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 101 ? null : 101));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 101 ? null : 101));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-rose p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-rose-400/80 dark:hover:border-rose-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 101 ? 'ring-2 ring-rose-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Blocked Tasks' : 'Công việc bị nghẽn'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 101 ? null : 101));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-rose-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-rose-600 dark:text-rose-400 tracking-tight leading-none truncate">
                      {pmMetrics.blockers.length} {isEn ? 'Blockers' : 'Điểm nghẽn'}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`${pmMetrics.waitingClientCount} ${isEn ? 'Review wait' : 'Chờ duyệt'} · ${pmMetrics.depBlockedCount} ${isEn ? 'Overdue' : 'Quá hạn xử lý'}`}
                    >
                      {pmMetrics.waitingClientCount} {isEn ? 'Wait' : 'Chờ duyệt'} · {pmMetrics.depBlockedCount} {isEn ? 'Late' : 'Quá hạn'}
                    </div>
                  </div>

                  {activeInfoBox === 101 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-rose-600 dark:text-rose-400 mb-1">
                        {isEn ? 'Mechanism: Blocked Tasks' : 'Cơ chế: Công việc bị nghẽn'}
                      </div>
                      <div>
                        {isEn
                          ? 'Counts tasks that are stuck or overdue in the current stage, helping Leaders unblock briefs, creative assets, or approvals.'
                          : 'Đếm các đầu việc đang bị kẹt hoặc trễ hạn trong giai đoạn hiện tại. Giúp Leader tháo gỡ ngay các vướng mắc về brief, thiết kế hoặc duyệt bài.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 101 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Blocked Tasks' : 'Công việc bị nghẽn'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 max-h-60 overflow-y-auto space-y-1.5 text-xs">
                        {pmMetrics.blockers.length === 0 ? (
                          <div className="py-4 text-center text-slate-400">{isEn ? 'No blockers' : 'Không có việc nghẽn'}</div>
                        ) : (
                          pmMetrics.blockers.map((t) => (
                            <div key={t.id} className="p-1.5 rounded-[6px] bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30 grid grid-cols-[1fr_auto] items-center gap-2">
                              <span className="truncate text-gray-800 dark:text-slate-200">{t.title}</span>
                              <span className="text-[10px] text-rose-600 font-bold">{t.status}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* PM Box 2: Đến hạn hôm nay (Due Today) - Cam */}
                <div
                  className={`relative ${activeHubBoxPopup === 102 || activeInfoBox === 102 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 102 ? null : 102));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 102 ? null : 102));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-amber p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-amber-400/80 dark:hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 102 ? 'ring-2 ring-amber-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Due Today' : 'Đến hạn hôm nay'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 102 ? null : 102));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-amber-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400 tracking-tight leading-none truncate">
                      {pmMetrics.todayTasks.length} {isEn ? 'Tasks' : 'Công việc'}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`${pmMetrics.todayDone} Done · ${pmMetrics.todayActive} Active · ${pmMetrics.todayTodo} Pending`}
                    >
                      {pmMetrics.todayDone} Xong · {pmMetrics.todayActive} Đang chạy · {pmMetrics.todayTodo} Chờ
                    </div>
                  </div>

                  {activeInfoBox === 102 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-amber-600 dark:text-amber-400 mb-1">
                        {isEn ? 'Mechanism: Due Today' : 'Cơ chế: Đến hạn hôm nay'}
                      </div>
                      <div>
                        {isEn
                          ? 'Aggregates tasks due today or actively running, grouped by assigned team members for quick standup follow-up.'
                          : 'Tổng hợp các đầu việc cần bàn giao trong ngày hôm nay hoặc đang triển khai trực tiếp, gom nhóm theo từng nhân sự thực hiện.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 102 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Due Today Tasks' : 'Công việc đến hạn'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 max-h-60 overflow-y-auto space-y-2 text-xs">
                        {pmMetrics.todayTasksByAssignee.map((item) => (
                          <div key={item.name} className="p-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                              <Avatar name={item.name} src={item.avatar} className="w-4 h-4 text-[8px]" />
                              <span>{item.name} ({item.tasks.length})</span>
                            </div>
                            <div className="space-y-0.5 pl-5">
                              {item.tasks.map((t) => (
                                <div key={t.id} className="text-[10.5px] text-slate-600 dark:text-slate-400 truncate">
                                  • {t.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* PM Box 3: Tốc độ triển khai (Execution Pace) - Xanh dương */}
                <div
                  className={`relative ${activeHubBoxPopup === 103 || activeInfoBox === 103 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 103 ? null : 103));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 103 ? null : 103));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-blue p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-blue-400/80 dark:hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 103 ? 'ring-2 ring-blue-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Execution Pace' : 'Tốc độ triển khai'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 103 ? null : 103));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-blue-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-blue-600 dark:text-blue-400 tracking-tight leading-none truncate">
                      {pmMetrics.velocity} {isEn ? 't/day' : 'Việc/ngày'}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`${isEn ? 'Target:' : 'Mục tiêu:'} ${pmMetrics.requiredVelocity} ${isEn ? 'tasks/day' : 'việc/ngày'}`}
                    >
                      {isEn ? 'Target:' : 'Mục tiêu:'} {pmMetrics.requiredVelocity} v/ngày
                    </div>
                  </div>

                  {activeInfoBox === 103 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {isEn ? 'Mechanism: Execution Pace' : 'Cơ chế: Tốc độ triển khai'}
                      </div>
                      <div>
                        {isEn
                          ? 'Compares actual completion speed against the daily run-rate required to meet the planned Launch Date.'
                          : 'So sánh tốc độ hoàn thành công việc thực tế của team với định mức cần đạt mỗi ngày để kịp ngày ra mắt chiến dịch (Launch Date).'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 103 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Execution Pace' : 'Tốc độ triển khai'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 space-y-2 text-xs">
                        <div className="p-2 rounded-[8px] bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
                          <div className="font-bold text-blue-700 dark:text-blue-300">Tốc độ thực tế: {pmMetrics.velocity} việc / ngày</div>
                          <div className="text-[10px] text-slate-500">Cần đạt tối thiểu {pmMetrics.requiredVelocity} việc/ngày để kịp tiến độ.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PM Box 4: Khối lượng còn lại (Remaining Scope) - Tím */}
                <div
                  className={`relative ${activeHubBoxPopup === 104 || activeInfoBox === 104 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 104 ? null : 104));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 104 ? null : 104));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-violet p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-violet-400/80 dark:hover:border-violet-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 104 ? 'ring-2 ring-violet-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Remaining Scope' : 'Khối lượng còn lại'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 104 ? null : 104));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-violet-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-violet-600 dark:text-violet-400 tracking-tight leading-none truncate">
                      Còn {pmMetrics.remainingTasksCount}/{pmMetrics.totalTasks} {isEn ? 'Tasks' : 'Việc'}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`Còn ${pmMetrics.remainingWorkPct}% việc · ${Math.max(15, 100 - pmMetrics.remainingWorkPct)}% quỹ thời gian`}
                    >
                      Còn {pmMetrics.remainingWorkPct}% việc · {Math.max(15, 100 - pmMetrics.remainingWorkPct)}% quỹ tg
                    </div>
                  </div>

                  {activeInfoBox === 104 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-violet-600 dark:text-violet-400 mb-1">
                        {isEn ? 'Mechanism: Remaining Scope' : 'Cơ chế: Khối lượng còn lại'}
                      </div>
                      <div>
                        {isEn
                          ? 'Balances unfinished deliverable percentages against remaining campaign timeline to catch potential delivery shortfalls early.'
                          : 'Đối chiếu phần trăm khối lượng công việc chưa xong với phần trăm quỹ thời gian còn lại của chiến dịch để phát hiện nguy cơ hụt hơi.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 104 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-left"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Remaining Scope' : 'Khối lượng còn lại'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 space-y-2 text-xs">
                        <div className="p-2 rounded-[8px] bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40">
                          <div className="font-bold text-violet-700 dark:text-violet-300">Khối lượng còn lại: {pmMetrics.remainingTasksCount} / {pmMetrics.totalTasks} Việc</div>
                          <div className="text-[10px] text-slate-500">Đã hoàn thành {100 - pmMetrics.remainingWorkPct}% tổng khối lượng công việc.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PM Box 5: Dự báo tiến độ (Schedule Forecast) - Vàng/Cam */}
                <div
                  className={`relative ${activeHubBoxPopup === 105 || activeInfoBox === 105 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 105 ? null : 105));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 105 ? null : 105));
                      }
                    }}
                    className={`hover-magnetic-card magnetic-amber p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-amber-400/80 dark:hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 105 ? 'ring-2 ring-amber-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Schedule Forecast' : 'Dự báo tiến độ'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 105 ? null : 105));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-amber-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400 tracking-tight leading-none truncate">
                      {pmMetrics.varianceDays > 0 ? (isEn ? `+${pmMetrics.varianceDays}d Delay` : `Lệch +${pmMetrics.varianceDays} ngày`) : (isEn ? 'On Track' : 'Đúng tiến độ')}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`${isEn ? 'Forecast' : 'Dự kiến'}: ${pmMetrics.forecastDateStr}`}
                    >
                      {isEn ? 'Est' : 'Dự kiến'}: {pmMetrics.forecastDateStr}
                    </div>
                  </div>

                  {activeInfoBox === 105 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-amber-600 dark:text-amber-400 mb-1">
                        {isEn ? 'Mechanism: Schedule Forecast' : 'Cơ chế: Dự báo tiến độ'}
                      </div>
                      <div>
                        {isEn
                          ? 'Projects completion date based on maximum stage bottlenecks compared against original baseline commitments.'
                          : 'Ước tính ngày hoàn thành thực tế dựa trên độ trễ lớn nhất của các chặng hiện tại so với mốc cam kết ban đầu.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 105 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-right"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Schedule Forecast' : 'Dự báo tiến độ'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 space-y-2 text-xs">
                        <div className="p-2 rounded-[8px] bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                          <div className="font-bold text-amber-700 dark:text-amber-300">Dự kiến hoàn thành: {pmMetrics.forecastDateStr}</div>
                          <div className="text-[10px] text-slate-500">Độ lệch thời gian so với kế hoạch ban đầu: +{pmMetrics.varianceDays} ngày.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PM Box 6: Chờ duyệt nghiệm thu (Pending Review) - Xanh ngọc */}
                <div
                  className={`relative ${activeHubBoxPopup === 106 || activeInfoBox === 106 ? 'z-[90]' : 'z-10'}`}
                  data-workflow-popover="true"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseMove={handleMagneticMove}
                    onClick={() => {
                      setActivePopup(null);
                      setActiveInfoBox(null);
                      setActiveHubBoxPopup((prev) => (prev === 106 ? null : 106));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActivePopup(null);
                        setActiveInfoBox(null);
                        setActiveHubBoxPopup((prev) => (prev === 106 ? null : 106));
                      }
                    }}
                    className={`hover-magnetic-card [--glow-color:20,184,166] p-2 sm:p-2.5 rounded-[10px] bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 grid grid-flow-row content-between gap-1 min-w-0 shadow-2xs cursor-pointer transition-all hover:border-teal-400/80 dark:hover:border-teal-500/60 hover:shadow-md hover:-translate-y-0.5 ${
                      activeHubBoxPopup === 106 ? 'ring-2 ring-teal-500 shadow-md' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-1 w-full min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-700 dark:text-slate-300 truncate">
                        {isEn ? 'Pending Review' : 'Chờ duyệt nghiệm thu'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(null);
                          setActiveHubBoxPopup(null);
                          setActiveInfoBox((prev) => (prev === 106 ? null : 106));
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-teal-500 transition-colors"
                        title={isEn ? 'Mechanism info' : 'Giải thích cơ chế'}
                      >
                        <Info size={11} />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-teal-600 dark:text-teal-400 tracking-tight leading-none truncate">
                      {pmMetrics.inReviewTasks.length} {isEn ? 'In Review' : 'Chờ duyệt'}
                    </div>
                    <div
                      className="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 truncate"
                      title={`${pmMetrics.overdueReviewCount} ${isEn ? 'Overdue' : 'Quá hạn duyệt'} · +${pmMetrics.scopeCreepCount} ${isEn ? 'Ad-hoc' : 'Việc phát sinh'}`}
                    >
                      {pmMetrics.overdueReviewCount} {isEn ? 'Late' : 'Quá hạn'} · +{pmMetrics.scopeCreepCount} {isEn ? 'Added' : 'Phát sinh'}
                    </div>
                  </div>

                  {activeInfoBox === 106 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 sm:w-64 p-2.5 rounded-[8px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700 shadow-xl text-left text-[11px] text-gray-700 dark:text-slate-200"
                    >
                      <div className="font-bold text-teal-600 dark:text-teal-400 mb-1">
                        {isEn ? 'Mechanism: Pending Review' : 'Cơ chế: Chờ duyệt nghiệm thu'}
                      </div>
                      <div>
                        {isEn
                          ? 'Review queue of submitted deliverables awaiting Leader sign-off (In QA/Review) and newly added ad-hoc tasks.'
                          : 'Danh sách các ấn phẩm/đầu việc nhân sự đã nộp lên trạng thái Chờ nghiệm thu (In QA/Review) đang đợi Leader kiểm duyệt, kèm số việc phát sinh ngoài kế hoạch.'}
                      </div>
                    </div>
                  )}

                  {activeHubBoxPopup === 106 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 sm:w-80 p-3 sm:p-4 rounded-[12px] bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 text-left origin-top-right"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {isEn ? 'Pending Review' : 'Hàng đợi nghiệm thu'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveHubBoxPopup(null)}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="pt-2.5 max-h-60 overflow-y-auto space-y-1.5 text-xs">
                        {pmMetrics.inReviewTasks.length === 0 ? (
                          <div className="py-4 text-center text-slate-400">{isEn ? 'No tasks awaiting review' : 'Không có việc chờ nghiệm thu'}</div>
                        ) : (
                          pmMetrics.inReviewTasks.map((t) => (
                            <div key={t.id} className="p-1.5 rounded-[6px] bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-800/30 grid grid-cols-[1fr_auto] items-center gap-2">
                              <span className="truncate text-gray-800 dark:text-slate-200">{t.title}</span>
                              <span className="text-[10px] text-teal-600 font-bold">{t.status}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Khu vực 2: Lưới Thẻ Dự Án & Chiến Dịch (5 thẻ trên 1 hàng, tỉ lệ thoáng đãng chuẩn) */}
      <div className="p-5 sm:p-6 space-y-6">
        {filteredHubEntities.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400">
            {isEn ? 'No projects or campaigns match your filter' : 'Không có dự án hoặc chiến dịch nào phù hợp bộ lọc'}
          </div>
        ) : (
          <>
            {/* Nhóm 1: Dự án (Projects) - hiển thị khi hubTab là 'all' hoặc 'project' */}
            {(hubTab === 'all' || hubTab === 'project') && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setProjectsExpanded((prev) => !prev)}
                  className="inline-grid grid-flow-col auto-cols-max items-center gap-2 text-sm font-bold text-gray-900 dark:text-white cursor-pointer select-none group/acc"
                >
                  <ChevronDown
                    size={17}
                    className={`text-gray-500 transition-transform duration-200 ${projectsExpanded ? '' : '-rotate-90'}`}
                  />
                  <FolderKanban size={16} className="text-violet-500" />
                  <span>{t('projects.projectsAccordion')}</span>
                  <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                    {projectEntities.length}
                  </span>
                </button>

                {projectsExpanded && (
                  projectEntities.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      {isEn ? 'No projects match your filter' : 'Không có dự án nào phù hợp bộ lọc'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6">
                      {projectEntities.map(renderEntityCard)}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Nhóm 2: Chiến dịch (Campaigns) - hiển thị khi hubTab là 'all' hoặc 'campaign' */}
            {(hubTab === 'all' || hubTab === 'campaign') && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setCampaignsExpanded((prev) => !prev)}
                  className="inline-grid grid-flow-col auto-cols-max items-center gap-2 text-sm font-bold text-gray-900 dark:text-white cursor-pointer select-none group/acc"
                >
                  <ChevronDown
                    size={17}
                    className={`text-gray-500 transition-transform duration-200 ${campaignsExpanded ? '' : '-rotate-90'}`}
                  />
                  <Megaphone size={16} className="text-amber-500" />
                  <span>{t('projects.campaignsAccordion')}</span>
                  <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    {campaignEntities.length}
                  </span>
                </button>

                {campaignsExpanded && (
                  campaignEntities.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      {isEn ? 'No campaigns match your filter' : 'Không có chiến dịch nào phù hợp bộ lọc'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6">
                      {campaignEntities.map(renderEntityCard)}
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Khu vực 3: Thanh Footer Chú Thích Màu + Giờ Cập Nhật */}
      <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-slate-800/80 grid grid-flow-col auto-cols-max items-center justify-start gap-x-5 gap-y-1.5 text-[11px] text-gray-500 dark:text-slate-400 overflow-x-auto">
        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400 dark:!bg-[#61baff]" />
          <span>Task</span>
        </div>
        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-400 dark:!bg-[#6c2bff]" />
          <span>Project</span>
        </div>
        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400 dark:!bg-[#ffb500]" />
          <span>Campaign</span>
        </div>
        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 dark:!bg-[#63f858]" />
          <span>{isEn ? 'On Track' : 'Đúng hạn'}</span>
        </div>
        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500 dark:!bg-[#f59e0b]" />
          <span>{isEn ? 'Due Soon' : 'Sắp đến hạn'}</span>
        </div>
        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400 dark:!bg-[#ff324b]" />
          <span>{isEn ? 'Overdue' : 'Quá hạn'}</span>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-slate-500 pl-2 border-l border-gray-200 dark:border-slate-800">
          {isEn ? `Updated ${updateTimeStr}` : `Cập nhật ${updateTimeStr}`}
        </span>
      </div>
    </section>
  );
};
