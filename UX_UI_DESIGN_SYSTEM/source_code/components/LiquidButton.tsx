import React from 'react';

export interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'pill' | 'sidebar' | 'capsule';
  className?: string;
}

/**
 * LiquidButton: High-fidelity button matching UI Button.md.
 * In Light Mode: Gradient thấu kính, bóng trong nhẹ, viền sáng mảnh, chấm neon xanh trên nút active.
 * In Dark Mode: Nền xanh dịu, viền phát quang cyan/green tinh tế.
 */
export const LiquidButton: React.FC<LiquidButtonProps> = ({
  isActive = false,
  icon,
  children,
  variant = 'sidebar',
  className = '',
  ...props
}) => {
  const baseClasses =
    variant === 'pill'
      ? 'relative inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200'
      : 'sidebar-link w-full text-left font-medium transition-all duration-200';

  const stateClass = isActive ? 'sidebar-link-active' : 'sidebar-link-idle';

  return (
    <button
      type="button"
      className={`${baseClasses} ${stateClass} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};
