import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  X,
  FolderKanban,
  Megaphone,
  CheckSquare,
  Users,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  WORKFLOW_STATUS_CONFIG,
  WORKFLOW_STATUS_LABELS_VI,
  WORKFLOW_STATUS_LABELS_EN,
  MARKETING_STATUS_GUIDES_VI,
  MARKETING_STATUS_GUIDES_EN,
  WorkflowHexagonIcon,
  type WorkflowTaskStatus,
} from '../features/tasks/WorkflowStatusPicker';

interface SidebarMechanismModalProps {
  open: boolean;
  onClose: () => void;
  lang?: string;
  inline?: boolean;
}

type PhaseStateKey = 'planning' | 'in_progress' | 'pending' | 'completed' | 'overdue';

const TASK_STATUS_ITEMS: Array<{
  status: WorkflowTaskStatus;
  descVi: string;
  descEn: string;
}> = [
  { status: 'backlog', descVi: 'Ý tưởng / chờ duyệt', descEn: 'Idea / queue' },
  { status: 'planned', descVi: 'Đã chốt lịch & PIC', descEn: 'Scheduled & assigned' },
  { status: 'scoping', descVi: 'Chốt brief & phạm vi', descEn: 'Brief & scope' },
  { status: 'in_progress', descVi: 'Đang sản xuất / chạy', descEn: 'Active execution' },
  { status: 'in_qa', descVi: 'Chờ Leader duyệt', descEn: 'Pending Leader QA' },
  { status: 'completed', descVi: 'Nghiệm thu xong', descEn: 'Approved & done' },
  { status: 'canceled', descVi: 'Tạm dừng / hủy', descEn: 'Paused / canceled' },
];

export const SidebarMechanismModal: React.FC<SidebarMechanismModalProps> = ({
  open,
  onClose,
  lang = 'vi',
  inline = false,
}) => {
  const isEn = lang === 'en';

  const [activePhase, setActivePhase] = useState<PhaseStateKey | null>(null);
  const [activeTaskStatus, setActiveTaskStatus] = useState<WorkflowTaskStatus | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<'project' | 'campaign' | 'task' | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'leader' | 'staff' | null>(null);

  // Quản lý thu gọn / mở rộng từng chương bằng Dropdown Chevron - Mặc định đóng hết cả 3
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  const toggleSectionCollapse = (sec: number) => {
    setCollapsedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  useEffect(() => {
    if (!open) return;
    // Mỗi lần mở modal thì mặc định đóng hết cả 3 dropdown để user bấm chọn mục muốn xem
    setCollapsedSections({ 1: true, 2: true, 3: true });
    setActivePhase(null);
    setActiveTaskStatus(null);
    setSelectedEntity(null);
    setSelectedRole(null);

    if (inline) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, inline]);

  if (!open || (!inline && typeof document === 'undefined')) return null;

  const statusGuides = isEn ? MARKETING_STATUS_GUIDES_EN : MARKETING_STATUS_GUIDES_VI;
  const currentGuide = activeTaskStatus
    ? statusGuides.find((g) => g.status === activeTaskStatus)
    : null;

  const PHASE_STATUS_ITEMS = [
    {
      key: 'planning' as const,
      labelVi: 'Kế hoạch',
      labelEn: 'Planning',
      subVi: 'Chuẩn bị',
      subEn: 'Preparation',
      colorClasses: 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      activeRing: 'ring-2 ring-slate-500 shadow-sm border-slate-400 dark:border-slate-500',
      relatedTaskStatuses: ['backlog', 'planned'] as WorkflowTaskStatus[],
    },
    {
      key: 'in_progress' as const,
      labelVi: 'Đang chạy',
      labelEn: 'In Progress',
      subVi: 'Đang làm',
      subEn: 'Active work',
      colorClasses: 'bg-sky-100/90 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800/80',
      activeRing: 'ring-2 ring-sky-500 shadow-sm border-sky-400 dark:border-sky-500',
      relatedTaskStatuses: ['scoping', 'in_progress'] as WorkflowTaskStatus[],
    },
    {
      key: 'pending' as const,
      labelVi: 'Chờ duyệt',
      labelEn: 'Pending',
      subVi: 'Chờ duyệt',
      subEn: 'Review stage',
      colorClasses: 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/80',
      activeRing: 'ring-2 ring-amber-500 shadow-sm border-amber-400 dark:border-amber-500',
      relatedTaskStatuses: ['in_qa'] as WorkflowTaskStatus[],
    },
    {
      key: 'completed' as const,
      labelVi: 'Hoàn thành',
      labelEn: 'Completed',
      subVi: 'Đạt chuẩn',
      subEn: 'Passed',
      colorClasses: 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80',
      activeRing: 'ring-2 ring-emerald-500 shadow-sm border-emerald-400 dark:border-emerald-500',
      relatedTaskStatuses: ['completed'] as WorkflowTaskStatus[],
    },
    {
      key: 'overdue' as const,
      labelVi: 'Quá hạn / Nghẽn',
      labelEn: 'Overdue / Blocked',
      subVi: 'Cần xử lý',
      subEn: 'Action needed',
      colorClasses: 'bg-rose-100/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/80',
      activeRing: 'ring-2 ring-rose-500 shadow-sm border-rose-400 dark:border-rose-500',
      relatedTaskStatuses: ['canceled'] as WorkflowTaskStatus[],
    },
  ];

  const activePhaseConfig = PHASE_STATUS_ITEMS.find((p) => p.key === activePhase);

  // 3 Thực thể quản lý - Hiển thị tĩnh, không tương tác click
  const ENTITY_ITEMS = [
    {
      type: 'project' as const,
      icon: FolderKanban,
      label: 'Project',
      colorTagVi: 'Tím · Violet',
      colorTagEn: 'Violet',
      descVi: 'Dự án có lộ trình rõ, tạo sản phẩm hoặc hệ thống cụ thể.',
      descEn: 'Projects with a clear roadmap, creating a specific product or system.',
      border: 'border-violet-200/90 dark:border-violet-800/60',
      bg: 'bg-violet-50/70 dark:bg-violet-950/30',
      badgeBg: 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      type: 'campaign' as const,
      icon: Megaphone,
      label: 'Campaign',
      colorTagVi: 'Vàng cam · Amber',
      colorTagEn: 'Amber',
      descVi: 'Chiến dịch nhiều đợt, tối ưu liên tục và tổng kết hiệu quả.',
      descEn: 'Multi-wave campaign with ongoing optimization & outcome review.',
      border: 'border-amber-200/90 dark:border-amber-800/60',
      bg: 'bg-amber-50/70 dark:bg-amber-950/30',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      type: 'task' as const,
      icon: CheckSquare,
      label: 'Task',
      colorTagVi: 'Xanh dương · Sky',
      colorTagEn: 'Sky',
      descVi: 'Đầu việc cụ thể được giao trực tiếp tới từng nhân sự thực thi.',
      descEn: 'Specific actionable work assigned directly to each staff member.',
      border: 'border-sky-200/90 dark:border-sky-800/60',
      bg: 'bg-sky-50/70 dark:bg-sky-950/30',
      badgeBg: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700',
      iconColor: 'text-sky-600 dark:text-sky-400',
    },
  ];

  // Khớp chuẩn màu và nhãn cấp bậc từ MemberManagement.tsx - Hiển thị tĩnh, không click
  const ROLE_ITEMS = [
    {
      role: 'admin' as const,
      label: 'ADMIN',
      badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
      scopeVi: 'Toàn hệ thống & các phòng ban',
      scopeEn: 'Entire system & all departments',
      permVi: 'Quản lý tài khoản, cấu hình toàn quyền hệ thống, xuất báo cáo tổng.',
      permEn: 'Account management, full system configuration & executive audit reports.',
      highlightVi: 'Toàn quyền cấu hình',
      highlightEn: 'Full system control',
    },
    {
      role: 'manager' as const,
      label: 'MANAGER',
      badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
      scopeVi: 'Tất cả phòng ban toàn công ty',
      scopeEn: 'All departments across company',
      permVi: 'Tạo/duyệt Project, Campaign, Phase, điều phối liên phòng & xem báo cáo tổng.',
      permEn: 'Create/approve Projects, Campaigns, Phases & view cross-team executive reports.',
      highlightVi: 'Điều phối đa phòng ban',
      highlightEn: 'Cross-team coordinator',
    },
    {
      role: 'leader' as const,
      label: 'LEADER',
      badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30 shadow-xs font-bold',
      scopeVi: 'Toàn đội trong phòng + việc được mời',
      scopeEn: 'Own department team + personally invited items',
      permVi: 'Tạo/giao việc, phân bổ nhân sự, duyệt Phase & Task (In QA → Completed) trong đội.',
      permEn: 'Create/assign work, allocate capacity, approve Phases & Tasks (In QA → Done).',
      highlightVi: 'Quyết định duyệt trong đội',
      highlightEn: 'Department QA approver',
    },
    {
      role: 'staff' as const,
      label: 'MEMBER (Staff)',
      badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/60',
      scopeVi: 'Việc được giao / tạo / tham gia',
      scopeEn: 'Assigned, created or participating work',
      permVi: 'Thực thi công việc, cập nhật tiến độ, nộp bản nháp (In QA) & trao đổi feedback.',
      permEn: 'Execute work, update status, submit deliverables to In QA & exchange feedback.',
      highlightVi: 'Thực thi & nộp duyệt',
      highlightEn: 'Direct executor',
    },
  ];

  const panelInner = (
    <>
        {/* Header Modal */}
        <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-3 pb-3 border-b border-gray-200/80 dark:border-slate-800">
          <div className="grid grid-flow-col auto-cols-max items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-sky-400 grid place-items-center shadow-xs">
              <BookOpen size={17} />
            </div>
            <div>
              <h2
                id="mechanism-modal-title"
                className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none"
              >
                {isEn ? 'Read me / Dashboard Mechanism' : 'Read me / Cơ chế vận hành Dashboard'}
              </h2>
              <p className="text-[11.5px] text-gray-500 dark:text-slate-400 mt-1">
                {isEn ? 'K COFFEE Work & Progress Guide' : 'Quy tắc quản lý tiến độ & phân quyền K COFFEE'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? 'Close' : 'Đóng'}
            className="p-1.5 rounded-[7px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* ============================================================
            CHƯƠNG 1: CƠ CHẾ PHÂN LOẠI & QUY TRÌNH TRẠNG THÁI
           ============================================================ */}
        <div className="p-4 sm:p-5 rounded-[14px] bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-3.5">
          {/* Header Chương 1 */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 pb-2 border-b border-slate-200/70 dark:border-slate-800/70">
            <span className="px-2.5 py-0.5 rounded-[6px] text-[11px] font-extrabold bg-[#002e6d] dark:bg-sky-600 text-white shadow-xs tracking-wide">
              01
            </span>
            <h3 className="font-bold text-[13.5px] text-gray-900 dark:text-slate-100 tracking-tight">
              {isEn ? 'Mechanism & Identity Colors' : 'Cơ chế và màu nhận diện'}
            </h3>
            <button
              type="button"
              onClick={() => toggleSectionCollapse(1)}
              title={collapsedSections[1] ? (isEn ? 'Expand' : 'Mở rộng') : (isEn ? 'Collapse' : 'Thu gọn')}
              className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {collapsedSections[1] ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>

          {!collapsedSections[1] && (
            <div className="space-y-4">
              <p className="text-[11.5px] text-gray-600 dark:text-slate-300 leading-relaxed">
                {isEn
                  ? 'Dashboard focuses on Work Assignment, Task / Project / Campaign management and tracking by department.'
                  : 'Dashboard hiện tập trung vào Giao việc, quản lý Task / Project / Campaign và tracking đầu việc theo từng phòng ban.'}
              </p>

              {/* Sub-block A: Thực thể quản lý - Có thể click để xem focus */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_auto] items-center justify-between">
                  <div className="text-[10.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {isEn ? 'Management Entities' : 'Loại thực thể quản lý'}
                  </div>
                  {selectedEntity && (
                    <button
                      type="button"
                      onClick={() => setSelectedEntity(null)}
                      className="text-[10.5px] text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      {isEn ? 'Reset selection' : 'Bỏ chọn'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ENTITY_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedEntity === item.type;

                    return (
                      <div
                        key={item.type}
                        onClick={() => setSelectedEntity(isSelected ? null : item.type)}
                        className={`p-3 rounded-[10px] border text-left grid content-between gap-2 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${item.bg} ${item.border} ${
                          isSelected ? 'ring-2 ring-blue-500 shadow-md scale-[1.01]' : 'hover:border-slate-400 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="w-fit justify-self-start inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] text-[11px] font-bold shadow-2xs ${item.badgeBg}">
                          <Icon size={14} className={item.iconColor} />
                          <span>{item.label}</span>
                        </div>
                        <p className="text-[11px] leading-snug text-gray-700 dark:text-slate-300">
                          {isEn ? item.descEn : item.descVi}
                        </p>
                        <div className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 pt-0.5">
                          {isEn ? item.colorTagEn : item.colorTagVi}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-block B: Trạng thái Phase - Có thể tương tác click để lọc liên kết */}
              <div className="space-y-1.5 pt-1">
                <div className="grid grid-cols-[1fr_auto] items-center justify-between">
                  <span className="text-[10.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {isEn ? 'Phase Statuses' : 'Trạng thái Phase'}
                  </span>
                  {activePhase && (
                    <button
                      type="button"
                      onClick={() => setActivePhase(null)}
                      className="text-[10.5px] text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      {isEn ? 'Clear filter' : 'Bỏ lọc Phase'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center">
                  {PHASE_STATUS_ITEMS.map((item) => {
                    const isSelected = activePhase === item.key;

                    return (
                      <div
                        key={item.key}
                        onClick={() => setActivePhase(isSelected ? null : item.key)}
                        className={`px-2 py-2 rounded-[8px] border font-semibold text-[11px] cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${item.colorClasses} ${
                          isSelected ? item.activeRing : 'hover:border-slate-400 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="block font-bold">{isEn ? item.labelEn : item.labelVi}</span>
                        <span className="text-[10px] opacity-75">{isEn ? item.subEn : item.subVi}</span>
                      </div>
                    );
                  })}
                </div>

                {activePhaseConfig && (
                  <div className="px-3 py-2 rounded-[8px] bg-blue-50/80 dark:bg-sky-950/50 border border-blue-200/80 dark:border-sky-800/70 text-[11px] text-gray-700 dark:text-slate-300 shadow-2xs">
                    <span className="font-bold text-[#002e6d] dark:text-sky-300">
                      {isEn ? 'Active Phase: ' : 'Phase đang chọn: '}
                      {isEn ? activePhaseConfig.labelEn : activePhaseConfig.labelVi}
                    </span>{' '}
                    —{' '}
                    {isEn
                      ? 'Highlights linked task statuses below.'
                      : 'Lọc sáng các trạng thái task tương ứng bên dưới.'}
                  </div>
                )}
              </div>

              {/* Sub-block C: Trạng thái Task trong Phase - Có thể tương tác click xem chi tiết */}
              <div className="space-y-1.5 pt-1">
                <div className="grid grid-cols-[1fr_auto] items-center justify-between">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 text-[10.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <Layers size={13} className="text-blue-600 dark:text-sky-400" />
                    <span>
                      {isEn ? 'Task Status Flow in Phase' : 'Trạng thái Task trong Phase'}
                    </span>
                  </div>
                  {activeTaskStatus && (
                    <button
                      type="button"
                      onClick={() => setActiveTaskStatus(null)}
                      className="text-[10.5px] text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      {isEn ? 'Reset detail' : 'Đóng giải thích'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {TASK_STATUS_ITEMS.map((item) => {
                    const cfg = WORKFLOW_STATUS_CONFIG[item.status];
                    const label = isEn
                      ? WORKFLOW_STATUS_LABELS_EN[item.status]
                      : WORKFLOW_STATUS_LABELS_VI[item.status];
                    const isCanceled = item.status === 'canceled';
                    const isSelected = activeTaskStatus === item.status;
                    const isLinkedToPhase = activePhaseConfig
                      ? activePhaseConfig.relatedTaskStatuses.includes(item.status)
                      : true;

                    return (
                      <div
                        key={item.status}
                        onClick={() => setActiveTaskStatus(isSelected ? null : item.status)}
                        className={`p-2.5 rounded-[8px] border text-left grid content-between gap-1 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${cfg.bgLight} ${cfg.bgDark} ${cfg.borderClass} ${
                          isCanceled ? 'col-span-2 sm:col-span-2' : ''
                        } ${isSelected ? 'ring-2 ring-blue-500 shadow-md border-blue-500' : 'hover:border-slate-400 dark:hover:border-slate-600'} ${
                          !isLinkedToPhase ? 'opacity-40 grayscale-[40%]' : 'opacity-100'
                        }`}
                      >
                        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                          <WorkflowHexagonIcon status={item.status} size={15} />
                          <span className={`font-bold text-[11px] leading-tight ${cfg.textColor}`}>
                            {label}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-gray-600 dark:text-slate-300 leading-snug">
                          {isEn ? item.descEn : item.descVi}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Chi tiết giải thích trạng thái đang chọn */}
                {currentGuide && (
                  <div className="p-3.5 rounded-[10px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-blue-200 dark:border-blue-900/80 shadow-md space-y-1.5 animate-in fade-in duration-150">
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 font-bold text-[12px] text-[#002e6d] dark:text-sky-300">
                      <WorkflowHexagonIcon status={currentGuide.status} size={16} />
                      <span>{currentGuide.marketingTitle}</span>
                    </div>
                    <p className="text-[11px] text-gray-700 dark:text-slate-300 leading-relaxed">
                      {currentGuide.shortDesc}
                    </p>
                    <div className="text-[10.5px] text-gray-500 dark:text-slate-400 pt-0.5">
                      <strong className="text-gray-700 dark:text-slate-300">
                        {isEn ? 'Rule: ' : 'Quy tắc: '}
                      </strong>
                      {currentGuide.usageRule}
                    </div>
                  </div>
                )}
              </div>

              {/* Dòng quy ước chung */}
              <div className="p-3 rounded-[10px] bg-blue-50/80 dark:bg-sky-950/40 border border-blue-200/80 dark:border-sky-800/60 text-[11px] text-gray-700 dark:text-slate-300 leading-relaxed shadow-2xs">
                <span className="font-bold text-[#002e6d] dark:text-sky-300">
                  {isEn ? 'Operational Rule: ' : 'Quy ước vận hành: '}
                </span>
                <span>
                  {isEn
                    ? 'Submit draft to In QA for Leader review before Completed • When all Phase tasks reach Completed → Phase is marked complete.'
                    : 'Nộp draft chuyển In QA để Leader duyệt trước khi sang Completed • Các task trong Phase đạt Completed → Phase hoàn thành.'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            CHƯƠNG 2: MA TRẬN PHÂN QUYỀN 4 CẤP BẬC
           ============================================================ */}
        <div className="p-4 sm:p-5 rounded-[14px] bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-3.5">
          {/* Header Chương 2 */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 pb-2 border-b border-slate-200/70 dark:border-slate-800/70">
            <span className="px-2.5 py-0.5 rounded-[6px] text-[11px] font-extrabold bg-[#002e6d] dark:bg-sky-600 text-white shadow-xs tracking-wide">
              02
            </span>
            <h3 className="font-bold text-[13.5px] text-gray-900 dark:text-slate-100 tracking-tight">
              {isEn ? 'Role Hierarchy & Authority Matrix' : 'Phân quyền các cấp bậc'}
            </h3>
            <button
              type="button"
              onClick={() => toggleSectionCollapse(2)}
              title={collapsedSections[2] ? (isEn ? 'Expand' : 'Mở rộng') : (isEn ? 'Collapse' : 'Thu gọn')}
              className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {collapsedSections[2] ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>

          {!collapsedSections[2] && (
            <div className="rounded-[10px] border border-gray-200/80 dark:border-slate-800 overflow-hidden bg-white/90 dark:bg-slate-900/90 shadow-xs">
              {/* Table Header */}
              <div className="grid grid-cols-[130px_1.1fr_1.3fr] items-center gap-2 px-3.5 py-2.5 bg-gray-100/90 dark:bg-slate-800/90 text-[11.5px] font-bold text-gray-700 dark:text-slate-300 border-b border-gray-200/80 dark:border-slate-800">
                <div>{isEn ? 'Rank' : 'Cấp bậc'}</div>
                <div>{isEn ? 'Read Scope' : 'Phạm vi nhìn thấy'}</div>
                <div>{isEn ? 'Primary Permissions' : 'Quyền thao tác chính'}</div>
              </div>

              {/* Table Rows - Có thể click để focus xem quyền */}
              <div className="divide-y divide-gray-100 dark:divide-slate-800/80 text-[11.5px] text-gray-700 dark:text-slate-300">
                {ROLE_ITEMS.map((item) => {
                  const isSelected = selectedRole === item.role;

                  return (
                    <div
                      key={item.role}
                      onClick={() => setSelectedRole(isSelected ? null : item.role)}
                      className={`grid grid-cols-[130px_1.1fr_1.3fr] items-center gap-2 px-3.5 py-3 cursor-pointer transition-all hover:bg-blue-50/50 dark:hover:bg-slate-800/60 ${
                        isSelected ? 'bg-blue-50/80 dark:bg-sky-950/40 border-l-4 border-l-blue-600 dark:border-l-sky-400 shadow-2xs' : ''
                      }`}
                    >
                      {/* Badge ôm text, sạch sẽ không icon */}
                      <div className={`w-fit justify-self-start inline-block px-2.5 py-1 rounded-[5px] text-[11px] font-extrabold tracking-tight border transition-transform hover:scale-105 ${item.badgeClass}`}>
                        <span>{item.label}</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-slate-200 leading-snug">
                        {isEn ? item.scopeEn : item.scopeVi}
                      </span>
                      <div className="grid content-center gap-0.5">
                        <span className="text-gray-600 dark:text-slate-400 leading-snug">
                          {isEn ? item.permEn : item.permVi}
                        </span>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-sky-400">
                          • {isEn ? item.highlightEn : item.highlightVi}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            CHƯƠNG 3: LÀM VIỆC LIÊN PHÒNG BAN & CƠ CHẾ PHASE
           ============================================================ */}
        <div className="p-4 sm:p-5 rounded-[14px] bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-3.5">
          {/* Header Chương 3 */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 pb-2 border-b border-slate-200/70 dark:border-slate-800/70">
            <span className="px-2.5 py-0.5 rounded-[6px] text-[11px] font-extrabold bg-[#002e6d] dark:bg-sky-600 text-white shadow-xs tracking-wide">
              03
            </span>
            <h3 className="font-bold text-[13.5px] text-gray-900 dark:text-slate-100 tracking-tight">
              {isEn ? 'Cross-Department Work & When to Use Phases' : 'Làm việc liên phòng ban & Cơ chế Phase'}
            </h3>
            <button
              type="button"
              onClick={() => toggleSectionCollapse(3)}
              title={collapsedSections[3] ? (isEn ? 'Expand' : 'Mở rộng') : (isEn ? 'Collapse' : 'Thu gọn')}
              className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {collapsedSections[3] ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>

          {!collapsedSections[3] && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
              {/* Card Trái: Phối hợp liên phòng ban */}
              <div className="p-4 rounded-[10px] border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md shadow-xs grid content-start gap-2.5 transition-all hover:shadow-md">
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 font-bold text-[12.5px] text-blue-900 dark:text-sky-300">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                    <Users size={16} className="text-blue-600 dark:text-sky-400" />
                    <span>{isEn ? 'Cross-Department Collaboration' : 'Phối hợp liên phòng ban'}</span>
                  </div>
                  {/* Pill ôm text */}
                  <span className="w-fit justify-self-end inline-block px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60">
                    Sub-PIC
                  </span>
                </div>
                <div className="text-[11.5px] text-gray-700 dark:text-slate-300 leading-relaxed grid gap-1">
                  <p>
                    {isEn
                      ? 'Assign Sub-PIC or invite staff from other departments directly into the specific Phase or Task.'
                      : 'Gắn Sub-PIC hoặc mời cá nhân từ phòng khác vào đúng Phase/Task cần phối hợp.'}
                  </p>
                  <p>
                    {isEn
                      ? 'Permission strictly opens for invited items and never leaks other department work.'
                      : 'Quyền chỉ mở tại phần được mời, không lan sang việc khác của phòng bạn.'}
                  </p>
                </div>
              </div>

              {/* Card Phải: Khi nào bật Phase? */}
              <div className="p-4 rounded-[10px] border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md shadow-xs grid content-start gap-2.5 transition-all hover:shadow-md">
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 font-bold text-[12.5px] text-amber-900 dark:text-amber-300">
                  <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                    <Layers size={16} className="text-amber-600 dark:text-amber-400" />
                    <span>{isEn ? 'When to Enable Phases?' : 'Khi nào bật Phase?'}</span>
                  </div>
                  {/* Pill ôm text */}
                  <span className="w-fit justify-self-end inline-block px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                    Checkpoint
                  </span>
                </div>
                <div className="text-[11.5px] text-gray-700 dark:text-slate-300 leading-relaxed grid gap-1">
                  <p>
                    {isEn
                      ? 'Small scope of 3–5 items → manage tasks directly for speed.'
                      : 'Nhóm nhỏ 3–5 việc → quản lý Task cho nhanh.'}
                  </p>
                  <p>
                    {isEn
                      ? 'Multi-stage work, multiple departments or checkpoint approvals → enable Phases to track each stage tightly.'
                      : 'Việc nhiều chặng, nhiều phòng ban hoặc có bước duyệt checkpoint → bật Phase để tracking từng chặng.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
    </>
  );

  if (inline) {
    return (
      <section
        role="region"
        aria-labelledby="mechanism-modal-title"
        className="w-full p-4 sm:p-6 rounded-[14px] card-hub border border-white/90 dark:border-slate-800/80 text-xs space-y-4 animate-in fade-in duration-200"
      >
        {panelInner}
      </section>
    );
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mechanism-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-[10050] bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm grid place-items-center p-3 sm:p-5 overflow-y-auto"
    >
      <div
        data-modal-surface="true"
        onClick={(e) => e.stopPropagation()}
        className="modal-liquid-glass relative w-[min(820px,calc(100vw-24px))] max-h-[88vh] overflow-y-auto custom-scrollbar p-4 sm:p-6 rounded-[18px] border border-white/90 dark:border-slate-700/80 text-xs space-y-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {panelInner}
      </div>
    </div>,
    document.body
  );
};
