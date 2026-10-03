import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface KpiCardProps {
  title: string;
  value: string;
  trend: number;
  className?: string;
  colorTheme?: 'primary' | 'success' | 'warning' | 'info';
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, className, colorTheme = 'primary' }) => {
  const isPositive = trend >= 0;
  
  const bgColors = {
    primary: 'bg-primary/10',
    success: 'bg-emerald-500/10',
    warning: 'bg-amber-500/10',
    info: 'bg-cyan-500/10',
  };

  const textColors = {
    primary: 'text-primary',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    info: 'text-cyan-600',
  };

  return (
    <div className={cn("card-hub shadow-sm p-6 rounded-3xl flex flex-col justify-between h-40 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:-translate-y-1", className)}>
      <div className={`absolute top-0 right-0 w-24 h-24 ${bgColors[colorTheme]} rounded-full blur-2xl -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-150`}></div>
      
      <div className="flex justify-between items-start relative z-10">
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{title}</span>
        <div className={`p-1.5 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 shadow-sm ${textColors[colorTheme]}`}>
          {isPositive ? <TrendingUp size={18} strokeWidth={2.5} /> : <TrendingDown size={18} strokeWidth={2.5} />}
        </div>
      </div>
      <div className="flex items-end justify-between mt-4 relative z-10">
        <h3 className="text-4xl font-bold text-gray-800 dark:text-white tracking-tight">{value}</h3>
        <span className={`text-sm font-bold flex items-center px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
          {isPositive ? '+' : ''}{trend}%
        </span>
      </div>
    </div>
  );
};
