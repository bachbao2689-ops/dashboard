import React from 'react';
import { cn } from './KpiCard';

interface AvatarProps {
  src?: string;
  name: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, className }) => {
  return (
    <div className={cn("h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 font-bold", className)}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
};
