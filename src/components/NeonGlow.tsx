import React from 'react';

interface NeonGlowProps {
  color?: 'cyan' | 'purple' | 'green' | 'red' | 'yellow' | 'pink';
  className?: string;
  children: React.ReactNode;
  pulse?: boolean;
}

const colorMap = {
  cyan: 'shadow-cyan-500/40 border-cyan-500/50 text-cyan-400',
  purple: 'shadow-purple-500/40 border-purple-500/50 text-purple-400',
  green: 'shadow-emerald-500/40 border-emerald-500/50 text-emerald-400',
  red: 'shadow-red-500/40 border-red-500/50 text-red-400',
  yellow: 'shadow-yellow-500/40 border-yellow-500/50 text-yellow-400',
  pink: 'shadow-pink-500/40 border-pink-500/50 text-pink-400',
};

export default function NeonGlow({
  color = 'cyan',
  className = '',
  children,
  pulse = false,
}: NeonGlowProps) {
  return (
    <div
      className={`
        border shadow-lg ${colorMap[color]} 
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
