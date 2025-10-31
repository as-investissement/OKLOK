import React from 'react';
import { AlertTriangle, X, Clock, CheckCircle, Send, Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'confirm' | 'warning' | 'info' | 'delete';
  confirmText?: string;
  cancelText?: string;
  onModify?: () => void;
  showModifyButton?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmText = 'Oui',
  cancelText = 'Non',
  onModify,
  showModifyButton = false
}) => {
  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle className="h-12 w-12 text-yellow-500" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          confirmButtonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        };
      case 'info':
        return {
          icon: <Send className="h-12 w-12 text-blue-500" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          confirmButtonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        };
      case 'delete':
        return {
          icon: <Trash2 className="h-12 w-12 text-red-500" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          confirmButtonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
      default:
        return {
          icon: <CheckCircle className="h-12 w-12 text-green-500" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          confirmButtonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        };
    }
  };

  const { icon, bgColor, borderColor, confirmButtonColor } = getIconAndColors();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all w-full max-w-md">
          {/* Bouton de fermeture */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-blue-900 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Contenu */}
          <div className="px-6 py-8 text-center">
            {/* Icône */}
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${bgColor} dark:bg-opacity-20 ${borderColor} dark:border-opacity-30 border-2 mb-6`}>
              {icon}
            </div>

            {/* Titre */}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {title}
            </h3>

            {/* Message */}
            <div className="text-gray-600 dark:text-white mb-8 leading-relaxed">
              {message.split('\n').map((line, index) => (
                <p key={index} className={index > 0 ? 'mt-2' : ''}>
                  {line}
                </p>
              ))}
            </div>

            {/* Boutons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors min-w-[120px]"
              >
                {cancelText}
              </button>

              {showModifyButton && onModify && (
                <button
                  onClick={() => {
                    onModify();
                    onClose();
                  }}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors min-w-[120px]"
                >
                  Modifier
                </button>
              )}

              <button
                onClick={handleConfirm}
                className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${confirmButtonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors min-w-[120px]`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;