import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const styles = {
    info: 'bg-blue-50 text-blue-900 border-blue-200',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    error: 'bg-rose-50 text-rose-900 border-rose-200',
  };

  const icons = {
    info: <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />,
    success: <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />,
    error: <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />,
  };

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${styles[type]} ${className}`}>
      {icons[type]}
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
          aria-label="Close alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

