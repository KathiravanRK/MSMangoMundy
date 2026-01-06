import React from 'react';
import { formatCurrency } from '../../utils/formatters';

interface BarChartProps {
  title: string;
  data: { id?: string; name: string; value: number }[];
}

const BarChart: React.FC<BarChartProps> = ({ title, data }) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <div className="space-y-2">
      {data.length > 0 ? data.map(item => (
        <div key={item.id || item.name} className="flex items-center gap-2 group">
          <span className="text-xs text-muted w-24 text-right truncate" title={item.name}>{item.name}</span>
          <div className="flex-1 bg-secondary-light rounded-full h-6 relative">
            <div
              className="bg-primary h-6 rounded-full transition-all duration-500 ease-out flex items-center pl-2"
              style={{ width: `${(item.value / Math.max(...data.map(d => d.value), 1)) * 100}%` }}
            >
              <span className="text-xs font-bold text-white">
                {formatCurrency(item.value, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      )) : <p className="text-muted text-sm py-8 text-center">No data available.</p>}
    </div>
  </div>
);

export default BarChart;
