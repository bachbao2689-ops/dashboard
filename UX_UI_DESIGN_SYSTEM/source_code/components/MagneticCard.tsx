import React from 'react';
import { useMagneticHover } from '../hooks/useMagneticHover';

export type GlowColor = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';

export interface MagneticCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: GlowColor;
  className?: string;
  isActive?: boolean;
}

/**
 * MagneticCard: Reactive card with cursor spotlight and spring-curved physics.
 * Perfect for KPI summary cards, feature highlights, and interactive metrics.
 */
export const MagneticCard: React.FC<MagneticCardProps> = ({
  children,
  glowColor = 'blue',
  className = '',
  isActive = false,
  ...props
}) => {
  const { ref, onMouseMove, onMouseLeave } = useMagneticHover<HTMLDivElement>(0.12);

  const glowClass = `magnetic-${glowColor}`;

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`hover-magnetic-card ${glowClass} p-3.5 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between transition-all relative group min-w-0 cursor-pointer ${
        isActive
          ? 'z-30 ring-2 ring-blue-500/40 shadow-xl bg-white dark:bg-slate-800'
          : 'z-10'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
