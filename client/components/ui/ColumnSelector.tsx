import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { ICONS } from '../../constants';

interface ColumnOption {
  key: string;
  header: string | ReactNode;
}

interface ColumnSelectorProps {
  allColumns: ColumnOption[];
  visibleColumns: string[];
  onColumnToggle: (columnKey: string) => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({ allColumns, visibleColumns, onColumnToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-gray-50 h-[42px]"
      >
        {React.cloneElement(ICONS.menu, { className: "h-4 w-4"})} Columns
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {allColumns.filter(c => typeof c.header === 'string').map(column => (
              <label key={column.key} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mr-3"
                  checked={visibleColumns.includes(column.key)}
                  onChange={() => onColumnToggle(column.key)}
                />
                {column.header}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;
