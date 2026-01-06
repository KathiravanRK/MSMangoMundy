
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick, style }) => {
  const cardClasses = `bg-surface/80 backdrop-blur-lg border border-white/20 rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-glow-md hover:-translate-y-1 overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`;
  
  return (
    <div className={cardClasses} onClick={onClick} style={style}>
      {children}
    </div>
  );
};

export default Card;
