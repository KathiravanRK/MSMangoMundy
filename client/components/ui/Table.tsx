
import React from 'react';
import Spinner from './Spinner';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  key: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  renderMobileCard?: (item: T) => React.ReactNode;
  emptyStateMessage?: string;
}

const Table = <T extends { id: string }>({
  columns,
  data,
  loading = false,
  onRowClick,
  renderMobileCard,
  emptyStateMessage = 'No items found.',
}: TableProps<T>) => {

  const renderCell = (item: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    return item[column.accessor] as React.ReactNode;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Spinner />
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-center text-muted p-10">{emptyStateMessage}</p>;
  }

  return (
    <div className="bg-surface/80 backdrop-blur-lg border border-white/20 rounded-xl shadow-md overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border-color">
          <thead className="bg-secondary-light/50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" className={`px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider ${col.className}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface/80 divide-y divide-border-color">
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={`${onRowClick ? 'cursor-pointer hover:bg-primary-light/30' : ''} transition-colors duration-200`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm ${col.className}`}>
                    {renderCell(item, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {renderMobileCard && (
        <div className="md:hidden">
          <ul className="divide-y divide-border-color">
            {data.map((item) => (
              <li key={item.id} onClick={() => onRowClick?.(item)} className={`${onRowClick ? 'cursor-pointer hover:bg-primary-light/30' : ''} transition-colors duration-200`}>
                {renderMobileCard(item)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Table;
