import React from 'react';
import { formatCurrency } from '../../utils/formatters';

interface SimpleTableProps {
  title: string;
  data: { id?: string; name: string; value: number }[];
}

const SimpleTable: React.FC<SimpleTableProps> = ({ title, data }) => (
  <div className="mt-4">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <div className="overflow-y-auto max-h-60 border rounded-lg">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-secondary-light">
          <tr>
            <th className="p-2 text-left font-medium text-muted">Name</th>
            <th className="p-2 text-right font-medium text-muted">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map(item => (
            <tr key={item.id || item.name} className="border-b border-border-color">
              <td className="p-2 truncate" title={item.name}>{item.name}</td>
              <td className="p-2 text-right font-semibold">{formatCurrency(item.value)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={2} className="text-center p-4 text-muted">No data available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default SimpleTable;
