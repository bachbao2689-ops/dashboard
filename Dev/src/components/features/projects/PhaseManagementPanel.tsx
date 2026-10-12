import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, ArrowRight, Plus, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface Phase {
  id: number;
  name: string;
  desc: string;
  status: 'completed' | 'active' | 'locked';
}

interface GateCriterion {
  id: string;
  label: string;
  weight: number;
  checked: boolean;
}

interface PhaseManagementPanelProps {
  entityType: 'project' | 'campaign';
  entityId: string;
  entityName: string;
  subtasks: any[];
  canEdit?: boolean;
}

const DEFAULT_CAMPAIGN_PHASES: Phase[] = [
  { id: 1, name: '1. Khởi tạo & Ý tưởng', desc: 'Brief, Mục tiêu & Master Concept', status: 'completed' },
  { id: 2, name: '2. Kế hoạch & Dự toán', desc: 'Timeline, PIC & Duyệt ngân sách', status: 'active' },
  { id: 3, name: '3. Sản xuất Ấn phẩm', desc: 'Visual, POSM, Video & Content', status: 'locked' },
  { id: 4, name: '4. Triển khai & Chạy Ads', desc: 'On-air chiến dịch & Bán hàng', status: 'locked' },
  { id: 5, name: '5. Tổng kết & Đo lường', desc: 'Báo cáo KPI & Nghiệm thu', status: 'locked' }
];

const DEFAULT_PROJECT_PHASES: Phase[] = [
  { id: 1, name: '1. Khảo sát & Định hướng', desc: 'Xác định Scope & Yêu cầu cốt lõi', status: 'completed' },
  { id: 2, name: '2. Lập kế hoạch & Thiết kế', desc: 'Phác thảo UI/UX & Duyệt phương án', status: 'active' },
  { id: 3, name: '3. Triển khai & Thực hiện', desc: 'Sản xuất, lập trình & đóng gói', status: 'locked' },
  { id: 4, name: '4. Kiểm thử & Bàn giao', desc: 'QA, Nghiệm thu & Go-live', status: 'locked' }
];

const DEFAULT_GATE_CRITERIA_MAP: Record<string, GateCriterion[]> = {
  // Campaign Gates
  'campaign_1': [
    { id: 'c1_1', label: 'Brief mục tiêu chiến dịch đã được thống nhất', weight: 40, checked: true },
    { id: 'c1_2', label: 'Master concept được Brand Manager phê duyệt', weight: 35, checked: true },
    { id: 'c1_3', label: 'Đã phân bổ người phụ trách chính (Lead/PIC)', weight: 25, checked: true },
  ],
  'campaign_2': [
    { id: 'c2_1', label: 'Dự toán ngân sách chi tiết đã được duyệt (Budget Sign-off)', weight: 35, checked: true },
    { id: 'c2_2', label: 'Đã chốt Master Timeline và hạn bàn giao các team', weight: 25, checked: true },
    { id: 'c2_3', label: 'Tỷ lệ hoàn thành subtasks chặng đạt trên 70%', weight: 25, checked: true },
    { id: 'c2_4', label: 'Không có task trọng yếu bị quá hạn (No Overdue)', weight: 15, checked: false },
  ],
  'campaign_3': [
    { id: 'c3_1', label: 'Toàn bộ Key Visual & POSM đạt tiêu chuẩn duyệt mẫu', weight: 40, checked: false },
    { id: 'c3_2', label: 'Nội dung bài viết & video sẵn sàng lên sóng', weight: 30, checked: false },
    { id: 'c3_3', label: 'Thiết bị & vật phẩm sự kiện đã được kiểm kê đầy đủ', weight: 30, checked: false },
  ],
  'campaign_4': [
    { id: 'c4_1', label: 'Tiến độ phân bổ ngân sách quảng cáo đúng nhịp', weight: 40, checked: false },
    { id: 'c4_2', label: 'Doanh số và tương tác đạt tối thiểu 70% mốc kỳ vọng', weight: 35, checked: false },
    { id: 'c4_3', label: 'Không có sự cố truyền thông hay khiếu nại', weight: 25, checked: false },
  ],
  // Project Gates
  'project_1': [
    { id: 'p1_1', label: 'Phạm vi công việc (Scope) được các bên ký xác nhận', weight: 40, checked: true },
    { id: 'p1_2', label: 'Đã làm rõ danh sách các tính năng/hạng mục cốt lõi', weight: 35, checked: true },
    { id: 'p1_3', label: 'Đã chỉ định Tech/Design Lead phụ trách', weight: 25, checked: true },
  ],
  'project_2': [
    { id: 'p2_1', label: 'Bản vẽ Wireframe & Prototype được duyệt hoàn chỉnh', weight: 40, checked: true },
    { id: 'p2_2', label: 'Lộ trình phân bổ Task chi tiết cho từng thành viên', weight: 35, checked: true },
    { id: 'p2_3', label: 'Tiến độ Subtasks giai đoạn đạt trên 70%', weight: 25, checked: false },
  ],
  'project_3': [
    { id: 'p3_1', label: 'Toàn bộ hạng mục chức năng hoàn thành đầy đủ', weight: 45, checked: false },
    { id: 'p3_2', label: 'Vượt qua bài test kiểm thử chất lượng (QA/QC)', weight: 35, checked: false },
    { id: 'p3_3', label: 'Tài liệu hướng dẫn sử dụng đã hoàn tất', weight: 20, checked: false },
  ],
};

export const PhaseManagementPanel: React.FC<PhaseManagementPanelProps> = ({
  entityType,
  entityId,
  subtasks,
  canEdit = true,
}) => {
  const storageKey = `phase_state_${entityType}_${entityId}`;

  // Initialize Phases State from localStorage or default template
  const [phases, setPhases] = useState<Phase[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_phases`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return entityType === 'campaign' ? DEFAULT_CAMPAIGN_PHASES : DEFAULT_PROJECT_PHASES;
  });

  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(() => {
    const activeIdx = phases.findIndex(p => p.status === 'active');
    return activeIdx >= 0 ? activeIdx : 0;
  });

  const currentPhase = phases[activePhaseIndex] || phases[0];

  // Initialize Criteria from localStorage or map
  const criteriaKey = `${storageKey}_crit_${currentPhase.id}`;
  const [criteria, setCriteria] = useState<GateCriterion[]>(() => {
    try {
      const saved = localStorage.getItem(criteriaKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaultList = DEFAULT_GATE_CRITERIA_MAP[`${entityType}_${currentPhase.id}`];
    return defaultList || [
      { id: `crit_${currentPhase.id}_1`, label: 'Hoàn thành các mốc cam kết chính của giai đoạn', weight: 50, checked: true },
      { id: `crit_${currentPhase.id}_2`, label: 'Được phê duyệt bởi Quản lý/Leader', weight: 50, checked: false },
    ];
  });

  const [newCriterionLabel, setNewCriterionLabel] = useState('');
  const [showAddCriterion, setShowAddCriterion] = useState(false);

  // Sync state changes to storage
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_phases`, JSON.stringify(phases));
    } catch {}
  }, [phases, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(criteriaKey, JSON.stringify(criteria));
    } catch {}
  }, [criteria, criteriaKey]);

  // When switching phases, reload criteria for that phase
  useEffect(() => {
    const key = `${storageKey}_crit_${currentPhase.id}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setCriteria(JSON.parse(saved));
        return;
      }
    } catch {}
    const defaultList = DEFAULT_GATE_CRITERIA_MAP[`${entityType}_${currentPhase.id}`];
    setCriteria(defaultList || [
      { id: `crit_${currentPhase.id}_1`, label: 'Hoàn thành các mốc cam kết chính của giai đoạn', weight: 50, checked: true },
      { id: `crit_${currentPhase.id}_2`, label: 'Được phê duyệt bởi Quản lý/Leader', weight: 50, checked: false },
    ]);
  }, [activePhaseIndex, currentPhase.id, entityType, storageKey]);

  // Calculate Realtime Task Progress for current phase
  const isDone = (status?: string | null) => ['done', 'completed', 'complete'].includes((status || '').toLowerCase());
  
  // Distribute subtasks across phases or calculate aggregate
  const completedSubtasksCount = subtasks.filter(s => isDone(s.status)).length;
  const totalSubtasksCount = subtasks.length;
  
  const phaseTaskProgressPct = useMemo(() => {
    if (currentPhase.status === 'completed') return 100;
    if (totalSubtasksCount === 0) return 75; // Default healthy baseline
    return Math.round((completedSubtasksCount / totalSubtasksCount) * 100);
  }, [completedSubtasksCount, totalSubtasksCount, currentPhase.status]);

  // Calculate Realtime Gate Pass Likelihood (%)
  const gatePassChancePct = useMemo(() => {
    if (currentPhase.status === 'completed') return 100;
    
    let totalScore = 0;
    let totalPossibleWeight = 0;

    criteria.forEach(c => {
      totalPossibleWeight += c.weight;
      if (c.checked) totalScore += c.weight;
    });

    if (totalPossibleWeight === 0) return 70;
    const criteriaScore = Math.round((totalScore / totalPossibleWeight) * 100);

    // Blended Gate Score: 60% Gate Criteria + 40% Task Execution
    const blended = Math.round(criteriaScore * 0.6 + phaseTaskProgressPct * 0.4);
    return Math.min(100, Math.max(0, blended));
  }, [criteria, phaseTaskProgressPct, currentPhase.status]);

  // Toggle Criterion
  const toggleCriterion = (id: string) => {
    if (!canEdit) return;
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  // Add Custom Criterion
  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriterionLabel.trim()) return;
    const newCrit: GateCriterion = {
      id: `custom_${Date.now()}`,
      label: newCriterionLabel.trim(),
      weight: 20,
      checked: false,
    };
    setCriteria(prev => [...prev, newCrit]);
    setNewCriterionLabel('');
    setShowAddCriterion(false);
    toast.success('Đã thêm tiêu chí thẩm định');
  };

  // Advance Phase (Gate Approval)
  const handleAdvancePhase = () => {
    if (activePhaseIndex >= phases.length - 1) {
      toast.success('Dự án đã ở giai đoạn tổng kết cuối cùng!');
      return;
    }

    const nextIndex = activePhaseIndex + 1;
    const updatedPhases = phases.map((p, idx) => {
      if (idx === activePhaseIndex) return { ...p, status: 'completed' as const };
      if (idx === nextIndex) return { ...p, status: 'active' as const };
      return p;
    });

    setPhases(updatedPhases);
    setActivePhaseIndex(nextIndex);
    toast.success(`🎉 Đã duyệt chuyển sang ${phases[nextIndex].name}!`);
  };

  // Get status color styling for gate
  const getGateStatusConfig = (chance: number) => {
    if (chance >= 80) {
      return {
        badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        text: '🟢 Đủ điều kiện (>80%)',
        barColor: 'bg-emerald-500',
        advice: '✓ Mọi tiêu chí an toàn đã đạt chuẩn. Bạn có thể bấm phê duyệt để mở khóa Phase kế tiếp.',
        canPass: true,
      };
    }
    if (chance >= 50) {
      return {
        badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        text: '🟡 Đang rà soát (50-79%)',
        barColor: 'bg-amber-500',
        advice: '⚠ Còn một số tiêu chí hoặc công việc cần hoàn thiện để đạt mức tối thiểu 80% trước khi qua Phase.',
        canPass: false,
      };
    }
    return {
      badge: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
      text: '🔴 Rủi ro cao (<50%)',
      barColor: 'bg-red-500',
      advice: '⛔ Chưa đủ điều kiện an toàn để chuyển chặng. Cần xử lý các vướng mắc để tránh lãng phí nguồn lực.',
      canPass: false,
    };
  };

  const gateConfig = getGateStatusConfig(gatePassChancePct);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-4 md:p-5 shadow-sm space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            Lộ trình giai đoạn & Thẩm định Gate (Stage-Gate)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Quản trị tiến độ theo từng chặng và tính toán xác suất an toàn để mở khóa giai đoạn kế tiếp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Đang ở:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            {currentPhase.name}
          </span>
        </div>
      </div>

      {/* 1. STEPPER HORIZONTAL NAVIGATION */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {phases.map((p, idx) => {
          const isSelected = idx === activePhaseIndex;
          const isCompleted = p.status === 'completed';
          const isActive = p.status === 'active';

          let borderStyle = 'border-gray-200 dark:border-slate-700/80';
          let bgStyle = 'bg-gray-50/50 dark:bg-slate-800/40';

          if (isSelected) {
            borderStyle = 'border-primary ring-2 ring-primary/20 shadow-sm';
            bgStyle = 'bg-primary/5 dark:bg-primary/10';
          } else if (isCompleted) {
            borderStyle = 'border-emerald-500/40';
            bgStyle = 'bg-emerald-500/5 dark:bg-emerald-950/20';
          }

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePhaseIndex(idx)}
              className={`p-2.5 rounded-xl border text-left transition-all ${borderStyle} ${bgStyle} hover:border-primary/50 relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary text-white animate-pulse' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'
                }`}>
                  {isCompleted ? '✓' : p.id}
                </span>

                <span className={`text-[10px] font-bold ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : isActive ? 'text-primary' : 'text-gray-400'}`}>
                  {isCompleted ? '100%' : isActive ? `${phaseTaskProgressPct}%` : 'Chờ'}
                </span>
              </div>

              <b className={`text-xs block truncate ${isSelected ? 'text-primary font-bold' : 'text-gray-900 dark:text-white'}`}>
                {p.name}
              </b>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate mt-0.5">
                {p.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. ACTIVE PHASE MANAGEMENT CARD */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 space-y-4">
        
        {/* Title & 2 Gauges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${currentPhase.status === 'completed' ? 'bg-emerald-500' : 'bg-primary animate-ping'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {currentPhase.status === 'completed' ? 'Giai đoạn đã hoàn tất' : 'Chi tiết giai đoạn đang chọn'}
              </span>
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white mt-1">
              {currentPhase.name}: {currentPhase.desc}
            </h4>
          </div>

          {/* 2 Progress Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            {/* Metric 1: % Tiến độ thực thi */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 min-w-[170px] shadow-2xs">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span className="font-medium">Tiến độ công việc</span>
                <span className="font-bold text-primary">{phaseTaskProgressPct}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${phaseTaskProgressPct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                {totalSubtasksCount > 0 ? `${completedSubtasksCount}/${totalSubtasksCount} Subtasks đã xong` : 'Tự động tính theo Subtasks'}
              </span>
            </div>

            {/* Metric 2: % Cơ hội qua Phase sau */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 min-w-[180px] shadow-2xs">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Cơ hội qua Phase</span>
                <span className={`font-bold ${gatePassChancePct >= 80 ? 'text-emerald-600' : gatePassChancePct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {gatePassChancePct}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${gateConfig.barColor}`}
                  style={{ width: `${gatePassChancePct}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${gateConfig.badge}`}>
                  {gateConfig.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. GATE CRITERIA CHECKLIST */}
        <div className="pt-3 border-t border-gray-200 dark:border-slate-700/80">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                Tiêu chí thẩm định qua Phase sau (Gate Checklist)
              </span>
              <span className="text-[11px] text-gray-400 hidden sm:inline">(Đạt &gt; 80% để mở khóa chặng sau)</span>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowAddCriterion(prev => !prev)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus size={13} /> Thêm tiêu chí
              </button>
            )}
          </div>

          {/* Add form */}
          {showAddCriterion && (
            <form onSubmit={handleAddCriterion} className="flex gap-2 mb-3">
              <input
                type="text"
                value={newCriterionLabel}
                onChange={e => setNewCriterionLabel(e.target.value)}
                placeholder="Nhập tiêu chí thẩm định bắt buộc..."
                className="flex-1 text-xs p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-primary"
              />
              <button type="submit" className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold">
                Lưu
              </button>
            </form>
          )}

          {/* Criteria items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {criteria.map(c => (
              <label
                key={c.id}
                onClick={() => toggleCriterion(c.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  c.checked
                    ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-gray-900 dark:text-white'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={c.checked}
                  onChange={() => {}}
                  disabled={!canEdit}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <div className="flex-1 leading-snug">
                  <span className={c.checked ? 'font-semibold' : ''}>{c.label}</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Trọng số: {c.weight}%</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 4. GATE PASS ACTION BAR */}
        <div className="pt-3 border-t border-gray-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {gateConfig.advice}
          </p>

          {canEdit && activePhaseIndex < phases.length - 1 && (
            <button
              type="button"
              disabled={!gateConfig.canPass}
              onClick={handleAdvancePhase}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
                gateConfig.canPass
                  ? 'bg-[#002e6d] hover:bg-[#001f4d] text-white cursor-pointer hover:shadow-md'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
              }`}
            >
              <span>Phê duyệt qua {phases[activePhaseIndex + 1]?.name}</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
