import React from 'react';

interface SettingsGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
}

const colsClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

const gapClasses = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
};

export const SettingsGrid: React.FC<SettingsGridProps> = ({ children, cols = 2, gap = 'md' }) => {
  return <div className={`grid ${colsClasses[cols]} ${gapClasses[gap]}`}>{children}</div>;
};
