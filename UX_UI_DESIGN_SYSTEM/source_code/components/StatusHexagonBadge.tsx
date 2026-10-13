import React from 'react';
import { DESIGN_TOKENS, WorkflowStatusKey } from '../tokens/design-tokens';

export interface StatusHexagonBadgeProps {
  status: WorkflowStatusKey;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const WorkflowHexagonIcon: React.FC<{ status: WorkflowStatusKey; size?: number; className?: string }> = ({
  status,
  size = 14,
  className = ''
}) => {
  const hexPath = "M12 2.5 L20.2 7.2 L20.2 16.8 L12 21.5 L3.8 16.8 L3.8 7.2 Z";
  const cfg = DESIGN_TOKENS.colors.status[status] || DESIGN_TOKENS.colors.status.planned;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <path d={hexPath} fill={cfg.color} fillOpacity="0.18" />
      <path d={hexPath} stroke={cfg.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/**
 * StatusHexagonBadge: Standard status badge with tech hexagon icon and soft pill styling
 */
export const StatusHexagonBadge: React.FC<StatusHexagonBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
  className = '',
  onClick,
}) => {
  const cfg = DESIGN_TOKENS.colors.status[status] || DESIGN_TOKENS.colors.status.planned;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[9.5px]',
    md: 'px-2 py-0.5 text-[10.5px]',
    lg: 'px-2.5 py-1 text-xs',
  }[size];

  const iconSizes = { sm: 11, md: 13, lg: 15 }[size];

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border font-bold transition-all shadow-2xs select-none ${cfg.bgLight} ${cfg.bgDark} ${cfg.textColor} ${cfg.borderClass} ${sizeClasses} ${onClick ? 'cursor-pointer hover:opacity-85' : ''} ${className}`}
    >
      <WorkflowHexagonIcon status={status} size={iconSizes} />
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
};
