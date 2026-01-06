import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactElement;
}

const Input: React.FC<InputProps> = ({ label, icon, id, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-muted mb-1">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={`block w-full px-3 py-2 border border-border-color rounded-md shadow-sm bg-surface placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary focus:shadow-glow-sm sm:text-sm ${icon ? 'pl-10' : ''}`}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;
