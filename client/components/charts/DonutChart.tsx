import React, { useMemo } from 'react';
import Card from '../ui/Card';

interface DonutChartProps {
    title: string;
    data: { id?: string; name: string, value: number }[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9'];

const DonutChart: React.FC<DonutChartProps> = ({ title, data }) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

    if (total === 0) return (
        <>
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            <div className="flex items-center justify-center h-48 text-muted">No data available</div>
        </>
    );

    let accumulated = 0;
    const gradient = data.map((item, index) => {
        const percent = (item.value / total) * 100;
        const color = COLORS[index % COLORS.length];
        const result = `${color} ${accumulated}% ${accumulated + percent}%`;
        accumulated += percent;
        return result;
    }).join(', ');

    return (
        <>
            <h3 className="font-bold text-lg mb-4">{title}</h3>
            <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full relative flex-shrink-0" style={{ background: `conic-gradient(${gradient})` }}>
                    <div className="absolute inset-2 bg-surface rounded-full"></div>
                </div>
                <div className="w-full space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                    {data.slice(0, 5).map((item, index) => (
                        <div key={`${item.name}-${index}`} className="flex items-center gap-2 min-w-0">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="font-medium text-on-surface flex-1 truncate" title={item.name}>{item.name}</span>
                            <span className="font-semibold text-on-surface flex-shrink-0 whitespace-nowrap">{item.value.toLocaleString('en-IN')}</span>
                            <span className="text-muted w-8 text-right flex-shrink-0 whitespace-nowrap">{((item.value / total) * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                    {data.length > 5 && <div className="text-xs text-muted">... and {data.length - 5} more</div>}
                </div>
            </div>
        </>
    );
};

export default DonutChart;
