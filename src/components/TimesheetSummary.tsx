import React from 'react';
import { TimeSheet } from '../types';
import { formatDate, formatHours } from '../utils/helpers';
import { Clock, CheckCircle, XCircle, AlertCircle, Send, Eye, Calendar, AlertTriangle } from 'lucide-react';

interface TimesheetSummaryProps {
  timesheet?: TimeSheet;
  onSubmit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isAdmin?: boolean;
  selectedDate?: string;
  onSubmitDay?: (date: string) => void;
}

const TimesheetSummary: React.FC<TimesheetSummaryProps> = ({
  timesheet,
  onSubmit,
  onApprove,
  onReject,
  isAdmin = false,
  selectedDate,
  onSubmitDay
}) => {
  // Helper function to check if there are draft entries for a specific day
  const hasEntriesForDay = (timesheet: TimeSheet, selectedDate: string): boolean => {
    if (!timesheet || !selectedDate) return false;
    const dayEntries = timesheet.entries.filter(entry => entry.date === selectedDate);
    return dayEntries.length > 0 && dayEntries.some(entry => entry.status === 'pending');
  };

  // Early return if timesheet is not loaded yet
  if (!timesheet) {
    return null;
  }

  const getStatusBadge = () => {
    switch (timesheet.status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pastel-yellow text-yellow-700">
            <Clock size={12} className="mr-1 sm:w-4 sm:h-4" />
            Brouillon
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pastel-blue text-blue-700">
            <Send size={12} className="mr-1 sm:w-4 sm:h-4" />
            Soumis pour approbation
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pastel-green text-green-700">
            <CheckCircle size={12} className="mr-1 sm:w-4 sm:h-4" />
            Approuvé
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pastel-red text-red-700">
            <XCircle size={12} className="mr-1 sm:w-4 sm:h-4" />
            Refusé
          </span>
        );
      default:
        return null;
    }
  };

  // Calculer les statistiques selon le contexte (jour ou semaine/mois)
  const getStatistics = () => {
    if (selectedDate) {
      // Mode jour : calculer les heures de la date sélectionnée
      const dayEntries = timesheet.entries.filter(entry => entry.date === selectedDate);

      // EXCLURE les congés et absences des statistiques d'heures de travail
      const workEntries = dayEntries.filter(entry => !entry.isPaidLeave && !entry.isAbsence);
      const absenceEntries = dayEntries.filter(entry => entry.isAbsence);
      const leaveEntries = dayEntries.filter(entry => entry.isPaidLeave);

      const normalHours = workEntries.reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
      const overtimeHours = workEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
      const absenceHours = absenceEntries.reduce((sum, entry) => sum + (entry.absenceHours || entry.normalHours || 0), 0);
      const leaveDays = leaveEntries.length > 0 ? 1 : 0;

      const totalHours = normalHours + overtimeHours;
      const workingDays = workEntries.length > 0 ? 1 : 0;

      return {
        normalHours,
        overtimeHours,
        totalHours,
        workingDays,
        entriesCount: workEntries.length,
        absenceHours,
        leaveDays
      };
    } else {
      // Mode semaine : calculer toutes les heures de la semaine
      // EXCLURE les congés et absences des statistiques d'heures
      const workEntries = timesheet.entries.filter(entry => !entry.isPaidLeave && !entry.isAbsence);
      
      const normalHours = workEntries.reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
      const overtimeHours = workEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
      
      const totalHours = normalHours + overtimeHours;
      const workingDays = Object.keys(workEntries.reduce((acc, entry) => {
        acc[entry.date] = true;
        return acc;
      }, {} as Record<string, boolean>)).length;

      return {
        normalHours,
        overtimeHours,
        totalHours,
        workingDays,
        entriesCount: workEntries.length
      };
    }
  };

  const stats = getStatistics();

  // Fonction pour obtenir le statut d'un jour
  const getDayStatus = (date: string): 'not_registered' | 'draft' | 'pending' | 'approved' | 'rejected' | 'partially_approved' => {
    if (!timesheet || !timesheet.entries) return 'not_registered';

    // CORRECTION : Vérifier SEULEMENT les entrées de ce jour spécifique
    const dayEntries = timesheet.entries.filter(entry => entry.date === date);

    // Si aucune entrée pour ce jour = non enregistré
    if (dayEntries.length === 0) {
      return 'not_registered';
    }
    
    // LOGIQUE IDENTIQUE AU CALENDRIER : rejected > partially_approved > approved > pending > draft
    if (dayEntries.some(entry => entry.status === 'rejected')) {
      // Si il y a du rejeté ET de l'approuvé = partiellement approuvé
      if (dayEntries.some(entry => entry.status === 'approved')) {
        return 'partially_approved';
      }
      return 'rejected';
    }
    if (dayEntries.every(entry => entry.status === 'approved')) return 'approved';
    if (dayEntries.some(entry => entry.status === 'pending')) return 'pending';
    
    return 'draft';
  };

  // Vérifier s'il y a des entrées en brouillon pour une date
  const hasDraftEntriesForDay = selectedDate ? timesheet.entries.some(entry => entry.date === selectedDate && entry.status === 'draft') : false;

  // Vérifier s'il y a des entrées en brouillon
  const hasDraftEntries = timesheet.entries.some(entry => entry.status === 'draft');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 mb-3 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
      {/* En-tête - MOBILE RESPONSIVE */}
      <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-2">
        <div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {isAdmin ? (
              // Pour les admins, ne pas afficher le résumé de période
              selectedDate ? (
                stats.entriesCount > 0 ? `${stats.entriesCount} entrée${stats.entriesCount > 1 ? 's' : ''}` : 'Aucune entrée'
              ) : null
            ) : selectedDate ? (
              stats.entriesCount > 0 ? `${stats.entriesCount} entrée${stats.entriesCount > 1 ? 's' : ''}` : 'Aucune entrée'
            ) : (
              `${formatDate(timesheet.weekStarting)} - ${formatDate(timesheet.weekEnding)} • ${stats.workingDays} jour${stats.workingDays > 1 ? 's' : ''} travaillé${stats.workingDays > 1 ? 's' : ''}`
            )}
          </p>
        </div>
      </div>

      {/* Statistiques détaillées - MOBILE RESPONSIVE */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-1.5 mb-2 transition-colors duration-200">
        {/* Layout mobile: statistiques à gauche, bouton à droite sur la même ligne */}
        <div className="flex items-start justify-between relative">
          {/* Statistiques à gauche - UNIQUEMENT pour le jour sélectionné si en mode jour */}
          <div className="flex flex-col space-y-0.5 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3 flex-1">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
              <span className="text-gray-600 dark:text-gray-400 text-sm">Normales :</span>
              <span className="font-semibold text-blue-700 dark:text-blue-400 ml-1 text-sm">{Math.floor(stats.normalHours)}h</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 flex-shrink-0"></div>
              <span className="text-gray-600 dark:text-gray-400 text-sm">Supp :</span>
              <span className="font-semibold text-purple-700 dark:text-purple-400 ml-1 text-sm">{Math.floor(stats.overtimeHours)}h</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 mr-1 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400 text-xs">Total :</span>
              <span className="font-bold text-green-700 dark:text-green-400 ml-1 text-sm">{Math.floor(stats.totalHours)}h</span>
            </div>
            {selectedDate && stats.absenceHours > 0 && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 flex-shrink-0"></div>
                <span className="text-gray-600 dark:text-gray-400 text-sm">Absence :</span>
                <span className="font-semibold text-orange-700 dark:text-orange-400 ml-1 text-sm">{Math.floor(stats.absenceHours)}h</span>
              </div>
            )}
            {selectedDate && stats.leaveDays > 0 && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-teal-500 rounded-full mr-2 flex-shrink-0"></div>
                <span className="text-gray-600 dark:text-gray-400 text-sm">Congé</span>
                <span className="font-semibold text-teal-700 dark:text-teal-400 ml-1 text-sm">jour complet</span>
              </div>
            )}
          </div>
          
          {/* Bouton Soumettre à droite sur mobile */}
          <div className="flex-shrink-0 ml-1">
            {!isAdmin && selectedDate && timesheet && hasDraftEntriesForDay && onSubmitDay && (
              <button
                onClick={() => onSubmitDay(selectedDate)}
                className="inline-flex items-center justify-center px-1.5 py-0.5 border border-transparent text-xs font-medium rounded text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500 whitespace-nowrap transition-colors duration-200"
              >
                <Send size={12} className="mr-1" />
                Soumettre
              </button>
            )}

            {!isAdmin && !selectedDate && timesheet.status === 'draft' && hasDraftEntries && onSubmit && (
              <button
                onClick={onSubmit}
                className="inline-flex items-center justify-center px-1.5 py-0.5 border border-transparent text-xs font-medium rounded text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500 whitespace-nowrap transition-colors duration-200"
              >
                <Send size={12} className="mr-1" />
                Soumettre
              </button>
            )}
          </div>
        </div>
        
        {/* Statut en dessous sur mobile */}
        <div className="flex justify-start mt-0">
          {selectedDate ? (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              getDayStatus(selectedDate) === 'approved' ? 'bg-pastel-green text-green-700' :
              getDayStatus(selectedDate) === 'pending' ? 'bg-pastel-blue text-blue-700' :
              getDayStatus(selectedDate) === 'rejected' ? 'bg-pastel-red text-red-700' :
              getDayStatus(selectedDate) === 'partially_approved' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200' :
              getDayStatus(selectedDate) === 'draft' ? 'bg-pastel-yellow text-yellow-700' :
              'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {getDayStatus(selectedDate) === 'approved' && <CheckCircle size={10} className="mr-1" />}
              {getDayStatus(selectedDate) === 'pending' && <Send size={10} className="mr-1" />}
              {getDayStatus(selectedDate) === 'rejected' && <XCircle size={10} className="mr-1" />}
              {getDayStatus(selectedDate) === 'partially_approved' && <AlertTriangle size={10} className="mr-1" />}
              {getDayStatus(selectedDate) === 'not_registered' && <Clock size={10} className="mr-1" />}
              {getDayStatus(selectedDate) === 'draft' && <Clock size={10} className="mr-1" />}
              {getDayStatus(selectedDate) === 'approved' ? 'Approuvé' :
               getDayStatus(selectedDate) === 'pending' ? 'Soumis' :
               getDayStatus(selectedDate) === 'rejected' ? 'Refusé' :
               getDayStatus(selectedDate) === 'partially_approved' ? 'Partiellement approuvé' :
               getDayStatus(selectedDate) === 'draft' ? 'Brouillon' :
               'Non enregistré'}
            </span>
          ) : (
            getStatusBadge()
          )}
        </div>
      </div>
      
      {/* Boutons d'action - MOBILE RESPONSIVE */}
      <div className="flex flex-col space-y-0.5 sm:flex-row sm:flex-wrap sm:gap-1 sm:justify-end sm:space-y-0">
        {/* Boutons admin pour approuver/refuser */}
        {isAdmin && timesheet.status === 'submitted' && !selectedDate && (
          <>
            {onReject && (
              <button
                onClick={onReject}
                className="inline-flex items-center justify-center px-2 py-1 border border-red-300 dark:border-red-600 text-xs font-medium rounded text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors duration-200"
              >
                <XCircle size={16} className="mr-1" />
                Refuser toute la semaine
              </button>
            )}

            {onApprove && (
              <button
                onClick={onApprove}
                className="inline-flex items-center justify-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 dark:text-green-400 bg-pastel-green dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors duration-200"
              >
                <CheckCircle size={16} className="mr-1" />
                Approuver toute la semaine
              </button>
            )}
          </>
        )}

        {/* Messages d'état */}
        {timesheet.status === 'approved' && (
          <div className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900 rounded transition-colors duration-200">
            <Eye size={16} className="mr-1" />
            {selectedDate ? 'Jour approuvé' : 'Semaine approuvée'}
          </div>
        )}

        {timesheet.status === 'rejected' && (
          <div className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900 rounded transition-colors duration-200">
            <XCircle size={16} className="mr-1" />
            {selectedDate ? 'Jour refusé' : 'Semaine refusée'}
          </div>
        )}

        {selectedDate && getDayStatus(selectedDate) === 'pending' && !isAdmin && (
          <div className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 rounded transition-colors duration-200">
            <Send size={16} className="mr-1" />
            Jour soumis pour approbation
          </div>
        )}
      </div>
    </div>
  );
};

export default TimesheetSummary;