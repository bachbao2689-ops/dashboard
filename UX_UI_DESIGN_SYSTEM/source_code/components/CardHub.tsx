import React from 'react';

export interface CardHubProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * CardHub: Core unified container architecture.
 * Combines white surface with subtle corner blue radial gradient and delicate 1px border.
 */
export const CardHub: React.FC<CardHubProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`card-hub p-4 sm:p-5 rounded-2xl border border-[#e0eaff] dark:border-blue-500/15 bg-white dark:bg-slate-900 shadow-xs relative transition-all duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
