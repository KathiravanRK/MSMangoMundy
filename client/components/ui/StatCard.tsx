import React from 'react';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  className?: string; // For color classes
  onClick?: () => void;
  style?: React.CSSProperties;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon, className, onClick, style }) => (
    <Card className={`p-4 ${className || ''}`} onClick={onClick} style={style}>
        <div className="flex items-center overflow-hidden">
            {icon && <div className="p-3 mr-4 text-white bg-black/20 rounded-full flex-shrink-0">{icon}</div>}
            <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium opacity-80 truncate" title={title}>{title}</p>
                <p className="text-lg lg:text-xl font-bold break-words word-break overflow-hidden line-clamp-2">{value}</p>
                {subtext && <p className="text-xs opacity-70 mt-1 truncate" title={subtext}>{subtext}</p>}
            </div>
        </div>
    </Card>
);

export default StatCard;
