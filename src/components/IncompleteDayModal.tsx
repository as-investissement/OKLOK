import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface IncompleteDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  missingHours: number;
  date: string;
}

const IncompleteDayModal: React.FC<IncompleteDayModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  missingHours,
  date
}) => {
  if (!isOpen) return null;

  const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

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
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-opacity-20 border-green-200 dark:border-opacity-30 border-2 mb-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>

            {/* Titre */}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Soumettre la feuille de temps
            </h3>

            {/* Attention journée incomplète */}
            <p className="text-orange-600 dark:text-orange-400 font-semibold mb-4">
              ⚠️ Attention : journée incomplète
            </p>

            {/* Message */}
            <div className="text-gray-600 dark:text-white mb-8 leading-relaxed">
              <p>
                Êtes-vous sûr de vouloir soumettre cette feuille de temps pour approbation ?
              </p>
            </div>

            {/* Boutons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors min-w-[120px]"
              >
                Annuler
              </button>

              <button
                onClick={handleConfirm}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors min-w-[120px]"
              >
                Soumettre
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncompleteDayModal;
