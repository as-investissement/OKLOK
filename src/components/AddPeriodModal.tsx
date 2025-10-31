import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Building2, AlertTriangle, ChevronDown } from 'lucide-react';
import { useTimesheets } from '../context/TimesheetContext';
import { useAuth } from '../context/AuthContext';
import { getWeekRange, generateId } from '../utils/helpers';
import LeaveConflictModal from './LeaveConflictModal';

interface AddPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddPeriodModal: React.FC<AddPeriodModalProps> = ({ isOpen, onClose }) => {
  const { availableProjects, addTimeEntry, submitDayEntries, timesheets, addTimesheet, deleteTimeEntry } = useTimesheets();
  const { currentUser, companies, getProjectsForCompany } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [isPaidLeave, setIsPaidLeave] = useState(false);
  const [isAbsence, setIsAbsence] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingDays, setConflictingDays] = useState<Array<{ date: string; entries: number }>>([]);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const handleClose = () => {
    setStartDate('');
    setEndDate('');
    setProjectId('');
    setError('');
    setLoading(false);
    setProjectSearchTerm('');
    setShowProjectDropdown(false);
    setIsPaidLeave(false);
    setIsAbsence(false);
    setShowConflictModal(false);
    setConflictingDays([]);
    setPendingSubmit(false);
    onClose();
  };

  const getCurrentWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    const todayMidnight = new Date(today);
    todayMidnight.setHours(23, 59, 59, 999);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatDate(monday),
      end: formatDate(todayMidnight)
    };
  };

  const validatePeriod = (): boolean => {
    setError('');

    if (!startDate || !endDate) {
      setError('Veuillez sélectionner une date de début et de fin');
      return false;
    }

    if (!isPaidLeave && !isAbsence && !projectId) {
      setError('Veuillez sélectionner un chantier');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      setError('La date de début doit être avant la date de fin');
      return false;
    }


    const currentWeek = getCurrentWeekRange();
    const weekStart = new Date(currentWeek.start);
    const weekEnd = new Date(currentWeek.end);

    if (start < weekStart || end > weekEnd) {
      setError('La période doit être dans la semaine en cours');
      return false;
    }

    return true;
  };

  const getHoursForDay = (date: Date): { normalHours: number; overtimeHours: number } => {
    const dayOfWeek = date.getDay();

    switch (dayOfWeek) {
      case 1: // Lundi
      case 2: // Mardi
      case 3: // Mercredi
      case 4: // Jeudi
        return { normalHours: 8, overtimeHours: 0 };
      case 5: // Vendredi
        return { normalHours: 7, overtimeHours: 0 };
      case 6: // Samedi
      case 0: // Dimanche
        return { normalHours: 0, overtimeHours: 8 };
      default:
        return { normalHours: 0, overtimeHours: 0 };
    }
  };

  const generateEntries = async (submit: boolean = false) => {
    if (!validatePeriod()) {
      return;
    }

    setLoading(true);

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: Date[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }

      const weekRange = getWeekRange(startDate);

      const existingTimesheet = timesheets.find(ts =>
        ts.weekStarting === weekRange.start &&
        ts.weekEnding === weekRange.end &&
        ts.userId === currentUser?.id
      );

      if (existingTimesheet) {
        const conflictingDaysForError: Array<{ date: string; status: string }> = [];
        const conflictingDaysForDeletion: Array<{ date: string; entries: number; entryIds: string[] }> = [];

        for (const date of dates) {
          const dateString = date.toISOString().split('T')[0];
          const existingEntries = existingTimesheet.entries.filter(e => e.date === dateString);

          if (existingEntries.length > 0) {
            const dayOfWeek = date.toLocaleDateString('fr-FR', { weekday: 'long' });
            const dayName = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
            const formattedDate = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

            const hasLeaveOrAbsence = existingEntries.some(e => e.isPaidLeave || e.isAbsence);

            if (hasLeaveOrAbsence) {
              conflictingDaysForError.push({
                date: `${dayName} ${formattedDate}`,
                status: 'Congés/Absence'
              });
              continue;
            }

            if (isPaidLeave || isAbsence) {
              const workEntries = existingEntries.filter(e => !e.isPaidLeave && !e.isAbsence);
              if (workEntries.length > 0) {
                conflictingDaysForDeletion.push({
                  date: `${dayName} ${formattedDate}`,
                  entries: workEntries.length,
                  entryIds: workEntries.map(e => e.id)
                });
              }
            } else {
              const statuses = existingEntries.map(e => e.status);
              let statusLabel = '';

              if (statuses.includes('approved')) {
                statusLabel = 'Approuvé';
              } else if (statuses.includes('rejected')) {
                statusLabel = 'Refusé';
              } else if (statuses.includes('pending')) {
                statusLabel = 'Soumis';
              } else {
                statusLabel = 'Brouillon';
              }

              conflictingDaysForError.push({
                date: `${dayName} ${formattedDate}`,
                status: statusLabel
              });
            }
          }
        }

        if (conflictingDaysForError.length > 0) {
          const errorMessage = 'Impossible d\'enregistrer :\n' +
            conflictingDaysForError.map(d => `${d.date} - ${d.status}`).join('\n');
          setError(errorMessage);
          setLoading(false);
          return;
        }

        if (conflictingDaysForDeletion.length > 0) {
          setConflictingDays(conflictingDaysForDeletion);
          setPendingSubmit(submit);
          setShowConflictModal(true);
          setLoading(false);
          return;
        }
      }

      let timesheet = existingTimesheet;

      if (!timesheet) {
        const newTimesheet = {
          userId: currentUser?.id || '',
          userName: currentUser?.name || '',
          companyId: currentUser?.companyId || '',
          weekStarting: weekRange.start,
          weekEnding: weekRange.end,
          totalHours: 0,
          status: 'draft' as const,
          entries: [],
          createdAt: new Date().toISOString()
        };

        await addTimesheet(newTimesheet);

        await new Promise(resolve => setTimeout(resolve, 200));

        timesheet = timesheets.find(ts =>
          ts.weekStarting === weekRange.start &&
          ts.weekEnding === weekRange.end &&
          ts.userId === currentUser?.id
        );

        if (!timesheet) {
          setError('Erreur lors de la création de la feuille de temps');
          setLoading(false);
          return;
        }
      }

      const entriesToAdd: any[] = [];

      for (const date of dates) {
        const dateString = date.toISOString().split('T')[0];
        const hours = getHoursForDay(date);

        const newEntry = {
          id: generateId(),
          userId: currentUser?.id || '',
          date: dateString,
          projectId: isPaidLeave || isAbsence ? null : projectId,
          normalHours: isPaidLeave || isAbsence ? 0 : hours.normalHours,
          overtimeHours: isPaidLeave || isAbsence ? 0 : hours.overtimeHours,
          absenceHours: isAbsence ? (date.getDay() === 5 ? 7 : 8) : 0,
          status: 'draft' as const,
          isPaidLeave: isPaidLeave,
          isAbsence: isAbsence,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        entriesToAdd.push({ entry: newEntry, dateString });
      }

      for (const { entry, dateString } of entriesToAdd) {
        addTimeEntry(timesheet.id, entry);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (submit) {
        await new Promise(resolve => setTimeout(resolve, 500));

        for (const { dateString } of entriesToAdd) {
          submitDayEntries(timesheet.id, dateString);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));

      await new Promise(resolve => setTimeout(resolve, 300));

      handleClose();

    } catch (err) {
      setError('Une erreur est survenue lors de l\'enregistrement');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConflictConfirm = async () => {
    setShowConflictModal(false);
    setLoading(true);

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: Date[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }

      const weekRange = getWeekRange(startDate);
      const existingTimesheet = timesheets.find(ts =>
        ts.weekStarting === weekRange.start &&
        ts.weekEnding === weekRange.end &&
        ts.userId === currentUser?.id
      );

      if (!existingTimesheet) {
        setError('Erreur lors de la récupération de la feuille de temps');
        setLoading(false);
        return;
      }

      for (const conflictDay of conflictingDays) {
        for (const entryId of conflictDay.entryIds) {
          await deleteTimeEntry(existingTimesheet.id, entryId);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedTimesheet = timesheets.find(ts =>
        ts.weekStarting === weekRange.start &&
        ts.weekEnding === weekRange.end &&
        ts.userId === currentUser?.id
      );

      if (!updatedTimesheet) {
        setError('Erreur lors de la récupération de la feuille de temps mise à jour');
        setLoading(false);
        return;
      }

      const entriesToAdd: any[] = [];

      for (const date of dates) {
        const dateString = date.toISOString().split('T')[0];
        const hours = getHoursForDay(date);

        const newEntry = {
          id: generateId(),
          userId: currentUser?.id || '',
          date: dateString,
          projectId: isPaidLeave || isAbsence ? null : projectId,
          normalHours: isPaidLeave || isAbsence ? 0 : hours.normalHours,
          overtimeHours: isPaidLeave || isAbsence ? 0 : hours.overtimeHours,
          absenceHours: isAbsence ? (date.getDay() === 5 ? 7 : 8) : 0,
          status: 'draft' as const,
          isPaidLeave: isPaidLeave,
          isAbsence: isAbsence,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        entriesToAdd.push({ entry: newEntry, dateString });
      }

      for (const { entry, dateString } of entriesToAdd) {
        addTimeEntry(updatedTimesheet.id, entry);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (pendingSubmit) {
        await new Promise(resolve => setTimeout(resolve, 500));

        for (const { dateString } of entriesToAdd) {
          submitDayEntries(updatedTimesheet.id, dateString);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
      await new Promise(resolve => setTimeout(resolve, 300));

      handleClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la suppression des entrées');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentWeek = getCurrentWeekRange();

  return (
    <>
      <LeaveConflictModal
        isOpen={showConflictModal}
        onClose={() => {
          setShowConflictModal(false);
          setConflictingDays([]);
          setPendingSubmit(false);
        }}
        onConfirm={handleConflictConfirm}
        conflictingDays={conflictingDays}
        leaveType={isPaidLeave ? 'leave' : 'absence'}
      />
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Enregistrer une période
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              <CalendarIcon className="h-4 w-4 inline mr-2" />
              Date de début
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => {
                if (!loading) {
                  e.currentTarget.showPicker?.();
                }
              }}
              min={currentWeek.start}
              max={currentWeek.end}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors cursor-pointer"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              <CalendarIcon className="h-4 w-4 inline mr-2" />
              Date de fin
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => {
                if (!loading) {
                  e.currentTarget.showPicker?.();
                }
              }}
              min={startDate || currentWeek.start}
              max={currentWeek.end}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors cursor-pointer"
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="paidLeave"
                    checked={isPaidLeave}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsPaidLeave(checked);
                      if (checked) {
                        setIsAbsence(false);
                        setProjectId('');
                        setProjectSearchTerm('');
                      }
                    }}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-2 border-gray-300 rounded-md mr-3 checked:bg-blue-600 checked:border-blue-600"
                    disabled={loading}
                  />
                  {isPaidLeave && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg className="h-3 w-3 text-white font-bold" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <label htmlFor="paidLeave" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                  🏖️ Congés payés
                </label>
              </div>

              <div className="flex items-center">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="absent"
                    checked={isAbsence}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsAbsence(checked);
                      if (checked) {
                        setIsPaidLeave(false);
                        setProjectId('');
                        setProjectSearchTerm('');
                      }
                    }}
                    className="h-5 w-5 text-red-600 focus:ring-red-500 border-2 border-gray-300 rounded-md mr-3 checked:bg-red-600 checked:border-red-600"
                    disabled={loading}
                  />
                  {isAbsence && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg className="h-3 w-3 text-white font-bold" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <label htmlFor="absent" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                  ❌ Absent
                </label>
              </div>
            </div>
          </div>

          {!isPaidLeave && !isAbsence && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Building2 className="h-4 w-4 inline mr-2" />
              Chantier
            </label>
            <div className="relative">
              <input
                type="text"
                value={projectId ? (() => {
                  const userProjects = currentUser?.companyId ? getProjectsForCompany(currentUser.companyId) : [];
                  const selectedProject = userProjects.find(p => p.id === projectId);
                  if (selectedProject) {
                    const primaryCompany = companies.find(c => c.id === selectedProject.companyId || c.id === selectedProject.primaryCompanyId);
                    const prefix = primaryCompany ? primaryCompany.name.charAt(0).toUpperCase() : '';
                    const displayName = selectedProject.originalName || selectedProject.name;
                    const reference = selectedProject.reference ? ` - ${selectedProject.reference}` : '';
                    return prefix ? `${prefix} - ${displayName}${reference}` : `${displayName}${reference}`;
                  }
                  return '';
                })() : projectSearchTerm}
                onChange={(e) => {
                  setProjectSearchTerm(e.target.value);
                  setProjectId('');
                  setShowProjectDropdown(true);
                }}
                onFocus={() => setShowProjectDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowProjectDropdown(false), 200);
                }}
                placeholder="Taper pour rechercher un chantier..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => {
                  setShowProjectDropdown(!showProjectDropdown);
                  if (!showProjectDropdown) {
                    setProjectSearchTerm('');
                  }
                }}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                disabled={loading}
              >
                <ChevronDown className="h-4 w-4" />
              </button>

              {showProjectDropdown && !loading && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {(() => {
                    const userProjects = currentUser?.companyId ? getProjectsForCompany(currentUser.companyId) : [];
                    const filteredProjects = projectSearchTerm.trim() === ''
                      ? userProjects
                      : userProjects.filter(project =>
                          project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                          (project.reference && project.reference.toLowerCase().includes(projectSearchTerm.toLowerCase()))
                        );

                    return filteredProjects.length > 0 ? (
                      filteredProjects.map(project => {
                        const primaryCompany = companies.find(c => c.id === project.companyId || c.id === project.primaryCompanyId);
                        const prefix = primaryCompany ? primaryCompany.name.charAt(0).toUpperCase() : '';
                        const displayName = project.originalName || project.name;
                        const fullName = prefix ? `${prefix} - ${displayName}` : displayName;

                        return (
                          <button
                            key={project.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setProjectId(project.id);
                              setProjectSearchTerm('');
                              setShowProjectDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-blue-900 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{fullName}</span>
                              {project.reference && (
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{project.reference}</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                        Aucun chantier trouvé pour "{projectSearchTerm}"
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">{error}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-blue-900 disabled:opacity-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => generateEntries(false)}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => generateEntries(true)}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer et soumettre'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default AddPeriodModal;
