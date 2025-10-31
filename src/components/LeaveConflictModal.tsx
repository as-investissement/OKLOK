import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface LeaveConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflictingDays: Array<{ date: string; entries: number }>;
  leaveType: 'leave' | 'absence' | 'partial_absence_overflow';
}

const LeaveConflictModal: React.FC<LeaveConflictModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  conflictingDays,
  leaveType
}) => {
  if (!isOpen) return null;

  const leaveLabel = leaveType === 'leave' ? 'congés' : leaveType === 'absence' ? 'absence' : 'absence partielle';
  const isPartialOverflow = leaveType === 'partial_absence_overflow';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-orange-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Confirmation requise
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            {isPartialOverflow ? (
              <>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Les heures d'absence dépassent les heures quotidiennes. En validant l'absence, les heures de la journée seront recalculées.
                </p>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Note :</strong> Les heures en excès seront déduites de la dernière entrée enregistrée.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  En validant {leaveLabel === 'congés' ? 'les congés' : "l'absence"}, les entrées de travail existantes seront supprimées pour :
                </p>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3 space-y-2">
                  {conflictingDays.map((day, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{day.date}</span>
                      <span className="text-orange-700 dark:text-orange-300">
                        {day.entries} {day.entries === 1 ? 'entrée' : 'entrées'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Voulez-vous continuer ?
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
            >
              Confirmer et supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveConflictModal;
