import React from 'react';

interface AnimatedDivProps {
  children: React.ReactNode;
  className?: string;
  animationDelay?: string;
}

export const AnimatedDiv: React.FC<AnimatedDivProps> = ({
  children,
  className,
  animationDelay,
}) => {
  return (
    <div className={className} style={{ animationDelay }}>
      {children}
    </div>
  );
};
