
import React, { useMemo } from 'react';
import Card from '../../components/ui/Card';

interface LineChartProps {
    data: { date: string; income: number; expense: number }[];
}

const LineChartSVG: React.FC<LineChartProps> = ({ data }) => {
    const width = 500;
    const height = 200;
    const padding = 30;

    if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-gray-400">No data available</div>;

    const maxVal = useMemo(() => Math.max(...data.flatMap(d => [Number(d.income) || 0, Number(d.expense) || 0]), 1), [data]);

    const x = (i: number) => {
        if (data.length <= 1) return width / 2;
        return padding + (i / (data.length - 1)) * (width - padding * 2);
    };

    const y = (val: number) => {
        const safeVal = Number(val) || 0;
        return height - padding - (safeVal / maxVal) * (height - padding * 2);
    };

    const incomePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(d.income)}`).join(' ');
    const expensePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(d.expense)}`).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Y-Axis Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                <g key={tick} className="text-gray-200">
                    <line x1={padding} y1={y(tick * maxVal)} x2={width - padding} y2={y(tick * maxVal)} stroke="currentColor" />
                    <text x={padding - 5} y={y(tick * maxVal) + 4} textAnchor="end" fontSize="10" fill="#6B7280">
                        {Math.round(tick * maxVal / 1000)}k
                    </text>
                </g>
            ))}
            {/* X-Axis Labels */}
            {data.map((d, i) => {
                const showLabel = data.length <= 7 || i % (Math.floor(data.length / 7)) === 0;
                return showLabel && (
                    <text key={i} x={x(i)} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="#6B7280">
                        {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </text>
                );
            })}

            <path d={incomePath} fill="none" stroke="#10B981" strokeWidth="2" />
            <path d={expensePath} fill="none" stroke="#EF4444" strokeWidth="2" />
        </svg>
    );
};

const CashFlowChart: React.FC<LineChartProps> = ({ data }) => {
    return (
        <Card className="h-full">
            <h3 className="font-bold text-lg mb-2">Cash Flow (Last 30 Days)</h3>
            <div className="flex items-center gap-4 text-sm mb-2">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-success"></span>Income</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-danger"></span>Expense</div>
            </div>
            <LineChartSVG data={data} />
        </Card>
    );
};

export default CashFlowChart;
