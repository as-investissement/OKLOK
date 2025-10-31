import React from 'react';
import { Clock, X } from 'lucide-react';

interface TimeRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHour: number;
}

const TimeRestrictionModal: React.FC<TimeRestrictionModalProps> = ({
  isOpen,
  onClose,
  currentHour
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay avec effet de flou */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Modal centré */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4 transform transition-all duration-300 scale-100">
        {/* Bouton de fermeture discret */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-blue-900 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Contenu du modal */}
        <div className="p-8 text-center">
          {/* Icône horloge avec animation */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center mb-6">
            <div className="text-6xl animate-pulse">🕕</div>
          </div>

          {/* Message principal */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
            Trop tôt pour enregistrer !
          </h3>

          {/* Message détaillé */}
          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Vous pouvez enregistrer vos heures du jour en cours à partir de{' '}
            <span className="font-semibold text-blue-600 dark:text-blue-400">17h</span>
            <br />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              (actuellement {currentHour}h)
            </span>
          </p>

          {/* Bouton d'action avec style moderne */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
          >
            Ok, je reviendrai plus tard !
          </button>
        </div>

        {/* Décoration subtile */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-blue-500 rounded-full opacity-20"></div>
        </div>
      </div>
    </div>
  );
};

export default TimeRestrictionModal;