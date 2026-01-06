import React, { useState, useMemo, ReactNode } from 'react';
import { ICONS } from '../../constants';
import ColumnSelector from './ColumnSelector';
import Spinner from './Spinner';

export interface Column<T> {
  header: ReactNode;
  accessor: keyof T | ((item: T) => ReactNode);
  sortable?: boolean;
  sortAccessor?: keyof T | ((item: T) => string | number | Date | boolean);
  className?: string;
  isDefault?: boolean;
  key: string;
}

interface SortableTableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  tableId: string;
  defaultSortField?: string;
  onRowClick?: (item: T) => void;
  renderSubComponent?: (item: T) => ReactNode;
  renderMobileCard?: (item: T) => ReactNode;
  searchPlaceholder?: string;
  loading?: boolean;
  leftControls?: ReactNode;
  customActions?: ReactNode;
  visibleColumns: string[];
  onColumnToggle: (columnKey: string) => void;
  emptyStateMessage?: string;
}

export const SortableTable = <T extends { id?: any }>({
  columns,
  data,
  tableId,
  defaultSortField,
  onRowClick,
  renderSubComponent,
  renderMobileCard,
  searchPlaceholder = 'Search this table...',
  loading = false,
  leftControls,
  customActions,
  visibleColumns,
  onColumnToggle,
  emptyStateMessage = 'No data available for the current selection.',
}: SortableTableProps<T>) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    defaultSortField ? { key: String(defaultSortField), direction: 'desc' } : null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return ICONS.sort;
    if (sortConfig.direction === 'asc') return ICONS.sort_asc;
    return ICONS.sort_desc;
  };

  const visibleColumnDefs = useMemo(() => columns.filter(c => visibleColumns.includes(c.key)), [columns, visibleColumns]);

  const processedData = useMemo(() => {
    let filteredData = [...data];

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filteredData = filteredData.filter(item =>
        columns.some(col => {
          let value: any;
          if (typeof col.accessor === 'function') {
            try {
              value = col.accessor(item);
            } catch {
              value = '';
            }
          } else {
            value = item[col.accessor as keyof T];
          }

          // Helper to extract text from React nodes (strings, numbers, arrays, elements)
          const nodeToString = (node: any): string => {
            if (node === null || node === undefined) return '';
            if (typeof node === 'string' || typeof node === 'number') return String(node);
            if (Array.isArray(node)) return node.map(n => nodeToString(n)).join(' ');
            if (React.isValidElement(node)) {
              // Recursively extract children
              // @ts-ignore
              return nodeToString(node.props?.children);
            }
            // Fallback to string conversion
            try {
              return String(node);
            } catch {
              return '';
            }
          };

          const text = nodeToString(value).toLowerCase();
          return text.includes(lowercasedTerm);
        })
      );
    }

    if (sortConfig !== null) {
      const sortColumn = columns.find(c => c.key === sortConfig.key);
      if (sortColumn && sortColumn.sortable) {
        filteredData.sort((a, b) => {
          const getSortValue = (item: T) => {
            const accessor = sortColumn.sortAccessor ?? sortColumn.accessor;
            if (typeof accessor === 'function') {
              return accessor(item);
            }
            return item[accessor as keyof T];
          };

          const aVal = getSortValue(a);
          const bVal = getSortValue(b);

          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;

          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
          }

          if (aVal instanceof Date && bVal instanceof Date) {
            return sortConfig.direction === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
          }

          if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
            return sortConfig.direction === 'asc' ? (aVal === bVal ? 0 : aVal ? -1 : 1) : (aVal === bVal ? 0 : aVal ? 1 : -1);
          }

          const stringA = String(aVal).toLowerCase();
          const stringB = String(bVal).toLowerCase();

          if (stringA < stringB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (stringA > stringB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return filteredData;
  }, [data, searchTerm, sortConfig, columns]);

  const toggleRowExpansion = (itemId: string | number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-end gap-4 flex-wrap flex-grow">
          {leftControls}
          <div className="relative flex-grow min-w-[200px] md:min-w-[250px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">{ICONS.search}</div>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white h-[42px]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {customActions}
          <ColumnSelector allColumns={columns} visibleColumns={visibleColumns} onColumnToggle={onColumnToggle} />
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-md overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-border-color">
            <thead className="bg-secondary-light/50">
              <tr>
                {renderSubComponent && <th className="w-12 px-6 py-3"></th>}
                {visibleColumnDefs.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, col.sortable)}
                    className={`px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider ${col.className} ${col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  >
                    <div className="flex items-center gap-2 group">
                      {col.header}
                      {col.sortable && getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && <tr><td colSpan={100} className="text-center p-10"><Spinner /></td></tr>}
              {!loading && processedData.length > 0 ? processedData.map((item, index) => {
                const itemId = item.id || index;
                const isExpanded = expandedRows.has(itemId);
                return (
                  <React.Fragment key={itemId}>
                    <tr onClick={() => onRowClick ? onRowClick(item) : (renderSubComponent && toggleRowExpansion(itemId))} className={`${onRowClick || renderSubComponent ? "hover:bg-gray-50 cursor-pointer" : ""}`}>
                      {renderSubComponent && (
                        <td className="px-6 py-4">
                          <button onClick={(e) => { e.stopPropagation(); toggleRowExpansion(itemId); }} className="p-1 rounded-full hover:bg-gray-200">
                            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </td>
                      )}
                      {visibleColumnDefs.map(col => (
                        <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm ${col.className}`}>
                          {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor as keyof T] as ReactNode)}
                        </td>
                      ))}
                    </tr>
                    {renderSubComponent && isExpanded && (
                      <tr>
                        <td colSpan={visibleColumnDefs.length + 1} className="p-0 bg-gray-50">
                          <div className="p-4">{renderSubComponent(item)}</div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              }) : !loading && (
                <tr>
                  <td colSpan={visibleColumnDefs.length + (renderSubComponent ? 1 : 0)} className="text-center py-10 text-muted">{emptyStateMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        {renderMobileCard && (
          <div className="md:hidden">
            <ul className="divide-y divide-border-color">
              {loading && <li className="text-center p-10"><Spinner /></li>}
              {!loading && processedData.map((item, index) => (
                <li key={item.id || index} onClick={() => onRowClick?.(item)} className={`${onRowClick ? 'cursor-pointer hover:bg-primary-light/30' : ''} transition-colors duration-200 bg-white`}>
                  {renderMobileCard(item)}
                </li>
              ))}
              {!loading && processedData.length === 0 && (
                <li className="text-center p-10 text-muted">{emptyStateMessage}</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
