import React from 'react';
import { AlertTriangle, X, Clock, Calendar } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'error'
}) => {
  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle className="h-12 w-12 text-yellow-500" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        };
      case 'info':
        return {
          icon: <Clock className="h-12 w-12 text-blue-500" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        };
      default:
        return {
          icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
    }
  };

  const { icon, bgColor, borderColor, buttonColor } = getIconAndColors();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-md">
          {/* Bouton de fermeture */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Contenu */}
          <div className="px-6 py-8 text-center">
            {/* Icône */}
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${bgColor} ${borderColor} border-2 mb-6`}>
              {icon}
            </div>

            {/* Titre */}
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {title}
            </h3>

            {/* Message */}
            <div className="text-gray-600 mb-8 leading-relaxed">
              {message.split('\n').map((line, index) => (
                <p key={index} className={index > 0 ? 'mt-2' : ''}>
                  {line}
                </p>
              ))}
            </div>

            {/* Bouton OK */}
            <button
              onClick={onClose}
              className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors min-w-[120px]`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;