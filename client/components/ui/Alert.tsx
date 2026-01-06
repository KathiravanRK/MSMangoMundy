import React from 'react';

interface AlertProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ message, type = 'error', onClose }) => {
  const baseClasses = 'p-4 rounded-lg flex items-center justify-between';
  
  const typeClasses = {
    error: 'bg-danger-light text-danger-dark border border-danger',
    warning: 'bg-warning-light text-warning-dark border border-warning',
    info: 'bg-info-light text-info-dark border border-info',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 text-lg font-bold">&times;</button>
      )}
    </div>
  );
};

export default Alert;
