import React from 'react';

interface ColoredCircleProps {
  color: string;
  className?: string;
}

export const ColoredCircle: React.FC<ColoredCircleProps> = ({ color, className }) => {
  return (
    <div className={`w-3 h-3 rounded-full ${className}`} style={{ backgroundColor: color }}></div>
  );
};
