import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ICONS } from '../../constants';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
  searchableString?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  onAddNew,
  addNewLabel = 'Add New',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Close only if clicking outside both wrapper AND not on portal content
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        // Check if clicking on portal dropdown
        const portalContent = document.querySelector('[data-portal-dropdown]');
        if (!portalContent || !portalContent.contains(target)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleWindowResize = () => {
      if (isOpen && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setDropdownStyle({
          position: 'fixed' as const,
          top: `${rect.bottom + 4}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          zIndex: 9999,
        });
      }
    };

    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      // Calculate fixed position for dropdown
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setDropdownStyle({
          position: 'fixed' as const,
          top: `${rect.bottom + 4}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          zIndex: 9999,
        });
      }
      window.addEventListener('resize', handleWindowResize);
    }
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowercasedTerm = searchTerm.toLowerCase();
    return options.filter(opt => {
      if (opt.searchableString) {
        return opt.searchableString.toLowerCase().includes(lowercasedTerm);
      }
      return (
        opt.label.toLowerCase().includes(lowercasedTerm) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(lowercasedTerm))
      );
    });
  }, [options, searchTerm]);

  const handleSelectOption = (optionValue: string | null) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  }

  return (
    <div className={`relative w-full`} ref={wrapperRef}>
      <div
        onClick={handleToggle}
        className={`w-full text-left bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="flex items-center min-h-[2.5rem] md:min-h-[2rem]">
          {selectedOption ? (
            <div>
              <span className="block truncate font-medium text-dark">{selectedOption.label}</span>
              {selectedOption.subLabel && <span className="block truncate text-xs text-muted">{selectedOption.subLabel}</span>}
            </div>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.55.89l.05.11 3 6a1 1 0 01-1.2 1.4L12 11.2V11l-.1-.08-2.5-2.5a1 1 0 010-1.42l.1-.08L12.5 4H10a1 1 0 01-.9-.55l-.05-.11A1 1 0 0110 3zM5.29 7.29a1 1 0 011.42 0L10 10.59l3.29-3.3a1 1 0 111.42 1.42l-4 4a1 1 0 01-1.42 0l-4-4a1 1 0 010-1.42z" clipRule="evenodd" transform="rotate(180 10 10)" />
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </div>

      {isOpen && ReactDOM.createPortal(
        <div 
          data-portal-dropdown
          className="rounded-md bg-white shadow-xl border border-gray-200" 
          style={dropdownStyle} 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                {ICONS.search}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            {onAddNew && (
              <li
                key="add-new-option"
                onClick={(e) => { 
                  e.stopPropagation();
                  onAddNew(); 
                  setIsOpen(false); 
                }}
                className="text-primary cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary-light"
              >
                <div className="flex items-center gap-2 font-semibold">
                  {ICONS.plus} {addNewLabel}
                </div>
              </li>
            )}
            {filteredOptions.map((option, idx) => (
              <li 
                key={`${option.value}-${idx}`} 
                onClick={(e) => { 
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }} 
                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
              >

                <div>
                  <span className={`block truncate ${value === option.value ? 'font-semibold' : 'font-normal'}`}>
                    {option.label}
                  </span>
                  {option.subLabel && <span className="text-xs text-muted">{option.subLabel}</span>}
                </div>
                {value === option.value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </li>
            ))}
            {filteredOptions.length === 0 && searchTerm && (
              <li key="no-results" className="text-muted text-center py-2 px-3">No matching options found.</li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableSelect;
