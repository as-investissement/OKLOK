import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface PaidLeaveRemovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  leaveDate: string;
}

const PaidLeaveRemovalModal: React.FC<PaidLeaveRemovalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  leaveDate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
        >
          <X size={20} />
        </button>

        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Attention : congés déjà enregistrés
          </h2>

          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Des congés payés sont déjà enregistrés. En validant, les congés seront supprimés. Voulez-vous continuer ?
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full px-6 py-3 text-base font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Oui, supprimer les congés
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaidLeaveRemovalModal;
