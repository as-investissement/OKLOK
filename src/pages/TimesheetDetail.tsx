import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTimesheets } from '../context/TimesheetContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, calculateDuration, generateId, canRecordHours, getWeekRange, getEntryDisplayName } from '../utils/helpers';
import { ArrowLeft, Plus, CreditCard as Edit2, Trash2, Clock, MapPin, Save, X, Send, CheckCircle, XCircle, AlertTriangle, Calendar, Building2, User, Eye, ChevronDown } from 'lucide-react';
import TimesheetSummary from '../components/TimesheetSummary';
import ConfirmationModal from '../components/ConfirmationModal';
import ErrorModal from '../components/ErrorModal';
import IncompleteDayModal from '../components/IncompleteDayModal';
import PaidLeaveRemovalModal from '../components/PaidLeaveRemovalModal';

const TimesheetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { getTimesheet, addTimeEntry, updateTimeEntry, deleteTimeEntry, submitTimesheet, submitDayEntries, getTimesheetDays, approveDayById, rejectDayById } = useTimesheets();
  const { currentUser, isAdmin, projects, getProjectsForCompany, companies, employees } = useAuth();

  const timesheet = getTimesheet(id || '');
  const selectedDate = searchParams.get('date');
  const fromCalendar = searchParams.get('from') === 'calendar';
  const openForm = searchParams.get('openForm') === 'true';

  // Déclarer TOUS les hooks en premier, sans conditions
  const [showAddEntryForm, setShowAddEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'submit' | 'delete' | 'reject';
    data?: any;
  } | null>(null);
  const [formData, setFormData] = useState({
    projectId: '',
    normalHours: 0,
    overtimeHours: 0,
    isPaidLeave: false,
    isAbsence: false,
    leaveType: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Early return if timesheet is not found to prevent undefined errors
  if (!timesheet) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Feuille de temps introuvable</h2>
          <p className="text-gray-600 mb-4">La feuille de temps demandée n'existe pas.</p>
          <button
            onClick={() => navigate('/timesheets')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Retour aux feuilles de temps
          </button>
        </div>
      </div>
    );
  }
  
  const [showForm, setShowForm] = useState(false);
  const [editingEntry2, setEditingEntry2] = useState<TimeEntry | null>(null);
  const [formData2, setFormData2] = useState({
    date: selectedDate || new Date().toISOString().split('T')[0],
    totalHours: 0,
    projectId: '',
    normalHours: 0,
    overtimeHours: 0,
    isPaidLeave: false,
    isAbsent: false
  });

  const handleSaveEntry = async (entryData: any) => {
    try {
      if (editingEntry) {
        // Modification d'une entrée existante
        const updatedEntry = {
          ...editingEntry,
          ...entryData,
          updatedAt: new Date().toISOString()
        };
        await updateTimeEntry(updatedEntry);
        setEditingEntry(null);
      } else {
        // Nouvelle entrée
        const newEntry = {
          ...entryData,
          id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await addTimeEntry(timesheet.id, newEntry);
      }
      setShowForm(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction2, setConfirmAction2] = useState<{ type: 'submit' | 'approve' | 'reject' | 'delete' | 'overtime-warning'; data?: any }>({ type: 'submit' });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [pendingLeaveType, setPendingLeaveType] = useState<'leave' | 'absence' | null>(null);
  const [showLeaveConflictModal, setShowLeaveConflictModal] = useState(false);
  const [pendingModification, setPendingModification] = useState<any>(null);
  const [conflictingWorkEntries, setConflictingWorkEntries] = useState<Array<{ id: string }>>([]);
  const [showAbsenceDeductionModal, setShowAbsenceDeductionModal] = useState(false);
  const [pendingAbsenceData, setPendingAbsenceData] = useState<any>(null);
  const [showFullDayAbsenceModal, setShowFullDayAbsenceModal] = useState(false);
  const [showIncompleteDayModal, setShowIncompleteDayModal] = useState(false);
  const [incompleteDayData, setIncompleteDayData] = useState<{ date: string; missingHours: number } | null>(null);
  const [showPaidLeaveRemovalModal, setShowPaidLeaveRemovalModal] = useState(false);
  const [pendingEntryWithPaidLeave, setPendingEntryWithPaidLeave] = useState<{ entry: any; paidLeave: any } | null>(null);

  // Vérifier si les champs heures doivent être désactivés
  const areHoursDisabled = formData2.isPaidLeave || formData2.isAbsent;

  // Écouter les mises à jour globales des données
  useEffect(() => {
    const handleGlobalUpdate = () => {
      setDataVersion(prev => prev + 1);
      console.log('📊 TimesheetDetail: Données mises à jour globalement');
    };

    window.addEventListener('globalTimesheetUpdate', handleGlobalUpdate);
    window.addEventListener('timesheetDataUpdated', handleGlobalUpdate);

    return () => {
      window.removeEventListener('globalTimesheetUpdate', handleGlobalUpdate);
      window.removeEventListener('timesheetDataUpdated', handleGlobalUpdate);
    };
  }, []);

  // Forcer le rechargement des données quand on accède à la page
  useEffect(() => {
    console.log('🔄 TimesheetDetail: Rechargement des données au montage du composant');
    console.log('📊 Feuille de temps actuelle:', timesheet?.id);
    console.log('📊 Nombre d\'entrées:', timesheet?.entries?.length || 0);
    
    if (timesheet && selectedDate) {
      const entriesToShow = timesheet.entries.filter(entry => entry.date === selectedDate);
      console.log('📊 Entrées pour la date sélectionnée:', entriesToShow.length);
      console.log('📅 Entrées filtrées pour', selectedDate, ':', 
        timesheet.entries.filter(entry => entry.date === selectedDate).map(e => ({
          id: e.id,
          date: e.date,
          status: e.status,
          normalHours: e.normalHours,
          overtimeHours: e.overtimeHours
        }))
      );
    }
  }, [timesheet, selectedDate]);

  // Calculer la répartition normale/supplémentaire selon l'ordre d'enregistrement
  // Maximum 8h normales par jour, le reste en supplémentaires
  const existingDayEntries = timesheet.entries.filter(entry =>
    entry.date === formData2.date && (!editingEntry2 || entry.id !== editingEntry2.id)
  );

  // IMPORTANT : Ne compter que les heures de TRAVAIL, pas les absences/congés
  const existingNormalHours = existingDayEntries
    .filter(entry => !entry.isPaidLeave && !entry.isAbsence)
    .reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
  
  const totalHoursToAdd = formData2.normalHours + formData2.overtimeHours;
  let finalNormalHours = 0;
  let finalOvertimeHours = 0;
  
  if (existingNormalHours < 8) {
    // Il reste de la place dans les heures normales
    const normalHoursAvailable = 8 - existingNormalHours;
    finalNormalHours = Math.min(totalHoursToAdd, normalHoursAvailable);
    finalOvertimeHours = Math.max(0, totalHoursToAdd - finalNormalHours);
  } else {
    // Toutes les heures normales sont déjà prises, tout va en supplémentaires
    finalNormalHours = 0;
    finalOvertimeHours = totalHoursToAdd;
  }

  // Obtenir les projets disponibles pour l'utilisateur
  const availableProjects = currentUser?.companyId ? getProjectsForCompany(currentUser.companyId) : [];

  // Fonction pour trouver un projet par son ID (gère les projets secondaires)
  const findProjectById = (projectId: string | null): Project | undefined => {
    if (!projectId) return undefined;

    // Chercher d'abord dans availableProjects
    let project = availableProjects.find(p => p.id === projectId);

    // Si pas trouvé et que c'est un ID de projet secondaire, extraire l'ID original
    if (!project && projectId.includes('-secondary-')) {
      const originalId = projectId.split('-secondary-')[0];
      project = availableProjects.find(p => p.id === projectId || p.id === originalId);
    }

    // Si toujours pas trouvé, chercher dans tous les projets
    if (!project) {
      project = projects.find(p => p.id === projectId || projectId.startsWith(p.id + '-secondary-'));
    }

    return project;
  };

  // Filtrer les projets selon le terme de recherche (nom ou référence)
  // Si le terme de recherche est vide, afficher tous les projets
  const filteredProjects = projectSearchTerm.trim() === ''
    ? availableProjects
    : availableProjects.filter(project =>
        project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
        (project.reference && project.reference.toLowerCase().includes(projectSearchTerm.toLowerCase()))
      );

  // Filtrer les entrées selon la date sélectionnée et trier par ordre chronologique d'enregistrement
  // Les absences et congés sont toujours affichés en dernier
  const entriesToShow = selectedDate
    ? timesheet.entries.filter(entry => entry.date === selectedDate).sort((a, b) => {
        // Si une entrée est une absence/congé et l'autre non, l'absence/congé va à la fin
        const aIsLeaveOrAbsence = a.isPaidLeave || a.isAbsence;
        const bIsLeaveOrAbsence = b.isPaidLeave || b.isAbsence;
        if (aIsLeaveOrAbsence && !bIsLeaveOrAbsence) return 1;
        if (!aIsLeaveOrAbsence && bIsLeaveOrAbsence) return -1;
        // Sinon, tri chronologique normal
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
    : timesheet.entries.sort((a, b) => {
        // Si une entrée est une absence/congé et l'autre non, l'absence/congé va à la fin
        const aIsLeaveOrAbsence = a.isPaidLeave || a.isAbsence;
        const bIsLeaveOrAbsence = b.isPaidLeave || b.isAbsence;
        if (aIsLeaveOrAbsence && !bIsLeaveOrAbsence) return 1;
        if (!aIsLeaveOrAbsence && bIsLeaveOrAbsence) return -1;
        // Sinon, tri chronologique normal
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

  // Grouper les entrées par date pour l'affichage
  const entriesByDate = timesheet.entries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  // Trier les entrées dans chaque groupe de date (absences et congés en dernier)
  Object.keys(entriesByDate).forEach(date => {
    entriesByDate[date].sort((a, b) => {
      // Si une entrée est une absence/congé et l'autre non, l'absence/congé va à la fin
      const aIsLeaveOrAbsence = a.isPaidLeave || a.isAbsence;
      const bIsLeaveOrAbsence = b.isPaidLeave || b.isAbsence;
      if (aIsLeaveOrAbsence && !bIsLeaveOrAbsence) return 1;
      if (!aIsLeaveOrAbsence && bIsLeaveOrAbsence) return -1;
      // Sinon, tri chronologique normal
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  });

  // Fonction pour calculer les heures supplémentaires existantes pour une date
  const getExistingOvertimeHours = (date: string, excludeEntryId?: string): number => {
    const dayEntries = timesheet.entries.filter(entry =>
      entry.date === date && (!excludeEntryId || entry.id !== excludeEntryId) &&
      !entry.isPaidLeave && !entry.isAbsence // Ne compter que les heures de TRAVAIL
    );
    return dayEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
  };

  // Obtenir les informations de l'employé pour les admins
  const getEmployeeInfo = (userId: string) => {
    const employee = employees.find(emp => emp.id === userId);
    if (!employee) {
      return { name: 'Employé inconnu', company: 'Entreprise inconnue', department: '' };
    }

    const company = companies.find(c => c.id === employee.companyId);
    return {
      name: employee.name,
      company: company?.name || 'Entreprise inconnue',
      department: employee.department || ''
    };
  };

  const employeeInfo = getEmployeeInfo(timesheet.userId);

  // Gérer la confirmation de suppression des heures pour ajouter congé/absence
  const handleLeaveWarningConfirm = async () => {
    // Supprimer toutes les entrées de la journée (heures de travail ET absences)
    const entriesToDelete = timesheet.entries.filter(entry =>
      entry.date === formData2.date &&
      !entry.isPaidLeave &&
      (entry.normalHours > 0 || entry.overtimeHours > 0 || entry.absenceHours > 0)
    );

    for (const entry of entriesToDelete) {
      await deleteTimeEntry(timesheet.id, entry.id);
    }

    // Appliquer le congé ou l'absence
    if (pendingLeaveType === 'leave') {
      setFormData2(prev => ({
        ...prev,
        isPaidLeave: true,
        isAbsent: false,
        totalHours: 0,
        normalHours: 0,
        overtimeHours: 0,
        projectId: 'conges-payes'
      }));
      setProjectSearchTerm('CONGÉS PAYÉS');
    } else if (pendingLeaveType === 'absence') {
      setFormData2(prev => ({
        ...prev,
        isAbsent: true,
        isPaidLeave: false,
        totalHours: 0,
        normalHours: 0,
        overtimeHours: 0,
        projectId: 'absent'
      }));
      setProjectSearchTerm('ABSENT');
    }

    setShowLeaveWarning(false);
    setPendingLeaveType(null);
  };

  const handleLeaveConflictConfirm = async () => {
    setShowLeaveConflictModal(false);
    setSubmitting(true);

    try {
      console.log('🔄 Début suppression des entrées conflictuelles:', conflictingWorkEntries);

      // Supprimer toutes les entrées conflictuelles
      for (const entry of conflictingWorkEntries) {
        console.log('🗑️ Suppression de l\'entrée:', entry.id);
        await deleteTimeEntry(timesheet.id, entry.id);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('✅ Toutes les suppressions terminées');

      // Attendre que toutes les suppressions soient bien terminées
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mettre à jour l'entrée modifiée en absence/congé
      if (pendingModification && editingEntry2) {
        console.log('📝 Mise à jour de l\'entrée en absence/congé:', editingEntry2.id);
        await updateTimeEntry(timesheet.id, editingEntry2.id, pendingModification);
      }

      // Attendre que la mise à jour soit terminée avant de notifier
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('📢 Notification du changement global');
      window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));

      resetForm();
      setPendingModification(null);
      setConflictingWorkEntries([]);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des entrées:', error);
      setErrorMessage('Une erreur est survenue lors de la suppression des entrées');
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAbsenceDeductionConfirm = async () => {
    setShowAbsenceDeductionModal(false);
    setSubmitting(true);

    try {
      if (!pendingAbsenceData) return;

      const { absenceHours, existingDayEntries } = pendingAbsenceData;

      // Trouver la dernière entrée de la journée (par ordre chronologique de création)
      const sortedEntries = [...existingDayEntries].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastEntry = sortedEntries[0];

      if (lastEntry) {
        // Déduire les heures d'absence de la dernière entrée
        const newNormalHours = Math.max(0, lastEntry.normalHours - absenceHours);

        await updateTimeEntry(timesheet.id, lastEntry.id, {
          ...lastEntry,
          normalHours: newNormalHours,
          updatedAt: new Date().toISOString()
        });

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Créer l'entrée d'absence
      const newEntry: TimeEntry = {
        id: generateId(),
        userId: currentUser?.id || '',
        date: formData2.date,
        projectId: null,
        project: 'ABSENT',
        normalHours: 0,
        overtimeHours: 0,
        absenceHours: absenceHours,
        status: 'draft',
        isPaidLeave: false,
        isAbsence: true,
        leaveType: 'Absence',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addTimeEntry(timesheet.id, newEntry);
      await new Promise(resolve => setTimeout(resolve, 500));
      window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));

      resetForm();
      setPendingAbsenceData(null);
    } catch (error) {
      console.error('Erreur lors de la déduction des heures:', error);
      setErrorMessage('Une erreur est survenue lors de l\'enregistrement');
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFullDayAbsenceConfirm = async () => {
    setShowFullDayAbsenceModal(false);

    // Définir les heures (8h ou 7h le vendredi)
    const isFriday = new Date(formData2.date).getDay() === 5;
    const hours = isFriday ? 7 : 8;

    setFormData2(prev => ({
      ...prev,
      totalHours: hours,
      normalHours: hours,
      overtimeHours: 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Vérifier si la journée a déjà des CONGÉS PAYÉS "toute la journée" (8h ou 7h)
      // Les absences ne bloquent PAS l'ajout d'heures
      const isFriday = new Date(formData2.date).getDay() === 5;
      const maxDayHours = isFriday ? 7 : 8;

      const hasFullDayPaidLeave = timesheet.entries.some(
        entry => entry.date === formData2.date &&
        (!editingEntry2 || entry.id !== editingEntry2.id) &&
        entry.isPaidLeave &&
        entry.normalHours === maxDayHours
      );

      if (hasFullDayPaidLeave && !formData2.isPaidLeave && !formData2.isAbsent) {
        setErrorMessage('Impossible d\'enregistrer : journée en congés payés complet(e)');
        setShowErrorModal(true);
        return;
      }

      // Logique spécifique pour les absences
      if (formData2.isAbsent && formData2.totalHours > 0) {
        const existingDayEntries = timesheet.entries.filter(entry =>
          entry.date === formData2.date && (!editingEntry2 || entry.id !== editingEntry2.id)
        );
        // Ne compter que les heures de TRAVAIL
        const existingNormalHours = existingDayEntries
          .filter(entry => !entry.isPaidLeave && !entry.isAbsence)
          .reduce((sum, entry) => sum + (entry.normalHours || 0), 0);

        const isFriday = new Date(formData2.date).getDay() === 5;
        const maxNormalHours = isFriday ? 7 : 8;

        // Cas spécial : Absence "Toute la journée"
        if (formData2.totalHours === maxNormalHours && existingDayEntries.length > 0) {
          console.log('🔄 Absence toute la journée détectée - suppression de toutes les autres entrées');
          console.log('📋 Entrées à supprimer:', existingDayEntries.length);

          // Supprimer TOUTES les autres entrées de la journée
          for (const entry of existingDayEntries) {
            console.log('🗑️ Suppression entrée:', entry.id, entry.project, entry.normalHours + 'h');
            await deleteTimeEntry(timesheet.id, entry.id);
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Si on MODIFIE une entrée existante, LA SUPPRIMER AUSSI (pour éviter qu'elle soit recomptée)
          if (editingEntry2) {
            console.log('🗑️ Suppression de l\'entrée actuelle:', editingEntry2.id, editingEntry2.normalHours + 'h');
            await deleteTimeEntry(timesheet.id, editingEntry2.id);
            await new Promise(resolve => setTimeout(resolve, 400));
          }

          console.log('✅ Toutes les suppressions terminées - attente de la synchronisation Supabase');

          // Attendre que toutes les suppressions soient VRAIMENT synchronisées dans Supabase
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Créer une nouvelle absence complète (TOUJOURS créer une nouvelle, jamais mettre à jour)
          console.log('➕ Création d\'une nouvelle absence complète de', maxNormalHours + 'h');
          const newEntry: TimeEntry = {
            id: generateId(),
            userId: currentUser?.id || '',
            date: formData2.date,
            projectId: null,
            project: 'ABSENT',
            normalHours: 0,
            overtimeHours: 0,
            absenceHours: maxNormalHours,
            status: 'draft',
            isPaidLeave: false,
            isAbsence: true,
            leaveType: 'Absence',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await addTimeEntry(timesheet.id, newEntry);
          console.log('✅ Nouvelle entrée d\'absence créée avec', maxNormalHours + 'h');

          // Délai supplémentaire avant le rechargement global pour être SÛR que tout est synchronisé
          await new Promise(resolve => setTimeout(resolve, 1000));
          window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
          console.log('✅ Absence complète enregistrée -', maxNormalHours + 'h');
          resetForm();
          setSubmitting(false);
          return;
        }

        // Scénario 1 : Heures normales déjà complètes (8h ou 7h le vendredi)
        if (existingNormalHours >= maxNormalHours) {
          setPendingAbsenceData({
            absenceHours: formData2.totalHours,
            maxNormalHours,
            existingDayEntries
          });
          setShowAbsenceDeductionModal(true);
          setSubmitting(false);
          return;
        }

        // Scénario 3 : Dépassement
        const totalAfterAbsence = existingNormalHours + formData2.totalHours;
        if (totalAfterAbsence > maxNormalHours) {
          const maxAbsenceAllowed = maxNormalHours - existingNormalHours;
          setErrorMessage(`Maximum ${maxAbsenceAllowed}h d'absence autorisées (vous avez déjà ${existingNormalHours}h enregistrées)`);
          setShowErrorModal(true);
          setSubmitting(false);
          return;
        }

        // Scénario 2 : Heures incomplètes - pas de message, ça passe
      }

      // Si congés ou absent, pas besoin de chantier ni d'heures
      if (!formData2.isPaidLeave && !formData2.isAbsent && !formData2.projectId) {
        setErrorMessage('Veuillez sélectionner un chantier');
        setShowErrorModal(true);
        return;
      }

      if (!canRecordHours(formData2.date)) {
        setErrorMessage('Vous ne pouvez pas enregistrer d\'heures pour cette date');
        setShowErrorModal(true);
        return;
      }

      // Vérifications des heures seulement si pas en congés/absent
      if (!formData2.isPaidLeave && !formData2.isAbsent) {
        // Vérifier la limite de 10h par jour tous chantiers confondus
        const existingDayEntries = timesheet.entries.filter(entry =>
          entry.date === formData2.date && (!editingEntry2 || entry.id !== editingEntry2.id)
        );
        // Ne compter que les heures de TRAVAIL, pas les absences/congés
        const existingDayHours = existingDayEntries
          .filter(entry => !entry.isPaidLeave && !entry.isAbsence)
          .reduce((sum, entry) => sum + (entry.normalHours || 0) + (entry.overtimeHours || 0), 0);
        const newTotalHours = existingDayHours + formData2.normalHours + formData2.overtimeHours;

        if (newTotalHours > 10) {
          const availableHours = 10 - existingDayHours;
          setErrorMessage(
            `Limite de 10h par jour dépassée !\n\n` +
            `Heures déjà enregistrées aujourd'hui : ${existingDayHours}h\n` +
            `Heures que vous voulez ajouter : ${formData2.normalHours + formData2.overtimeHours}h\n` +
            `Total : ${newTotalHours}h\n\n` +
            `Maximum autorisé : ${availableHours}h supplémentaires`
          );
          setShowErrorModal(true);
          return;
        }

        // Vérifier la limite de 8h normales par jour (7h le vendredi)
        const isFriday = new Date(formData2.date).getDay() === 5;
        const maxNormalHours = isFriday ? 7 : 8;

        // Ne compter que les heures de TRAVAIL (pas les absences/congés)
        const existingNormalHours = existingDayEntries
          .filter(entry => !entry.isPaidLeave && !entry.isAbsence)
          .reduce((sum, entry) => sum + (entry.normalHours || 0), 0);

        // Détecter s'il y a une absence existante dans la journée
        const existingAbsenceEntry = existingDayEntries.find(entry => entry.isAbsence);
        const existingAbsenceHours = existingAbsenceEntry?.absenceHours || existingAbsenceEntry?.normalHours || 0;
        const existingWorkHours = existingNormalHours;

        // Calculer la répartition normale/supplémentaire selon l'ordre d'enregistrement
        // Maximum 8h normales par jour (7h le vendredi), le reste en supplémentaires
        const totalHoursToAdd = formData2.normalHours + formData2.overtimeHours;
        let finalNormalHours = 0;
        let finalOvertimeHours = 0;

        // Calculer les heures après ajout du travail
        const totalWorkHoursAfter = existingWorkHours + totalHoursToAdd;

        // Si on dépasse 8h normales avec du travail ET qu'il y a une absence
        if (existingAbsenceEntry && totalWorkHoursAfter > maxNormalHours) {
          console.log('🔄 Ajustement automatique de l\'absence');
          console.log('  Absence existante:', existingAbsenceHours + 'h');
          console.log('  Travail existant:', existingWorkHours + 'h');
          console.log('  Travail à ajouter:', totalHoursToAdd + 'h');
          console.log('  Total travail après:', totalWorkHoursAfter + 'h');

          // Si le travail atteint ou dépasse 8h → supprimer l'absence
          if (totalWorkHoursAfter >= maxNormalHours) {
            console.log('  ➡️ Travail >= 8h → Suppression de l\'absence');
            await deleteTimeEntry(timesheet.id, existingAbsenceEntry.id);
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            // Sinon, réduire l'absence pour que total = 8h
            const newAbsenceHours = maxNormalHours - totalWorkHoursAfter;
            console.log('  ➡️ Réduction absence de', existingAbsenceHours + 'h à', newAbsenceHours + 'h');

            const updatedAbsence: Partial<TimeEntry> = {
              absenceHours: newAbsenceHours,
              normalHours: 0,
              overtimeHours: 0,
              updatedAt: new Date().toISOString()
            };
            await updateTimeEntry(timesheet.id, existingAbsenceEntry.id, updatedAbsence);
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          console.log('✅ Ajustement terminé');
        }

        // Recalculer les heures normales disponibles après ajustement de l'absence
        const updatedExistingNormalHours = existingAbsenceEntry && totalWorkHoursAfter >= maxNormalHours
          ? existingWorkHours  // Absence supprimée
          : existingAbsenceEntry && totalWorkHoursAfter > maxNormalHours
          ? maxNormalHours - (maxNormalHours - totalWorkHoursAfter)  // Absence réduite
          : existingNormalHours;  // Pas de changement

        if (updatedExistingNormalHours < maxNormalHours) {
          // Il reste de la place dans les heures normales
          const normalHoursAvailable = maxNormalHours - updatedExistingNormalHours;
          finalNormalHours = Math.min(totalHoursToAdd, normalHoursAvailable);
          finalOvertimeHours = Math.max(0, totalHoursToAdd - finalNormalHours);
        } else {
          // Toutes les heures normales sont déjà prises, tout va en supplémentaires
          finalNormalHours = 0;
          finalOvertimeHours = totalHoursToAdd;
        }

        const newTotalNormalHours = existingNormalHours + finalNormalHours;

        if (newTotalNormalHours > maxNormalHours) {
          const availableNormalHours = maxNormalHours - existingNormalHours;
          setErrorMessage(
            `Limite de ${maxNormalHours}h normales par jour dépassée !\n\n` +
            `Heures normales déjà enregistrées aujourd'hui : ${existingNormalHours}h\n` +
            `Heures normales que vous voulez ajouter : ${finalNormalHours}h\n` +
            `Total : ${newTotalNormalHours}h\n\n` +
            `Maximum autorisé : ${availableNormalHours}h normales supplémentaires`
          );
          setShowErrorModal(true);
          return;
        }

        // Vérifier la limite de 10h d'heures supplémentaires par jour
        const existingOvertimeHours = getExistingOvertimeHours(formData2.date, editingEntry2?.id);
        const totalOvertimeHours = existingOvertimeHours + finalOvertimeHours;
        
        if (totalOvertimeHours > 10) {
          const availableOvertimeHours = 10 - existingOvertimeHours;
          setErrorMessage(
            `Limite de 10h supplémentaires par jour dépassée !\n\n` +
            `Heures supplémentaires déjà enregistrées aujourd'hui : ${existingOvertimeHours}h\n` +
            `Heures supplémentaires que vous voulez ajouter : ${finalOvertimeHours}h\n` +
            `Total : ${totalOvertimeHours}h\n\n` +
            `Maximum autorisé : ${availableOvertimeHours}h supplémentaires`
          );
          setShowErrorModal(true);
          return;
        }
      }

      const newEntry: TimeEntry = {
        id: editingEntry2 ? editingEntry2.id : generateId(),
        userId: currentUser?.id || '',
        date: formData2.date,
        projectId: formData2.isPaidLeave ? null : formData2.isAbsent ? null : formData2.projectId,
        project: formData2.isPaidLeave ? 'CONGÉS PAYÉS' : formData2.isAbsent ? 'ABSENT' : undefined,
        normalHours: formData2.isAbsent ? 0 : formData2.isPaidLeave ? 0 : finalNormalHours,
        overtimeHours: formData2.isAbsent || formData2.isPaidLeave ? 0 : finalOvertimeHours,
        absenceHours: formData2.isAbsent ? formData2.totalHours : 0,
        status: 'draft',
        isPaidLeave: formData2.isPaidLeave,
        isAbsence: formData2.isAbsent,
        leaveType: formData2.isPaidLeave ? 'Congés payés' : formData2.isAbsent ? 'Absence' : null,
        createdAt: editingEntry2 ? editingEntry2.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingEntry2 && (formData2.isPaidLeave || formData2.isAbsent)) {
        const isFriday = new Date(formData2.date).getDay() === 5;
        const maxNormalHours = isFriday ? 7 : 8;

        // Pour les congés payés, c'est TOUJOURS un jour complet (pas besoin de vérifier totalHours)
        // Pour les absences, vérifier que totalHours correspond au jour complet
        const isFullDayLeave = formData2.isPaidLeave;
        const isFullDayAbsence = formData2.isAbsent && formData2.totalHours === maxNormalHours;

        // UNIQUEMENT pour les congés/absences COMPLETS (8h ou 7h le vendredi), supprimer les autres entrées
        if (isFullDayLeave || isFullDayAbsence) {
          const allDayEntries = timesheet.entries.filter(e =>
            e.date === formData2.date &&
            e.id !== editingEntry2.id
          );

          if (allDayEntries.length > 0) {
            setPendingModification(newEntry);
            setConflictingWorkEntries(allDayEntries.map(e => ({ id: e.id })));
            setShowLeaveConflictModal(true);
            setSubmitting(false);
            return;
          }
        }

        // Pour les absences PARTIELLES : vérifier l'impact sur les heures supplémentaires
        if (formData2.isAbsent && !isFullDayAbsence) {
          // Calculer les heures de travail NORMALES après modification
          const otherDayEntries = timesheet.entries.filter(e =>
            e.date === formData2.date &&
            e.id !== editingEntry2.id &&
            !e.isAbsence &&
            !e.isPaidLeave
          );

          const otherNormalWorkHours = otherDayEntries.reduce((sum, e) => sum + (e.normalHours || 0), 0);
          const totalNormalWorkHoursAfter = otherNormalWorkHours; // L'entrée modifiée devient absence

          // Vérifier s'il y a des heures supp dans la journée
          const hasDayOvertimeHours = timesheet.entries.some(e =>
            e.date === formData2.date &&
            (e.overtimeHours || 0) > 0
          );

          // Si heures supp ET heures normales < 8h → avertir du recalcul
          if (hasDayOvertimeHours && totalNormalWorkHoursAfter < maxNormalHours) {
            const totalOvertimeHours = timesheet.entries
              .filter(e => e.date === formData2.date)
              .reduce((sum, e) => sum + (e.overtimeHours || 0), 0);

            // Calculer si l'absence sera conservée ou supprimée
            const totalWorkHours = totalNormalWorkHoursAfter + totalOvertimeHours;
            const willRemoveAbsence = totalWorkHours >= maxNormalHours;

            setConfirmAction2({
              type: 'overtime-warning',
              data: {
                entry: newEntry,
                editingId: editingEntry2.id,
                overtimeHours: totalOvertimeHours,
                maxHours: maxNormalHours,
                willRemoveAbsence
              }
            });
            setShowConfirmModal(true);
            setSubmitting(false);
            return;
          }
        }

        updateTimeEntry(timesheet.id, editingEntry2.id, newEntry);
      } else if (editingEntry2) {
        // MODIFICATION D'UNE ENTRÉE DE TRAVAIL NORMALE
        // Le contexte TimesheetContext gère automatiquement l'ajustement de l'absence
        await updateTimeEntry(timesheet.id, editingEntry2.id, newEntry);
      } else {
        // AJOUT D'UNE NOUVELLE ENTRÉE
        // Vérifier s'il existe un congé payé pour cette date (uniquement pour entrées de travail)
        if (!newEntry.isPaidLeave && !newEntry.isAbsence) {
          const existingPaidLeave = timesheet.entries.find(e =>
            e.date === newEntry.date && e.isPaidLeave
          );

          if (existingPaidLeave) {
            // Stocker l'entrée en attente et le congé à supprimer
            setPendingEntryWithPaidLeave({ entry: newEntry, paidLeave: existingPaidLeave });
            setShowPaidLeaveRemovalModal(true);
            setSubmitting(false);
            return;
          }
        }

        addTimeEntry(timesheet.id, newEntry);
      }

      resetForm();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData2({
      date: selectedDate || new Date().toISOString().split('T')[0],
      totalHours: 0,
      projectId: '',
      normalHours: 0,
      overtimeHours: 0,
      isPaidLeave: false,
      isAbsent: false
    });
    setEditingEntry2(null);
    setShowForm(false);
    setProjectSearchTerm('');
    setShowProjectDropdown(false);
  };

  const handleConfirmPaidLeaveRemoval = async () => {
    if (!pendingEntryWithPaidLeave) return;

    try {
      setSubmitting(true);
      // Supprimer le congé payé
      await deleteTimeEntry(timesheet.id, pendingEntryWithPaidLeave.paidLeave.id);

      // Attendre un peu pour que la suppression soit synchronisée
      await new Promise(resolve => setTimeout(resolve, 300));

      // Ajouter la nouvelle entrée
      await addTimeEntry(timesheet.id, pendingEntryWithPaidLeave.entry);

      // Réinitialiser
      setPendingEntryWithPaidLeave(null);
      setShowPaidLeaveRemovalModal(false);
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la suppression du congé:', error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    // Vérifier si la journée a déjà congés/absence COMPLET (sauf si c'est l'entrée en cours de modification)
    const isFriday = new Date(entry.date).getDay() === 5;
    const fullDayHours = isFriday ? 7 : 8;

    const hasFullDayLeaveOrAbsence = timesheet.entries.some(
      e => e.date === entry.date &&
      e.id !== entry.id &&
      (e.isPaidLeave || e.isAbsence) &&
      (e.normalHours || 0) >= fullDayHours
    );

    if (hasFullDayLeaveOrAbsence && !entry.isPaidLeave && !entry.isAbsence) {
      setErrorMessage('Impossible de modifier : journée complète en congés ou absence');
      setShowErrorModal(true);
      return;
    }

    setEditingEntry2(entry);

    // Réinitialiser le terme de recherche pour afficher tous les projets
    setProjectSearchTerm('');

    setFormData2({
      date: entry.date,
      totalHours: (entry.normalHours || 0) + (entry.overtimeHours || 0),
      projectId: entry.projectId,
      normalHours: entry.normalHours,
      overtimeHours: entry.overtimeHours,
      isPaidLeave: entry.projectId === 'conges-payes',
      isAbsent: entry.projectId === 'absent'
    });
    setShowForm(true);
  };

  const handleDelete = (entry: TimeEntry) => {
    setConfirmAction2({ type: 'delete', data: entry });
    setShowConfirmModal(true);
  };

  const handleSubmitTimesheet = () => {
    setConfirmAction2({ type: 'submit' });
    setShowConfirmModal(true);
  };

  const handleSubmitDay = (date: string) => {
    // Vérifier si la journée est incomplète
    const dayEntries = timesheet.entries.filter(entry => entry.date === date);

    // Calculer les heures de travail (exclure congés et absences)
    const workHours = dayEntries
      .filter(entry => !entry.isPaidLeave && !entry.isAbsence)
      .reduce((sum, entry) => sum + (entry.normalHours || 0) + (entry.overtimeHours || 0), 0);

    // Déterminer les heures requises (vendredi = 7h, autres = 8h)
    const isFriday = new Date(date).getDay() === 5;
    const requiredHours = isFriday ? 7 : 8;

    // Si la journée est incomplète, afficher le modal
    if (workHours < requiredHours && workHours > 0) {
      const missingHours = requiredHours - workHours;
      setIncompleteDayData({ date, missingHours });
      setShowIncompleteDayModal(true);
      return;
    }

    // Sinon, soumettre normalement
    setConfirmAction2({ type: 'submit', data: { date } });
    setShowConfirmModal(true);
  };

  const handleApprove = () => {
    setConfirmAction2({ type: 'approve' });
    setShowConfirmModal(true);
  };

  const handleReject = () => {
    setConfirmAction2({ type: 'reject' });
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    switch (confirmAction2.type) {
      case 'submit':
        if (confirmAction2.data?.date) {
          submitDayEntries(timesheet.id, confirmAction2.data.date);
        } else {
          submitTimesheet(timesheet.id);
        }
        break;
      case 'approve':
        // Approuver toute la semaine
        break;
      case 'reject':
        // Refuser toute la semaine
        break;
      case 'delete':
        if (confirmAction2.data) {
          try {
            await deleteTimeEntry(timesheet.id, confirmAction2.data.id);
            setDataVersion(prev => prev + 1);
            console.log('✅ Suppression confirmée et vue rafraîchie');
          } catch (error) {
            console.error('❌ Erreur lors de la suppression:', error);
          }
        }
        break;
      case 'overtime-warning':
        // Recalculer la répartition normale/supp ET gérer l'absence
        if (confirmAction2.data) {
          const { entry, editingId, maxHours } = confirmAction2.data;
          const maxNormalHours = maxHours || 8;

          // 1. Récupérer TOUTES les entrées de TRAVAIL de la journée (hors absence/congés et hors l'entrée en cours)
          const workEntries = timesheet.entries
            .filter(e =>
              e.date === entry.date &&
              e.id !== editingId &&
              !e.isAbsence &&
              !e.isPaidLeave
            )
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          // 2. Calculer le total d'heures de travail disponibles
          const totalWorkHours = workEntries.reduce((sum, e) =>
            sum + (e.normalHours || 0) + (e.overtimeHours || 0), 0
          );

          // 3. Si le total de travail >= 8h → SUPPRIMER l'absence, sinon la GARDER
          if (totalWorkHours >= maxNormalHours) {
            console.log('🔄 Total travail >= 8h → Suppression de l\'absence');
            await deleteTimeEntry(timesheet.id, editingId);
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            console.log('🔄 Total travail < 8h → Conservation de l\'absence');
            await updateTimeEntry(timesheet.id, editingId, entry);
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // 4. Recalculer la répartition normale/supp pour TOUTES les entrées de travail
          let normalHoursUsed = 0;

          for (const workEntry of workEntries) {
            const totalHours = (workEntry.normalHours || 0) + (workEntry.overtimeHours || 0);
            const remainingNormalHours = maxNormalHours - normalHoursUsed;

            let newNormalHours = 0;
            let newOvertimeHours = 0;

            if (remainingNormalHours > 0) {
              // Il reste de la place dans les heures normales
              newNormalHours = Math.min(totalHours, remainingNormalHours);
              newOvertimeHours = Math.max(0, totalHours - newNormalHours);
              normalHoursUsed += newNormalHours;
            } else {
              // Plus de place, tout en supp
              newNormalHours = 0;
              newOvertimeHours = totalHours;
            }

            // Mettre à jour l'entrée si changement
            if (workEntry.normalHours !== newNormalHours || workEntry.overtimeHours !== newOvertimeHours) {
              const updatedWorkEntry: Partial<TimeEntry> = {
                normalHours: newNormalHours,
                overtimeHours: newOvertimeHours,
                updatedAt: new Date().toISOString()
              };
              await updateTimeEntry(timesheet.id, workEntry.id, updatedWorkEntry);
            }
          }

          // 5. Rafraîchir
          await new Promise(resolve => setTimeout(resolve, 300));
          window.dispatchEvent(new CustomEvent('globalTimesheetUpdate'));
          resetForm();
        }
        break;
    }
    setShowConfirmModal(false);
  };

  // Fonction pour obtenir le statut d'un jour
  const getDayStatus = (date: string): 'draft' | 'submitted' | 'approved' | 'rejected' | 'partially_approved' => {
    if (!timesheet || !timesheet.entries) return 'draft';
    
    // CORRECTION : Vérifier SEULEMENT les entrées de ce jour spécifique
    const dayEntries = timesheet.entries.filter(entry => entry.date === date);
    
    // Si aucune entrée pour ce jour = draft (normal)
    if (dayEntries.length === 0) {
      return 'draft';
    }
    
    // NOUVELLE LOGIQUE : rejected > partially_approved > approved > pending > draft
    if (dayEntries.some(entry => entry.status === 'rejected')) {
      // Si il y a du rejeté ET de l'approuvé = partiellement approuvé
      if (dayEntries.some(entry => entry.status === 'approved')) {
        return 'partially_approved';
      }
      return 'rejected';
    }
    if (dayEntries.every(entry => entry.status === 'approved')) return 'approved';
    if (dayEntries.some(entry => entry.status === 'pending')) return 'submitted';
    
    return 'draft';
  };

  // Fonction pour vérifier s'il y a des entrées en attente pour une date
  const hasDraftEntries = (date: string): boolean => {
    const dayEntries = timesheet.entries.filter(entry => entry.date === date);
    return dayEntries.some(entry => entry.status === 'draft');
  };

  // Vérifier s'il y a des entrées en brouillon pour une date
  const hasEntriesForDay = selectedDate ? timesheet.entries.some(entry => entry.date === selectedDate && entry.status === 'draft') : false;

  const handleConfirmIncompleteDay = async () => {
    if (!incompleteDayData) return;

    const { date, missingHours } = incompleteDayData;

    // Créer une entrée d'absence automatique
    const absenceEntry = {
      id: generateId(),
      userId: currentUser?.id || '',
      date: date,
      projectId: null,
      normalHours: 0,
      overtimeHours: 0,
      absenceHours: missingHours,
      status: 'draft' as const,
      isAbsence: true,
      isPaidLeave: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('🚨 Création absence automatique:', {
      date,
      missingHours,
      entryId: absenceEntry.id
    });

    // Ajouter l'entrée d'absence
    addTimeEntry(timesheet.id, absenceEntry);

    // Attendre que l'entrée soit bien ajoutée
    await new Promise(resolve => setTimeout(resolve, 500));

    // Fermer le modal
    setShowIncompleteDayModal(false);
    setIncompleteDayData(null);

    // Soumettre le jour (avec l'absence maintenant incluse)
    submitDayEntries(timesheet.id, date);
  };

  const handleAddEntry = (forceAbsence = false) => {
    // Vérifier si la journée a déjà congés payés COMPLET (8h ou 7h)
    // Les absences ne bloquent PAS l'ajout d'heures
    if (selectedDate) {
      const isFriday = new Date(selectedDate).getDay() === 5;
      const fullDayHours = isFriday ? 7 : 8;

      const hasFullDayPaidLeave = timesheet.entries.some(
        entry => entry.date === selectedDate &&
        entry.isPaidLeave &&
        (entry.normalHours || 0) >= fullDayHours
      );

      if (hasFullDayPaidLeave) {
        setErrorMessage('Impossible d\'ajouter : journée complète en congés payés');
        setShowErrorModal(true);
        return;
      }
    }
    // NE PAS charger l'absence automatiquement
    // Le salarié peut vouloir ajouter des heures de travail
    setShowForm(true);
  };

  return (
    <div key={`timesheet-detail-${dataVersion}`} className="h-full bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="h-full p-3 sm:p-4 md:p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => {
              if (fromCalendar) {
                navigate('/calendar');
              } else {
                navigate('/timesheets');
              }
            }}
            className="mr-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            {selectedDate ? (
              <div>
                <h1 className={`text-lg font-bold ${
                  (() => {
                    if (!selectedDate || !timesheet) return 'text-gray-900';
                    
                    // Vérifier directement les entrées du jour sélectionné
                    const dayEntries = timesheet.entries.filter(entry => entry.date === selectedDate);
                    
                    if (dayEntries.length === 0) return 'text-gray-900';
                    
                    // Nouvelle logique avec partially_approved
                    if (dayEntries.some(entry => entry.status === 'rejected')) {
                      if (dayEntries.some(entry => entry.status === 'approved')) {
                        return 'text-orange-600'; // Partiellement approuvé
                      }
                      return 'text-red-600'; // Refusé
                    }
                    if (dayEntries.every(entry => entry.status === 'approved')) return 'text-green-600';
                    
                    return 'text-gray-900';
                  })()
                } dark:text-gray-100`}>
                  <span className="block sm:inline">Ma journée du</span>
                  <span className="block sm:inline sm:ml-2">{formatDate(selectedDate)}</span>
                </h1>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isAdmin ? `Feuille de temps de ${employeeInfo.name}` : 'Ma feuille de temps'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {isAdmin ? (
                    `${employeeInfo.department} • ${employeeInfo.company}`
                  ) : (
                    `Semaine du ${formatDate(timesheet.weekStarting)} au ${formatDate(timesheet.weekEnding)}`
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {!isAdmin && (
          selectedDate && getDayStatus(selectedDate) === 'draft' && (
            <button
              onClick={handleAddEntry}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-md hover:shadow-lg"
              title="Ajouter des heures"
            >
              <Plus size={20} />
            </button>
          )
        )}
      </div>

      {/* Résumé de la feuille de temps */}
      <TimesheetSummary
        timesheet={timesheet}
        onSubmit={handleSubmitTimesheet}
        onApprove={handleApprove}
        onReject={handleReject}
        isAdmin={isAdmin}
        selectedDate={selectedDate || undefined}
        onSubmitDay={handleSubmitDay}
      />

      {/* Liste des entrées */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        {selectedDate ? (
          // Vue par jour
          <div>
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Heures du {formatDate(selectedDate)}
              </h2>
            </div>
            
            {entriesToShow.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {entriesToShow.map((entry) => (
                  <div key={entry.id} className="px-2 py-4 hover:bg-gray-50 dark:hover:bg-blue-900 transition-colors duration-200">
                    <div className="flex items-center justify-end">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => !isAdmin && getDayStatus(selectedDate || '') === 'draft' && handleEdit(entry)}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Point de statut */}
                          <div className={`w-2 h-2 rounded-full ${
                            entry.status === 'approved' ? 'bg-green-500' :
                            entry.status === 'rejected' ? 'bg-red-500' :
                            entry.status === 'pending' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`} />

                          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full transition-colors duration-200">
                            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 uppercase">
                              {getEntryDisplayName(entry, findProjectById)}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1">
                              {entry.isAbsence && (entry.absenceHours || 0) > 0 ? (
                                <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                  {entry.absenceHours}h
                                </div>
                              ) : entry.isPaidLeave ? (
                                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                  Jour complet
                                </div>
                              ) : (
                                <>
                                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                    {entry.normalHours}h
                                  </div>
                                  {entry.overtimeHours > 0 && (
                                    <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                      {entry.overtimeHours}h
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Afficher la raison du refus si présente */}
                            {entry.status === 'rejected' && entry.rejectionReason && (
                              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded transition-colors duration-200">
                                <p className="text-xs text-red-800 dark:text-red-200">
                                  <span className="font-medium">Raison du refus : </span>
                                  <span className="text-red-700 dark:text-red-300">{entry.rejectionReason}</span>
                                </p>
                              </div>
                            )}

                            {/* Afficher le commentaire d'approbation si présent */}
                            {entry.status === 'approved' && entry.approvalComment && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded transition-colors duration-200">
                                <p className="text-xs text-green-800 dark:text-green-200">
                                  <span className="font-medium">Commentaire : </span>
                                  <span className="text-green-700 dark:text-green-300">{entry.approvalComment}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {!isAdmin && getDayStatus(selectedDate || '') === 'draft' && (
                        <div className="flex items-center space-x-2 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(entry);
                            }}
                            className="p-1 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-blue-900 transition-colors duration-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            
            {entriesToShow.length === 0 && (() => {
              // Vérifier si la journée a congés/absence COMPLET (8h ou 7h)
              const isFriday = selectedDate ? new Date(selectedDate).getDay() === 5 : false;
              const fullDayHours = isFriday ? 7 : 8;

              const hasFullDayLeaveOrAbsence = timesheet.entries.some(
                entry => entry.date === selectedDate &&
                (entry.isPaidLeave || entry.isAbsence) &&
                (entry.normalHours || 0) >= fullDayHours
              );

              return (
                <div className="px-6 py-12 text-center">
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center transition-colors duration-200">
                    <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Aucune heure enregistrée
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Vous n'avez pas encore enregistré d'heures pour cette journée
                  </p>
                  {!isAdmin && !hasFullDayLeaveOrAbsence && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200"
                    >
                      <Plus size={16} className="mr-2" />
                      Enregistrer mes heures
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          // Vue par semaine
          <div>
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Détail des heures - Semaine du {formatDate(timesheet.weekStarting)} au {formatDate(timesheet.weekEnding)}
              </h2>
            </div>
            
            {Object.keys(entriesByDate).length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {Object.entries(entriesByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, dayEntries]) => (
                    <div key={date} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(date)}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getDayStatus(date) === 'approved' ? 'bg-green-100 text-green-800' :
                          getDayStatus(date) === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          getDayStatus(date) === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getDayStatus(date) === 'approved' ? 'Approuvé' :
                           getDayStatus(date) === 'submitted' ? 'Soumis' :
                           getDayStatus(date) === 'rejected' ? 'Refusé' :
                           'Brouillon'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {dayEntries.map((entry) => (
                          <div key={entry.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div
                                className="flex-1 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                                onClick={() => !isAdmin && getDayStatus(date) === 'draft' && handleEdit(entry)}
                              >
                                <div className="flex items-center space-x-4">
                                  <div className="bg-blue-100 dark:bg-blue-900 p-1 rounded transition-colors duration-200">
                                    <Building2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 uppercase">
                                      {getEntryDisplayName(entry, findProjectById)}
                                    </h4>
                                    <div className="flex items-center space-x-4 mt-1">
                                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                        {entry.normalHours}h normales
                                      </div>
                                      {entry.overtimeHours > 0 && (
                                        <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                          {entry.overtimeHours}h supp
                                        </div>
                                      )}
                                      {/* Statut de l'entrée individuelle */}
                                      <div className="flex items-center">
                                        {entry.status === 'approved' && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                            <CheckCircle size={10} className="mr-1" />
                                            ✅
                                          </span>
                                        )}
                                        {entry.status === 'rejected' && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                                            <XCircle size={10} className="mr-1" />
                                            ❌
                                          </span>
                                        )}
                                        {entry.status === 'pending' && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                            <Clock size={10} className="mr-1" />
                                            ⏳
                                          </span>
                                        )}
                                        {entry.status === 'draft' && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                            <Edit2 size={10} className="mr-1" />
                                            📝
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {!isAdmin && getDayStatus(date) === 'draft' && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(entry);
                                    }}
                                    className="p-1 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-blue-900 transition-colors duration-200"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center transition-colors duration-200">
                  <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Aucune heure enregistrée
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Vous n'avez pas encore enregistré d'heures pour cette semaine
                </p>
                {!isAdmin && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200"
                  >
                    <Plus size={16} className="mr-2" />
                    Enregistrer mes heures
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formulaire d'ajout/modification */}
      {showForm && !isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto transition-colors duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingEntry2 ? `Modifier les heures du ${new Date(formData2.date).toLocaleDateString('fr-FR')}` : `Enregistrer mes heures du ${new Date(formData2.date).toLocaleDateString('fr-FR')}`}
              </h2>
              <button
                onClick={resetForm}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors duration-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">

                {/* Cases à cocher Congés payés et Absent */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <div className="relative">
                        <input
                          type="checkbox"
                          id="paidLeave"
                          checked={formData2.isPaidLeave}
                          onChange={(e) => {
                            const checked = e.target.checked;

                            if (checked) {
                              // Vérifier s'il y a des heures enregistrées dans la journée (travail OU absence)
                              const existingEntries = timesheet.entries.filter(entry =>
                                entry.date === formData2.date &&
                                !entry.isPaidLeave &&
                                (entry.normalHours > 0 || entry.overtimeHours > 0 || entry.absenceHours > 0)
                              );

                              if (existingEntries.length > 0 && !editingEntry2) {
                                // Afficher l'avertissement
                                setPendingLeaveType('leave');
                                setShowLeaveWarning(true);
                                return;
                              }
                            }

                            setFormData2(prev => ({
                              ...prev,
                              isPaidLeave: checked,
                              isAbsent: checked ? false : prev.isAbsent,
                              totalHours: checked ? 0 : prev.totalHours,
                              normalHours: checked ? 0 : prev.normalHours,
                              overtimeHours: checked ? 0 : prev.overtimeHours,
                              projectId: checked ? 'conges-payes' : ''
                            }));
                            if (checked) {
                              setProjectSearchTerm('CONGÉS PAYÉS');
                            } else {
                              setProjectSearchTerm('');
                            }
                          }}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-2 border-gray-300 rounded-md mr-3 checked:bg-blue-600 checked:border-blue-600"
                        />
                        {/* Icône de coche visible */}
                        {formData2.isPaidLeave && (
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
                          checked={formData2.isAbsent}
                          onChange={(e) => {
                            const checked = e.target.checked;

                            // Si on coche "Absent" ET qu'il n'y a pas d'entrée en cours d'édition
                            if (checked && !editingEntry2 && selectedDate) {
                              const existingAbsence = timesheet.entries.find(
                                entry => entry.date === selectedDate && entry.isAbsence
                              );

                              if (existingAbsence) {
                                // Charger les données de l'absence existante
                                console.log('✅ Absence existante détectée lors du clic sur checkbox:', existingAbsence);
                                setEditingEntry2(existingAbsence);
                                setFormData2({
                                  date: existingAbsence.date,
                                  totalHours: existingAbsence.absenceHours || existingAbsence.normalHours || 0,
                                  projectId: 'absent',
                                  normalHours: 0,
                                  overtimeHours: 0,
                                  isPaidLeave: false,
                                  isAbsent: true
                                });
                                setProjectSearchTerm('ABSENT');
                                return;
                              }
                            }

                            setFormData2(prev => ({
                              ...prev,
                              isAbsent: checked,
                              isPaidLeave: checked ? false : prev.isPaidLeave,
                              totalHours: checked ? 0 : prev.totalHours,
                              normalHours: checked ? 0 : prev.normalHours,
                              overtimeHours: checked ? 0 : prev.overtimeHours,
                              projectId: checked ? 'absent' : ''
                            }));
                            if (checked) {
                              setProjectSearchTerm('ABSENT');
                            } else {
                              setProjectSearchTerm('');
                            }
                          }}
                          className="h-5 w-5 text-red-600 focus:ring-red-500 border-2 border-gray-300 rounded-md mr-3 checked:bg-red-600 checked:border-red-600"
                        />
                        {/* Icône de coche visible */}
                        {formData2.isAbsent && (
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

                  {/* Options pour les absences */}
                  {formData2.isAbsent && (
                    <div className="pl-4 space-y-3">
                      {/* Option 1 : Toute la journée */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="fullDayAbsence"
                          checked={formData2.totalHours === (formData2.date && new Date(formData2.date).getDay() === 5 ? 7 : 8)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Vérifier s'il y a des entrées existantes (autres que celle en édition)
                              const existingDayEntries = timesheet.entries.filter(entry =>
                                entry.date === formData2.date && (!editingEntry2 || entry.id !== editingEntry2.id)
                              );

                              // Ou si on modifie une entrée qui avait des heures normales
                              const isEditingWorkEntry = editingEntry2 && !editingEntry2.isAbsence && !editingEntry2.isPaidLeave;

                              if (existingDayEntries.length > 0 || isEditingWorkEntry) {
                                // Afficher la modal de confirmation
                                setShowFullDayAbsenceModal(true);
                              } else {
                                // Pas d'entrées, appliquer directement
                                const isFriday = new Date(formData2.date).getDay() === 5;
                                const hours = isFriday ? 7 : 8;
                                setFormData2(prev => ({
                                  ...prev,
                                  totalHours: hours,
                                  normalHours: hours,
                                  overtimeHours: 0
                                }));
                              }
                            } else {
                              setFormData2(prev => ({
                                ...prev,
                                totalHours: 0,
                                normalHours: 0,
                                overtimeHours: 0
                              }));
                            }
                          }}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-2 border-gray-300 rounded-md mr-2 checked:bg-red-600 checked:border-red-600"
                        />
                        <label htmlFor="fullDayAbsence" className="block text-sm text-gray-700 dark:text-gray-300">
                          Toute la journée ({new Date(formData2.date).getDay() === 5 ? '7h' : '8h'})
                        </label>
                      </div>

                      {/* Option 2 : Heures spécifiques */}
                      {formData2.totalHours !== (formData2.date && new Date(formData2.date).getDay() === 5 ? 7 : 8) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Clock className="h-4 w-4 inline mr-2" />
                            Nombre d'heures d'absence
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={(() => {
                              const isFriday = new Date(formData2.date).getDay() === 5;
                              const maxNormalHours = isFriday ? 7 : 8;
                              const existingDayEntries = timesheet.entries.filter(entry =>
                                entry.date === formData2.date && (!editingEntry2 || entry.id !== editingEntry2.id)
                              );
                              // Ne compter que les heures de TRAVAIL
                              const existingNormalHours = existingDayEntries
                                .filter(entry => !entry.isPaidLeave && !entry.isAbsence)
                                .reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
                              return Math.max(0, maxNormalHours - existingNormalHours);
                            })()}
                            step="1"
                            value={formData2.totalHours === 0 ? '' : formData2.totalHours}
                            onChange={(e) => {
                              const hours = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                              setFormData2(prev => ({
                                ...prev,
                                totalHours: hours,
                                normalHours: hours,
                                overtimeHours: 0
                              }));
                            }}
                            placeholder="Ex: 1, 2, 3, 4..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Pour une absence partielle dans la journée
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Chantier - caché si absent ou congés */}
                {!formData2.isAbsent && !formData2.isPaidLeave && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Building2 className="h-4 w-4 inline mr-2" />
                      Chantier
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData2.projectId ? (() => {
                          const selectedProject = availableProjects.find(p => p.id === formData2.projectId);
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
                          const value = e.target.value;
                          setProjectSearchTerm(value);
                          setShowProjectDropdown(true);
                          // Réinitialiser la sélection si l'utilisateur tape
                          if (value !== '') {
                            const exactMatch = availableProjects.find(p =>
                              p.name.toLowerCase() === value.toLowerCase() ||
                              (p.reference && p.reference.toLowerCase() === value.toLowerCase())
                            );
                            if (exactMatch) {
                              setFormData2(prev => ({ ...prev, projectId: exactMatch.id }));
                            } else {
                              setFormData2(prev => ({ ...prev, projectId: '' }));
                            }
                          } else {
                            setFormData2(prev => ({ ...prev, projectId: '' }));
                          }
                        }}
                        onFocus={() => {
                          setShowProjectDropdown(true);
                          // Réinitialiser le terme de recherche pour afficher tous les projets
                          setProjectSearchTerm('');
                        }}
                        onBlur={() => {
                          // Délai pour permettre le clic sur les options
                          setTimeout(() => setShowProjectDropdown(false), 200);
                        }}
                        placeholder="Taper pour rechercher un chantier..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      />
                    <button
                      type="button"
                      onClick={() => {
                        setShowProjectDropdown(!showProjectDropdown);
                        // Réinitialiser le terme de recherche pour afficher tous les projets
                        if (!showProjectDropdown) {
                          setProjectSearchTerm('');
                        }
                      }}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {/* Liste déroulante des suggestions */}
                    {showProjectDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredProjects.length > 0 ? (
                          filteredProjects.map(project => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => {
                                setFormData2(prev => ({ ...prev, projectId: project.id }));
                                setProjectSearchTerm('');
                                setShowProjectDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-blue-900 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {(() => {
                                    // Récupérer le préfixe de l'entreprise principale
                                    const primaryCompany = companies.find(c => c.id === project.companyId || c.id === project.primaryCompanyId);
                                    const prefix = primaryCompany ? primaryCompany.name.charAt(0).toUpperCase() : '';
                                    const displayName = project.originalName || project.name;

                                    return prefix ? `${prefix} - ${displayName}` : displayName;
                                  })()}
                                </span>
                                {project.reference && (
                                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{project.reference}</span>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                            Aucun chantier trouvé pour "{projectSearchTerm}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                )}

                {/* Champ nombre d'heures - caché si absent ou congés */}
                {!formData2.isAbsent && !formData2.isPaidLeave && (
                  <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Nombre d'heures
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={(() => {
                      // Calculer le maximum dynamique selon les heures de TRAVAIL déjà enregistrées
                      const existingDayEntries = timesheet.entries.filter(entry =>
                        entry.date === formData2.date && (!editingEntry2 || entry.id !== editingEntry2.id)
                      );
                      // Ne compter que les heures de TRAVAIL, pas les absences/congés
                      const existingWorkHours = existingDayEntries
                        .filter(entry => !entry.isPaidLeave && !entry.isAbsence)
                        .reduce((sum, entry) => sum + (entry.normalHours || 0) + (entry.overtimeHours || 0), 0);
                      const maxAllowed = 10 - existingWorkHours;
                      return Math.max(0, maxAllowed);
                    })()}
                    value={formData2.totalHours === 0 ? '' : formData2.totalHours}
                    onChange={(e) => {
                      const totalHours = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;

                      // Calculer la répartition normale/supplémentaire selon l'ordre d'enregistrement
                      const existingDayEntries = timesheet.entries.filter(entry =>
                        entry.date === formData2.date && (!editingEntry2 || entry.id !== editingEntry2.id)
                      );
                      // Ne compter que les heures de TRAVAIL
                      const existingNormalHours = existingDayEntries
                        .filter(entry => !entry.isPaidLeave && !entry.isAbsence)
                        .reduce((sum, entry) => sum + (entry.normalHours || 0), 0);

                      let normalHours = 0;
                      let overtimeHours = 0;

                      if (existingNormalHours < 8) {
                        const normalHoursAvailable = 8 - existingNormalHours;
                        normalHours = Math.min(totalHours, normalHoursAvailable);
                        overtimeHours = Math.max(0, totalHours - normalHours);
                      } else {
                        normalHours = 0;
                        overtimeHours = totalHours;
                      }
                      
                      setFormData2(prev => ({
                        ...prev,
                        totalHours,
                        normalHours,
                        overtimeHours
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  </div>
                )}

                {/* Affichage de la répartition normale/supplémentaire */}
                {!areHoursDisabled && !formData2.isAbsent && !formData2.isPaidLeave && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 transition-colors duration-200">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Répartition automatique :
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600 dark:text-blue-400">Heures normales :</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{finalNormalHours}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-600 dark:text-purple-400">Heures supplémentaires :</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{finalOvertimeHours}h</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Maximum 8h normales par jour, le reste en supplémentaires
                    </div>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
                  >
                    <X size={16} className="mr-2 inline" />
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (
                      // Si absent : doit avoir des heures saisies
                      formData2.isAbsent ? formData2.totalHours === 0 :
                      // Si congés : toujours actif
                      formData2.isPaidLeave ? false :
                      // Sinon : doit avoir un projet ET des heures
                      (!formData2.projectId || formData2.totalHours === 0)
                    )}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <Save size={16} className="mr-2 inline" />
                    {submitting ? 'Enregistrement...' : (editingEntry2 ? 'Modifier' : 'Enregistrer')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de conflit de congés (modification) */}
      {showLeaveConflictModal && (
        <ConfirmationModal
          isOpen={showLeaveConflictModal}
          onClose={() => {
            setShowLeaveConflictModal(false);
            setPendingModification(null);
            setConflictingWorkEntries([]);
            setSubmitting(false);
          }}
          onConfirm={handleLeaveConflictConfirm}
          title="Attention : heures déjà enregistrées"
          message={`Des heures sont déjà enregistrées dans cette journée. En validant, toutes les heures seront supprimées pour enregistrer ${formData2.isPaidLeave ? 'les congés payés' : "l'absence"}. Voulez-vous continuer ?`}
          type="confirm"
          confirmText="Oui, supprimer les heures"
          cancelText="Annuler"
        />
      )}

      {/* Modal de confirmation */}
      {showConfirmModal && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmAction}
          title={
            confirmAction2.type === 'submit'
              ? 'Soumettre la feuille de temps'
              : confirmAction2.type === 'approve'
              ? 'Approuver la feuille de temps'
              : confirmAction2.type === 'reject'
              ? 'Refuser la feuille de temps'
              : confirmAction2.type === 'overtime-warning'
              ? 'Recalcul des heures'
              : 'Supprimer l\'entrée'
          }
          message={
            confirmAction2.type === 'submit' ?
              'Êtes-vous sûr de vouloir soumettre cette feuille de temps pour approbation ?' :
              confirmAction2.type === 'approve' ?
              'Êtes-vous sûr de vouloir approuver cette feuille de temps ?' :
              confirmAction2.type === 'reject' ?
              'Êtes-vous sûr de vouloir refuser cette feuille de temps ?' :
              confirmAction2.type === 'overtime-warning' ?
              'Êtes-vous sûr de vouloir modifier cette entrée en absence ?\n\nImportant : La modification entrainera le recalcul des heures enregistrées dans la journée.' :
              (() => {
                // Vérifier s'il y a des heures supplémentaires dans la journée
                if (confirmAction2.data) {
                  const entryDate = confirmAction2.data.date;
                  const dayEntries = timesheet.entries.filter(e => e.date === entryDate);
                  const hasOvertimeHours = dayEntries.some(e => (e.overtimeHours || 0) > 0);

                  if (hasOvertimeHours) {
                    return 'Êtes-vous sûr de vouloir supprimer cette entrée ?\n\nImportant : La suppression entrainera le recalcule des heures enregistrer dans la journée.';
                  }
                }
                return 'Êtes-vous sûr de vouloir supprimer cette entrée ?';
              })()
          }
          type={confirmAction2.type === 'delete' ? 'delete' : confirmAction2.type === 'overtime-warning' ? 'warning' : 'confirm'}
          confirmText={
            confirmAction2.type === 'submit' ? 'Soumettre' :
            confirmAction2.type === 'approve' ? 'Approuver' :
            confirmAction2.type === 'reject' ? 'Refuser' :
            confirmAction2.type === 'overtime-warning' ? 'Continuer' :
            'Supprimer'
          }
          cancelText="Annuler"
          showModifyButton={confirmAction2.type === 'delete'}
          onModify={() => {
            if (confirmAction2.data) {
              handleEdit(confirmAction2.data);
            }
          }}
        />
      )}

      {showLeaveWarning && (
        <ConfirmationModal
          isOpen={showLeaveWarning}
          onClose={() => {
            setShowLeaveWarning(false);
            setPendingLeaveType(null);
          }}
          onConfirm={handleLeaveWarningConfirm}
          title="Attention : heures déjà enregistrées"
          message={`Des heures sont déjà enregistrées dans cette journée. En validant, toutes les heures seront supprimées pour enregistrer ${pendingLeaveType === 'leave' ? 'les congés payés' : "l'absence"}. Voulez-vous continuer ?`}
          type="confirm"
          confirmText="Oui, supprimer les heures"
          cancelText="Annuler"
        />
      )}

      {showErrorModal && (
        <ErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title="Erreur"
          message={errorMessage}
        />
      )}

      {/* Modal pour journée incomplète */}
      <IncompleteDayModal
        isOpen={showIncompleteDayModal}
        onClose={() => {
          setShowIncompleteDayModal(false);
          setIncompleteDayData(null);
        }}
        onConfirm={handleConfirmIncompleteDay}
        missingHours={incompleteDayData?.missingHours || 0}
        date={incompleteDayData?.date || ''}
      />

      {/* Modal pour suppression du congé payé */}
      <PaidLeaveRemovalModal
        isOpen={showPaidLeaveRemovalModal}
        onClose={() => {
          setShowPaidLeaveRemovalModal(false);
          setPendingEntryWithPaidLeave(null);
          setSubmitting(false);
        }}
        onConfirm={handleConfirmPaidLeaveRemoval}
        leaveDate={formatDate(pendingEntryWithPaidLeave?.paidLeave?.date || '')}
      />

      {/* Modal de confirmation pour la déduction d'heures (Scénario 1) */}
      {showAbsenceDeductionModal && pendingAbsenceData && (
        <ConfirmationModal
          isOpen={showAbsenceDeductionModal}
          onClose={() => {
            setShowAbsenceDeductionModal(false);
            setPendingAbsenceData(null);
            setSubmitting(false);
          }}
          onConfirm={handleAbsenceDeductionConfirm}
          title="Confirmation absence"
          message={`Vous avez déjà fait vos ${pendingAbsenceData.maxNormalHours}h. Les ${pendingAbsenceData.absenceHours}h d'absence seront déduites de votre dernière entrée.`}
          type="confirm"
          confirmText="Confirmer"
          cancelText="Annuler"
        />
      )}

      {/* Modal de confirmation pour absence toute la journée */}
      {showFullDayAbsenceModal && (
        <ConfirmationModal
          isOpen={showFullDayAbsenceModal}
          onClose={() => setShowFullDayAbsenceModal(false)}
          onConfirm={handleFullDayAbsenceConfirm}
          title="Confirmation"
          message={`Vous avez déjà des heures enregistrées pour cette journée. En cochant "Toute la journée", toutes les heures seront supprimées lors de l'enregistrement. Continuer ?`}
          type="confirm"
          confirmText="Oui, continuer"
          cancelText="Annuler"
        />
      )}
      </div>
    </div>
  );
};

export default TimesheetDetail;