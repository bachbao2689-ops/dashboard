import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Info, Star, CheckCircle2, Circle } from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import {
  extractKeyGateCriteria,
  formatEntityDuration,
  displayDate,
  type HubTrack,
} from '../../../lib/workflowHub';
import { useTranslation } from '../../../i18n/translations';

export interface EntityInfoPopoverProps {
  entityType: 'project' | 'campaign';
  entity: {
    id: string;
    name: string;
    start_date?: string | null;
    due_date?: string | null;
    end_date?: string | null;
    budget?: number | null;
    status?: string | null;
    lead_id?: number | null;
    lead?: { id?: number; name?: string; avatar_url?: string | null } | null;
    creator?: { id?: number; name?: string; avatar_url?: string | null } | null;
  };
  track?: HubTrack | null;
  starredCriteriaMap?: Record<string, boolean>;
  leadPerson?: { name: string; avatar_url?: string | null } | null;
  subPersons?: Array<{ id: string | number; name: string; avatar_url?: string | null }>;
}

export const EntityInfoPopover: React.FC<EntityInfoPopoverProps> = ({
  entityType,
  entity,
  track,
  starredCriteriaMap,
  leadPerson,
  subPersons = [],
}) => {
  const { lang } = useTranslation();
  const isEn = lang === 'en';
  const isCampaign = entityType === 'campaign';

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(350, window.innerWidth - 24);
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }
    if (left < 12) left = 12;

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 380 && rect.top > 320;
    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;
    setCoords({ top, left, placeAbove });
  };

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setIsOpen(false), 180);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updatePosition();
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // 1. PIC
  const pic = useMemo(() => {
    if (leadPerson && leadPerson.name) return leadPerson;
    if (entity.lead && entity.lead.name) return entity.lead;
    if (track?.pics?.[0]) return track.pics[0];
    if (entity.creator && entity.creator.name) return entity.creator;
    return null;
  }, [leadPerson, entity.lead, track?.pics, entity.creator]);

  const picName = pic?.name || (isEn ? 'Unassigned PIC' : 'Chưa giao PIC');
  const picAvatar = pic?.avatar_url || undefined;

  // 2. Sub list
  const subs = useMemo(() => {
    const list: Array<{ id: string | number; name: string; avatar_url?: string | null }> = [];
    const seen = new Set<string>();
    if (pic?.name) seen.add(pic.name.trim().toLowerCase());

    for (const s of subPersons) {
      if (s?.name && !seen.has(s.name.trim().toLowerCase())) {
        seen.add(s.name.trim().toLowerCase());
        list.push(s);
      }
    }
    if (track?.sub_pics) {
      for (const sp of track.sub_pics) {
        if (sp?.name && !seen.has(sp.name.trim().toLowerCase())) {
          seen.add(sp.name.trim().toLowerCase());
          list.push(sp);
        }
      }
    }
    if (track?.pics && track.pics.length > 1) {
      for (const p of track.pics.slice(1)) {
        if (p?.name && !seen.has(p.name.trim().toLowerCase())) {
          seen.add(p.name.trim().toLowerCase());
          list.push(p);
        }
      }
    }
    return list;
  }, [subPersons, track?.sub_pics, track?.pics, pic?.name]);

  // 3. Phases
  const totalPhases = track?.phases?.length || 0;
  const completedPhases = (track?.phases || []).filter(p => p.status === 'completed').length;

  // 4. Key Gate Criteria
  const keyCriteria = useMemo(() => {
    return extractKeyGateCriteria(track, starredCriteriaMap);
  }, [track, starredCriteriaMap]);

  // 5. Budget
  const budgetNum = Number(entity.budget ?? track?.budget ?? 0);

  // 6. Time & Duration
  const startDate = entity.start_date || track?.start_date;
  const endDate = entity.end_date || entity.due_date || track?.due_date;
  const timelineStr = `${displayDate(startDate)} – ${displayDate(endDate)}`;
  const durationStr = formatEntityDuration(startDate, endDate, isEn);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={isEn ? `Info for ${entity.name}` : `Thông tin chi tiết ${entity.name}`}
        title={isEn ? "View entity details" : "Xem thông tin chi tiết"}
        className={`w-5 h-5 rounded-md grid place-items-center shrink-0 transition-colors cursor-pointer border ${
          isCampaign
            ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
            : 'text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30'
        }`}
      >
        <Info size={12} strokeWidth={2.4} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              top: coords.top,
              left: coords.left,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
            }}
            onMouseEnter={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
            }}
            onMouseLeave={handleMouseLeave}
            onClick={e => e.stopPropagation()}
            className={`fixed z-[9999] w-[min(350px,calc(100vw-24px))] p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 space-y-3 pointer-events-auto ${
              isCampaign
                ? 'bg-amber-50/90 dark:bg-slate-900/95 border-amber-300/80 dark:border-amber-700/60 shadow-amber-500/10 text-gray-800 dark:text-slate-100'
                : 'bg-violet-50/90 dark:bg-slate-900/95 border-violet-300/80 dark:border-violet-700/60 shadow-violet-500/10 text-gray-800 dark:text-slate-100'
            }`}
          >
            {/* Header: Type Pill & Name */}
            <div className="grid grid-cols-[auto_1fr] items-center gap-2 pb-2.5 border-b border-gray-200/80 dark:border-slate-800">
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  isCampaign
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30'
                }`}
              >
                {isCampaign ? 'Campaign' : 'Project'}
              </span>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate" title={entity.name}>
                {entity.name}
              </h4>
            </div>

            {/* Content Table Info in CSS Grid */}
            <div className="space-y-2">
              {/* 1. PIC */}
              <div className="grid grid-cols-[68px_1fr] items-center gap-2 text-xs">
                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                  PIC
                </span>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0">
                  <Avatar name={picName} src={picAvatar} className="w-5 h-5 text-[9px] shadow-2xs" />
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {picName}
                  </span>
                </div>
              </div>

              {/* 2. Sub */}
              <div className="grid grid-cols-[68px_1fr] items-start gap-2 text-xs">
                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">
                  Sub
                </span>
                {subs.length === 0 ? (
                  <span className="text-[11px] text-gray-400 italic">
                    {isEn ? 'No sub members' : 'Chưa có thành viên phụ trách'}
                  </span>
                ) : (
                  <div className="grid grid-cols-1 gap-1 max-h-20 overflow-y-auto custom-scrollbar pr-0.5">
                    {subs.map(sub => (
                      <div
                        key={String(sub.id)}
                        className="grid grid-flow-col auto-cols-max items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-300"
                      >
                        <Avatar name={sub.name} src={sub.avatar_url || undefined} className="w-4 h-4 text-[8px]" />
                        <span className="truncate max-w-[210px]">{sub.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Phases */}
              <div className="grid grid-cols-[68px_1fr] items-center gap-2 text-xs">
                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                  {isEn ? 'Phases' : 'Phase'}
                </span>
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {totalPhases} {isEn ? (totalPhases > 1 ? 'phases' : 'phase') : 'phase'}
                  </span>
                  {totalPhases > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {completedPhases}/{totalPhases} {isEn ? 'completed' : 'hoàn thành'}
                    </span>
                  )}
                </div>
              </div>

              {/* 5. Budget (Campaign with budget > 0) */}
              {isCampaign && budgetNum > 0 && (
                <div className="grid grid-cols-[68px_1fr] items-center gap-2 text-xs">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                    {isEn ? 'Budget' : 'Ngân sách'}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {new Intl.NumberFormat('vi-VN').format(budgetNum)} ₫
                  </span>
                </div>
              )}

              {/* 6. Timeline & Duration */}
              <div className="grid grid-cols-[68px_1fr] items-start gap-2 text-xs">
                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">
                  {isEn ? 'Timeline' : 'Thời gian'}
                </span>
                <div className="grid grid-cols-1 gap-0.5 min-w-0">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {timelineStr}
                  </span>
                  <span className="text-[10.5px] font-semibold text-primary">
                    {durationStr}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Gate Checklist Key Criteria (★) */}
            <div className="pt-2 border-t border-gray-200/80 dark:border-slate-800 space-y-1.5">
              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  {isEn ? 'Key Gate Criteria (★)' : 'Tiêu chí chính (Gate Checklist ★)'}
                </span>
              </div>

              {keyCriteria.length === 0 ? (
                <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/50 border border-dashed border-gray-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-gray-400 italic">
                    {isEn
                      ? 'No key criteria starred (★) in Gate Checklist'
                      : 'Chưa gắn sao (★) tiêu chí chính trong Gate Checklist'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-0.5">
                  {keyCriteria.map(kc => (
                    <div
                      key={kc.id}
                      className={`p-2 rounded-xl border text-xs grid grid-cols-[auto_1fr_auto] items-start gap-2 ${
                        kc.checked
                          ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-gray-900 dark:text-white'
                          : 'border-gray-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/60 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {kc.checked ? (
                          <CheckCircle2 size={13} className="text-emerald-500" />
                        ) : (
                          <Circle size={13} className="text-gray-400 dark:text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className={`block leading-snug ${kc.checked ? 'font-semibold' : ''}`}>
                          {kc.label}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          P{kc.phasePosition}: {kc.phaseTitle}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
                        {kc.weight}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
