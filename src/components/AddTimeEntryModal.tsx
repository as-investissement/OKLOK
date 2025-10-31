import React, { useState, useEffect } from 'react';
import { X, Clock, Building2, AlertTriangle } from 'lucide-react';
import { useTimesheets } from '../context/TimesheetContext';
import { TimeEntry } from '../types';
import LeaveConflictModal from './LeaveConflictModal';

interface AddTimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  selectedDate: string;
  timesheetId: string;
  editingEntry?: TimeEntry | null;
  existingEntries?: TimeEntry[];
}

const AddTimeEntryModal: React.FC<AddTimeEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  timesheetId,
  editingEntry,
  existingEntries = []
}) => {
  const { availableProjects, deleteTimeEntry, updateTimeEntry } = useTimesheets();

  // Vérifier si la journée a un CONGÉ PAYÉ de TOUTE LA JOURNÉE (8h ou 7h vendredi)
  // ABSENCE n'est PLUS bloquante (déduction automatique)
  const isFriday = new Date(selectedDate).getDay() === 5;
  const fullDayHours = isFriday ? 7 : 8;

  console.log('🔍 Vérification blocage:', {
    selectedDate,
    existingEntries: existingEntries.filter(e => e.date === selectedDate).map(e => ({
      normalHours: e.normalHours,
      isPaidLeave: e.isPaidLeave,
      isAbsence: e.isAbsence,
      project: e.project
    }))
  });

  const hasFullDayLeaveOrAbsence = existingEntries.some(
    entry => entry.date === selectedDate &&
    entry.isPaidLeave && // SEULEMENT congé payé bloque
    (entry.normalHours >= fullDayHours) &&
    (!editingEntry || entry.id !== editingEntry.id)
  );

  console.log('🚫 Blocage actif?', hasFullDayLeaveOrAbsence);
  const [formData, setFormData] = useState({
    projectId: '',
    normalHours: 0,
    overtimeHours: 0,
    isPaidLeave: false,
    isAbsence: false,
    leaveType: '',
    absenceHours: 0
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoursChanged, setHoursChanged] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingEntries, setConflictingEntries] = useState<Array<{ id: string }>>([]);
  const [modalType, setModalType] = useState<'leave' | 'absence' | 'partial_absence_overflow'>('absence');

  useEffect(() => {
    if (isOpen) {
      // Calculer les heures par défaut selon le jour
      const isFriday = new Date(selectedDate).getDay() === 5;
      const defaultHours = isFriday ? 7 : 8;

      // Si on édite une absence existante, utiliser ses heures
      // Sinon, initialiser à 0 (sera rempli à defaultHours quand on coche "Absence")
      const initialAbsenceHours = editingEntry?.isAbsence
        ? (editingEntry?.absenceHours || defaultHours)
        : 0;

      console.log('📝 Initialisation du formulaire:', {
        editingEntry: editingEntry?.id,
        isAbsence: editingEntry?.isAbsence,
        normalHours: editingEntry?.normalHours,
        initialAbsenceHours,
        isFriday,
        defaultHours
      });

      setFormData({
        projectId: editingEntry?.projectId || '',
        normalHours: editingEntry?.normalHours || 0,
        overtimeHours: editingEntry?.overtimeHours || 0,
        isPaidLeave: editingEntry?.isPaidLeave || false,
        isAbsence: editingEntry?.isAbsence || false,
        leaveType: editingEntry?.leaveType || '',
        absenceHours: initialAbsenceHours
      });
      setError('');
      setHoursChanged(false);
    }
  }, [isOpen, editingEntry, selectedDate]);

  // Détecter si les heures ont changé par rapport à l'entrée initiale
  useEffect(() => {
    if (editingEntry) {
      const initialTotal = (editingEntry.normalHours || 0) + (editingEntry.overtimeHours || 0);
      const currentTotal = formData.normalHours + formData.overtimeHours;
      setHoursChanged(initialTotal !== currentTotal);
    }
  }, [formData.normalHours, formData.overtimeHours, editingEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (hasFullDayLeaveOrAbsence && !editingEntry) {
        setError('Impossible d\'ajouter : journée complète en congés payés');
        return;
      }

      if (!formData.isPaidLeave && !formData.isAbsence && !formData.projectId) {
        setError('Veuillez sélectionner un projet');
        return;
      }

      if (!formData.isPaidLeave && !formData.isAbsence && formData.normalHours === 0 && formData.overtimeHours === 0) {
        setError('Veuillez saisir au moins des heures normales ou supplémentaires');
        return;
      }

      // Si on ajoute une absence et qu'il en existe déjà une, mettre à jour l'existante au lieu d'en créer une nouvelle
      if (formData.isAbsence && !editingEntry) {
        const existingAbsence = existingEntries.find(
          entry => entry.date === selectedDate && entry.isAbsence
        );

        if (existingAbsence) {
          // Mettre à jour l'absence existante
          const isFriday = new Date(selectedDate).getDay() === 5;
          const fullDayHours = isFriday ? 7 : 8;

          await updateTimeEntry(timesheetId, existingAbsence.id, {
            absenceHours: formData.absenceHours,
            normalHours: 0,
            overtimeHours: 0,
            leaveType: formData.leaveType || null
          });

          setLoading(false);
          onClose();
          return;
        }
      }

      const isFriday = new Date(selectedDate).getDay() === 5;
      const fullDayHours = isFriday ? 7 : 8;

      // Calculer le total des heures déjà enregistrées dans la journée (hors entrée en cours d'édition)
      const existingHours = existingEntries
        .filter(e => e.date === selectedDate && (!editingEntry || e.id !== editingEntry.id))
        .reduce((sum, e) => sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0);

      // LOGIQUE DE DÉDUCTION AUTOMATIQUE D'ABSENCE
      // Si on ajoute des heures de travail (pas congé, pas absence) et qu'il y a déjà une absence dans la journée
      if (!formData.isPaidLeave && !formData.isAbsence && !editingEntry) {
        const existingAbsence = existingEntries.find(
          e => e.date === selectedDate && e.isAbsence && !e.isPaidLeave
        );

        if (existingAbsence) {
          const newWorkHours = formData.normalHours + formData.overtimeHours;

          // Calculer le total SANS l'absence (car on va la déduire)
          const existingWorkHours = existingEntries
            .filter(e => e.date === selectedDate && (!editingEntry || e.id !== editingEntry.id) && !e.isAbsence && !e.isPaidLeave)
            .reduce((sum, e) => sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0);

          const newTotal = existingWorkHours + newWorkHours;

          if (newTotal > fullDayHours) {
            setError(`Dépassement : ${newTotal}h > ${fullDayHours}h (quota journée)`);
            setLoading(false);
            return;
          }

          // Calculer la nouvelle valeur d'absence (déduction automatique)
          const currentAbsenceHours = existingAbsence.absenceHours || existingAbsence.normalHours || 0;
          const newAbsenceHours = Math.max(0, currentAbsenceHours - newWorkHours);

          console.log('🔄 Déduction automatique d\'absence:', {
            absenceInitiale: currentAbsenceHours,
            heuresTravailAjoutées: newWorkHours,
            nouvelleAbsence: newAbsenceHours,
            totalTravail: newTotal
          });

          // Mettre à jour l'absence avant d'ajouter la nouvelle entrée
          if (newAbsenceHours > 0) {
            await updateTimeEntry(timesheetId, existingAbsence.id, {
              absenceHours: newAbsenceHours,
              normalHours: 0,
              overtimeHours: 0
            });
          } else {
            // Si l'absence tombe à 0, la supprimer
            await deleteTimeEntry(timesheetId, existingAbsence.id);
          }

          await new Promise(resolve => setTimeout(resolve, 300));
          window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // LOGIQUE POUR ABSENCE PARTIELLE
      if (formData.isAbsence && formData.absenceHours < fullDayHours) {
        // Cas 1: Ajout d'une absence partielle
        if (!editingEntry) {
          const newTotal = existingHours + formData.absenceHours;

          if (existingHours >= fullDayHours) {
            // Journée déjà complète
            setError('Journée complète');
            setLoading(false);
            return;
          } else if (newTotal > fullDayHours) {
            // Dépasse le quota
            setModalType('partial_absence_overflow');
            setConflictingEntries(existingEntries
              .filter(e => e.date === selectedDate && !e.isPaidLeave && !e.isAbsence)
              .map(e => ({ id: e.id }))
              .slice(-1) // Dernière entrée
            );
            setShowConflictModal(true);
            setLoading(false);
            return;
          }
          // Sinon, on continue normalement (pas de modal)
        }
        // Cas 2: Modification d'une entrée en absence partielle
        else {
          const originalHours = (editingEntry.normalHours || 0) + (editingEntry.overtimeHours || 0);
          const newTotal = existingHours + formData.absenceHours;

          if (formData.absenceHours > originalHours) {
            // L'absence augmente
            if (newTotal > fullDayHours) {
              // Dépasse le quota
              setModalType('partial_absence_overflow');
              setConflictingEntries(existingEntries
                .filter(e => e.date === selectedDate && e.id !== editingEntry.id && !e.isPaidLeave && !e.isAbsence)
                .map(e => ({ id: e.id }))
                .slice(-1) // Dernière entrée
              );
              setShowConflictModal(true);
              setLoading(false);
              return;
            }
          }
          // Sinon, pas de modal (diminution ou reste dans le quota)
        }
      }

      // LOGIQUE POUR CONGÉ PAYÉ OU ABSENCE COMPLÈTE (8h/7h)
      if (formData.isPaidLeave || (formData.isAbsence && formData.absenceHours >= fullDayHours)) {
        // Vérifier s'il y a des entrées de travail
        const workEntries = existingEntries.filter(e =>
          e.date === selectedDate &&
          (!editingEntry || e.id !== editingEntry.id) &&
          !e.isPaidLeave &&
          !e.isAbsence
        );

        if (workEntries.length > 0) {
          setModalType(formData.isPaidLeave ? 'leave' : 'absence');
          setConflictingEntries(workEntries.map(e => ({ id: e.id })));
          setShowConflictModal(true);
          setLoading(false);
          return;
        }
      }

      // Calculer les heures pour congés payés (toujours journée complète)
      const isFriday = new Date(selectedDate).getDay() === 5;
      const fullDayHours = isFriday ? 7 : 8;

      console.log('📝 FORMDATA COMPLET AVANT entryData:', formData);

      const entryData = {
        userId: editingEntry?.userId || '',
        date: selectedDate,
        projectId: formData.isPaidLeave || formData.isAbsence ? null : formData.projectId,
        project: formData.isPaidLeave ? 'Congés payés' : formData.isAbsence ? 'Absence' : undefined,
        normalHours: formData.isPaidLeave ? fullDayHours : formData.isAbsence ? 0 : formData.normalHours,
        overtimeHours: formData.isPaidLeave || formData.isAbsence ? 0 : formData.overtimeHours,
        absenceHours: formData.isAbsence ? formData.absenceHours : 0,
        status: 'draft' as const,
        isPaidLeave: formData.isPaidLeave,
        isAbsence: formData.isAbsence,
        leaveType: formData.isPaidLeave || formData.isAbsence ? formData.leaveType : null
      };

      console.log('🔍 DEBUG handleSubmit - entryData AVANT onSave:', {
        formData_absenceHours: formData.absenceHours,
        formData_isAbsence: formData.isAbsence,
        entryData_absenceHours: entryData.absenceHours,
        entryData_normalHours: entryData.normalHours,
        entryData
      });

      onSave(entryData);
      onClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleConflictConfirm = async () => {
    setShowConflictModal(false);
    setLoading(true);

    try {
      const isFriday = new Date(selectedDate).getDay() === 5;
      const fullDayHours = isFriday ? 7 : 8;

      // Cas 1: Dépassement d'heures avec absence partielle
      if (modalType === 'partial_absence_overflow') {
        // Calculer le total actuel des heures (hors entrée en édition)
        const existingHours = existingEntries
          .filter(e => e.date === selectedDate && (!editingEntry || e.id !== editingEntry.id))
          .reduce((sum, e) => sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0);

        const newTotal = existingHours + formData.absenceHours;
        const overflow = newTotal - fullDayHours;

        // Trouver la dernière entrée de travail
        const lastWorkEntry = existingEntries
          .filter(e => e.date === selectedDate && (!editingEntry || e.id !== editingEntry.id) && !e.isPaidLeave && !e.isAbsence)
          .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime())
          .pop();

        if (lastWorkEntry && overflow > 0) {
          const lastEntryTotal = (lastWorkEntry.normalHours || 0) + (lastWorkEntry.overtimeHours || 0);
          const newLastEntryTotal = Math.max(0, lastEntryTotal - overflow);

          // Ajuster la dernière entrée
          if (newLastEntryTotal > 0) {
            await updateTimeEntry(timesheetId, lastWorkEntry.id, {
              normalHours: newLastEntryTotal,
              overtimeHours: 0
            });
          } else {
            // Si la dernière entrée devient 0 ou négative, la supprimer
            await deleteTimeEntry(timesheetId, lastWorkEntry.id);
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      // Cas 2: Congé payé ou absence complète - supprimer toutes les entrées
      else {
        for (const entry of conflictingEntries) {
          await deleteTimeEntry(timesheetId, entry.id);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
      await new Promise(resolve => setTimeout(resolve, 500));

      const entryData = {
        userId: editingEntry?.userId || '',
        date: selectedDate,
        projectId: formData.isPaidLeave || formData.isAbsence ? null : formData.projectId,
        project: formData.isPaidLeave ? 'Congés payés' : formData.isAbsence ? 'Absence' : undefined,
        normalHours: formData.isPaidLeave ? fullDayHours : formData.isAbsence ? 0 : formData.normalHours,
        overtimeHours: formData.isPaidLeave || formData.isAbsence ? 0 : formData.overtimeHours,
        absenceHours: formData.isAbsence ? formData.absenceHours : 0,
        status: 'draft' as const,
        isPaidLeave: formData.isPaidLeave,
        isAbsence: formData.isAbsence,
        leaveType: formData.isPaidLeave || formData.isAbsence ? formData.leaveType : null
      };

      console.log('🔍 DEBUG handleConflictConfirm - entryData AVANT onSave:', {
        formData_absenceHours: formData.absenceHours,
        formData_isAbsence: formData.isAbsence,
        entryData_absenceHours: entryData.absenceHours,
        entryData_normalHours: entryData.normalHours,
        entryData
      });

      onSave(entryData);
      onClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la modification des entrées');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const date = new Date(selectedDate);
  const dayOfWeek = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  const dayName = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
  const formattedDate = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  if (hasFullDayLeaveOrAbsence && !editingEntry) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-orange-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Journée bloquée</h2>
          </div>
          <p className="text-gray-700 mb-6">
            Cette journée a déjà un congé payé de toute la journée ({fullDayHours}h).
            <br />
            <strong>Impossible d'ajouter d'autres heures.</strong>
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <LeaveConflictModal
        isOpen={showConflictModal}
        onClose={() => {
          setShowConflictModal(false);
          setConflictingEntries([]);
        }}
        onConfirm={handleConflictConfirm}
        conflictingDays={[{ date: `${dayName} ${formattedDate}`, entries: conflictingEntries.length }]}
        leaveType={modalType}
      />
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingEntry ? 'Modifier l\'entrée' : 'Ajouter des heures'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            {/* Type d'entrée */}
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPaidLeave"
                  checked={formData.isPaidLeave}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    isPaidLeave: e.target.checked,
                    isAbsence: false // Exclusif
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="isPaidLeave" className="ml-2 block text-sm text-gray-900">
                  Congé payé
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAbsence"
                  checked={formData.isAbsence}
                  onChange={(e) => {
                    const isChecked = e.target.checked;

                    console.log('🔍 Checkbox absence cliquée:', {
                      isChecked,
                      editingEntry: editingEntry?.id,
                      selectedDate,
                      existingEntries: existingEntries.map(e => ({
                        id: e.id,
                        date: e.date,
                        isAbsence: e.isAbsence,
                        absenceHours: e.absenceHours
                      }))
                    });

                    if (isChecked && !editingEntry) {
                      // Vérifier s'il existe déjà une absence pour cette date
                      const existingAbsence = existingEntries.find(
                        entry => entry.date === selectedDate && entry.isAbsence
                      );

                      console.log('🔍 Absence existante trouvée?', existingAbsence);

                      if (existingAbsence) {
                        console.log('❌ BLOQUÉ: Une absence existe déjà pour cette date');
                        alert('Une absence existe déjà pour cette journée. Vous ne pouvez pas en ajouter une autre.');
                        // Ne pas cocher la case
                        e.target.checked = false;
                        return;
                      }
                    }

                    // Calculer les heures par défaut selon le jour
                    const isFriday = new Date(selectedDate).getDay() === 5;
                    const defaultHours = isFriday ? 7 : 8;

                    setFormData(prev => ({
                      ...prev,
                      isAbsence: isChecked,
                      isPaidLeave: false, // Exclusif
                      // Pré-remplir avec les heures par défaut de la journée (8h ou 7h)
                      absenceHours: isChecked ? defaultHours : 0
                    }));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="isAbsence" className="ml-2 block text-sm text-gray-900">
                  Absence
                </label>
              </div>
            </div>

            {/* Type de congé/absence */}
            {(formData.isPaidLeave || formData.isAbsence) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de {formData.isPaidLeave ? 'congé' : 'absence'}
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 [&>option]:bg-white [&>option]:dark:bg-gray-700 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
                  required
                  disabled={loading}
                >
                  <option value="">Sélectionner un type</option>
                  {formData.isPaidLeave ? (
                    <>
                      <option value="conge_annuel">Congé annuel</option>
                      <option value="rtt">RTT</option>
                      <option value="conge_maladie">Congé maladie</option>
                      <option value="conge_maternite">Congé maternité</option>
                      <option value="conge_paternite">Congé paternité</option>
                    </>
                  ) : (
                    <>
                      <option value="absence_justifiee">Absence justifiée</option>
                      <option value="absence_injustifiee">Absence injustifiée</option>
                      <option value="retard">Retard</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Heures d'absence */}
            {formData.isAbsence && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Heures d'absence
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={formData.absenceHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, absenceHours: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                  placeholder="Ex: 2"
                />
                {formData.absenceHours > 0 && (
                  <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-2" />
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        {formData.absenceHours}h d'absence seront enregistrées
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Projet (seulement si pas congé/absence) */}
            {!formData.isPaidLeave && !formData.isAbsence && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Projet/Chantier
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 [&>option]:bg-white [&>option]:dark:bg-gray-700 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
                  required
                  disabled={loading}
                >
                  <option value="">Sélectionner un projet</option>
                  {availableProjects?.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Heures (seulement si pas congé/absence) */}
            {!formData.isPaidLeave && !formData.isAbsence && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Heures normales
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formData.normalHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, normalHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Heures supplémentaires
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formData.overtimeHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {editingEntry && hoursChanged && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Recalcul automatique</p>
                  <p>La modification des heures entrainera le recalcul de toutes les heures enregistrées dans la journée.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Sauvegarde...' : (editingEntry ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};

export default AddTimeEntryModal;