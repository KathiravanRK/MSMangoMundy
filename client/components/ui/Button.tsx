import React from 'react';
import Spinner from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:-translate-y-px active:translate-y-0';

  const variantClasses = {
    primary: 'bg-gradient-to-br from-primary to-blue-400 text-white hover:from-primary-hover hover:to-primary focus:ring-primary',
    secondary: 'bg-secondary-light text-secondary-dark hover:bg-gray-200 focus:ring-secondary',
    danger: 'bg-danger text-white hover:bg-danger-dark focus:ring-danger',
    success: 'bg-success text-white hover:bg-green-700 focus:ring-success',
    ghost: 'bg-transparent text-secondary-dark hover:bg-secondary-light focus:ring-secondary',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <>
          {icon && <span className={`mr-2 ${iconSizeClasses[size]}`}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
