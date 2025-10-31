import React, { useState, useEffect } from 'react';
import { useTimesheets } from '../context/TimesheetContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate, formatWeekDisplay, getCurrentWeekRange, getWeekRange } from '../utils/helpers';
import { Clock, CheckCircle, XCircle, Send, ArrowLeft, Calendar, FileSpreadsheet, AlertTriangle, User, Building2, ChevronRight, Eye, Plus, Filter, Users, Download } from 'lucide-react';
import { startOfMonth, endOfMonth, eachWeekOfInterval, eachDayOfInterval, format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { downloadPDF } from '../utils/pdfGenerator';

const TimesheetList: React.FC = () => {
  const { userTimesheets, timesheets, availableProjects } = useTimesheets();
  const { currentUser, isAdmin, employees, companies } = useAuth();
  const [dataVersion, setDataVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<'weeks' | 'days'>('weeks');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Écouter les mises à jour globales des données
  useEffect(() => {
    const handleGlobalUpdate = () => {
      setDataVersion(prev => prev + 1);
      console.log('📊 TimesheetList: Données mises à jour globalement');
    };

    window.addEventListener('globalTimesheetUpdate', handleGlobalUpdate);
    window.addEventListener('timesheetDataUpdated', handleGlobalUpdate);

    return () => {
      window.removeEventListener('globalTimesheetUpdate', handleGlobalUpdate);
      window.removeEventListener('timesheetDataUpdated', handleGlobalUpdate);
    };
  }, []);

  // Fonctions de navigation avec restriction pour les salariés
  const isAtMinimumMonth = () => {
    if (isAdmin) return false;
    if (!currentUser?.createdAt) return false;
    const accountCreationDate = new Date(currentUser.createdAt);
    const minMonth = new Date(accountCreationDate.getFullYear(), accountCreationDate.getMonth());
    const currentSelectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth());
    return currentSelectedMonth.getTime() === minMonth.getTime();
  };

  const goToPreviousMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1);

    if (!isAdmin && currentUser?.createdAt) {
      const accountCreationDate = new Date(currentUser.createdAt);
      const minDate = new Date(accountCreationDate.getFullYear(), accountCreationDate.getMonth(), 1);

      if (newMonth >= minDate) {
        setSelectedMonth(newMonth);
      }
    } else {
      setSelectedMonth(newMonth);
    }
  };

  const canNavigateToNextMonth = () => {
    if (isAdmin) return true;

    const today = new Date();
    const currentDay = today.getDate();
    const todayMonth = new Date(today.getFullYear(), today.getMonth());
    const currentSelectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth());

    // Si on est avant le 25 du mois en cours et qu'on affiche le mois en cours, bloquer
    if (currentDay < 25 && currentSelectedMonth.getTime() === todayMonth.getTime()) {
      return false;
    }

    // À partir du 25, autoriser seulement le mois immédiatement suivant
    if (currentDay >= 25) {
      const nextMonthFromToday = new Date(today.getFullYear(), today.getMonth() + 1);
      const nextMonthFromSelected = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);

      // Vérifier que le mois suivant ne dépasse pas le mois suivant par rapport à aujourd'hui
      if (nextMonthFromSelected > nextMonthFromToday) {
        return false;
      }
    }

    return true;
  };

  const goToNextMonth = () => {
    if (!canNavigateToNextMonth()) return;

    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);
    setSelectedMonth(newMonth);
  };

  const isMonthDisabled = (year: number, month: number) => {
    if (isAdmin) return false;

    const checkMonth = new Date(year, month);
    const today = new Date();
    const currentDay = today.getDate();
    const todayMonth = new Date(today.getFullYear(), today.getMonth());

    // Vérifier la limite minimum (date de création du compte)
    if (currentUser?.createdAt) {
      const accountCreationDate = new Date(currentUser.createdAt);
      const minMonth = new Date(accountCreationDate.getFullYear(), accountCreationDate.getMonth());
      if (checkMonth < minMonth) {
        return true;
      }
    }

    // Vérifier la limite maximum (règle du 25)
    // Avant le 25, on ne peut pas accéder au mois suivant
    if (currentDay < 25) {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1);
      if (checkMonth >= nextMonth) {
        return true;
      }
    } else {
      // À partir du 25, on peut accéder uniquement jusqu'au mois suivant
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1);
      if (checkMonth > nextMonth) {
        return true;
      }
    }

    return false;
  };

  // Fonction pour obtenir les informations de l'employé
  const getEmployeeInfo = (userId: string) => {
    const employee = employees.find(emp => emp.id === userId);
    if (!employee) {
      return { name: 'Employé inconnu', company: 'Entreprise inconnue', department: '', companyId: '' };
    }
    
    const company = companies.find(c => c.id === employee.companyId);
    return {
      name: employee.name,
      company: company?.name || 'Entreprise inconnue',
      department: employee.department || '',
      companyId: employee.companyId || ''
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_registered':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            <Clock size={12} className="mr-1" />
            Non enregistré
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
            <Clock size={12} className="mr-1" />
            Brouillon
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            <Send size={12} className="mr-1" />
            En attente
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            <Send size={12} className="mr-1" />
            Soumis
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            <CheckCircle size={12} className="mr-1" />
            Approuvé
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
            <XCircle size={12} className="mr-1" />
            Refusé
          </span>
        );
      case 'partially_approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200">
            <AlertTriangle size={12} className="mr-1" />
            Partiellement approuvé
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            <Clock size={12} className="mr-1" />
            À venir
          </span>
        );
      case 'non-travaille':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            <Clock size={12} className="mr-1" />
            Non travaillé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            <Clock size={12} className="mr-1" />
            À venir
          </span>
        );
    }
  };

  // Déterminer quelles feuilles de temps afficher selon le rôle
  const getTimesheetsToShow = () => {
    if (!isAdmin) {
      return userTimesheets;
    }
    
    // Pour les admins, appliquer les filtres
    let filteredTimesheets = timesheets;
    
    // Filtre par entreprise
    if (selectedCompany !== 'all') {
      const companyEmployees = employees.filter(emp => emp.companyId === selectedCompany);
      filteredTimesheets = filteredTimesheets.filter(ts => 
        companyEmployees.some(emp => emp.id === ts.userId)
      );
    }
    
    // Filtre par employé
    if (selectedEmployee !== 'all') {
      filteredTimesheets = filteredTimesheets.filter(ts => ts.userId === selectedEmployee);
    }
    
    // Filtre par année
    filteredTimesheets = filteredTimesheets.filter(ts => {
      const tsYear = new Date(ts.weekStarting).getFullYear();
      return tsYear === selectedYear;
    });
    
    return filteredTimesheets;
  };
  
  const timesheetsToShow = getTimesheetsToShow();
  
  // Obtenir les employés filtrés par entreprise pour le dropdown employé
  const getFilteredEmployees = () => {
    if (selectedCompany === 'all') {
      return employees.filter(emp => !emp.archived && emp.role !== 'admin');
    }
    return employees.filter(emp => emp.companyId === selectedCompany && !emp.archived && emp.role !== 'admin');
  };
  
  const filteredEmployees = getFilteredEmployees();
  
  // Générer les options d'années (5 dernières années + année actuelle + 2 prochaines)
  const getYearOptions = (): number[] => {
    const currentYear = new Date().getFullYear();
    let startYear = currentYear - 5;

    if (!isAdmin && currentUser?.createdAt) {
      const accountCreationDate = new Date(currentUser.createdAt);
      const creationYear = accountCreationDate.getFullYear();
      startYear = Math.max(creationYear, startYear);
    }

    const years = [];
    for (let i = startYear; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years.sort((a, b) => b - a); // Tri décroissant (plus récent en premier)
  };
  
  const yearOptions = getYearOptions();

  // Fonction pour télécharger les feuilles selon les filtres
  const handleDownloadFiltered = async () => {
    const filteredData = getTimesheetsToShow();
    
    if (filteredData.length === 0) {
      alert('Aucune feuille de temps trouvée avec ces filtres');
      return;
    }

    // Grouper par employé
    const employeeGroups = filteredData.reduce((acc, ts) => {
      if (!acc[ts.userId]) {
        acc[ts.userId] = [];
      }
      acc[ts.userId].push(ts);
      return acc;
    }, {} as Record<string, typeof filteredData>);

    // Générer un PDF pour chaque employé
    const pdfPromises = Object.entries(employeeGroups).map(async ([userId, employeeTimesheets]) => {
      const employee = employees.find(emp => emp.id === userId);
      const company = companies.find(c => c.id === employee?.companyId);

      if (!employee) return;

      // Calculer les données du mois/période sélectionnée
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      // Collecter toutes les entrées de la période pour cet employé
      const periodEntries: any[] = [];
      const leaveDaysSet = new Set<string>();

      employeeTimesheets.forEach(timesheet => {
        timesheet.entries.forEach(entry => {
          const entryDate = new Date(entry.date);
          if (entryDate >= monthStart && entryDate <= monthEnd) {
            const projectName = entry.projectId === 'non-enregistre' ? 'Non enregistré' :
                      (availableProjects?.find(p => p.id === entry.projectId)?.name || 'Projet inconnu');

            // Compter les jours de congés
            if (projectName === 'CONGÉS PAYÉS') {
              leaveDaysSet.add(entry.date);
            }

            periodEntries.push({
              date: entry.date,
              project: projectName,
              normalHours: entry.normalHours || 0,
              overtimeHours: entry.overtimeHours || 0,
              absenceHours: entry.absenceHours || 0
            });
          }
        });
      });

      const totalNormalHours = periodEntries.reduce((sum, entry) => sum + entry.normalHours, 0);
      const totalOvertimeHours = periodEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0);
      const totalAbsenceHours = periodEntries.reduce((sum, entry) => sum + entry.absenceHours, 0);
      const totalHours = totalNormalHours + totalOvertimeHours;
      const workingDays = new Set(periodEntries.map(e => e.date)).size;
      const leaveDays = leaveDaysSet.size;

      // Préparer les données PDF
      const pdfData = {
        employeeName: employee.name,
        companyName: company?.name || 'AS INVESTISSEMENT',
        month: `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`,
        year: selectedMonth.getFullYear(),
        totalHours,
        normalHours: totalNormalHours,
        overtimeHours: totalOvertimeHours,
        absenceHours: totalAbsenceHours,
        workingDays,
        leaveDays,
        entries: periodEntries
      };

      // Télécharger le PDF
      await downloadPDF(pdfData);
    });

    // Attendre que tous les PDFs soient téléchargés
    await Promise.all(pdfPromises);

    // Message de confirmation
    const employeeCount = Object.keys(employeeGroups).length;
    alert(`✅ Téléchargement lancé pour ${employeeCount} employé${employeeCount > 1 ? 's' : ''} !`);
  };
  // Fonction pour vérifier si on est après le 15 du mois suivant
  const isAfterAutoApprovalDate = (date: string): boolean => {
    const dayDate = new Date(date);
    const now = new Date();
    
    // Calculer le 15 du mois suivant
    const autoApprovalDate = new Date(dayDate.getFullYear(), dayDate.getMonth() + 1, 15);
    
    return now > autoApprovalDate;
  };

  // Générer la liste des employés avec leurs feuilles de temps
  const generateEmployeeList = () => {
    return filteredEmployees.map(employee => {
      // Trouver toutes les feuilles de temps de cet employé selon les filtres
      const employeeTimesheets = timesheetsToShow.filter(ts => ts.userId === employee.id);
      
      // Calculer les statistiques de l'employé
      const totalHours = employeeTimesheets.reduce((sum, ts) => sum + ts.totalHours, 0);
      const pendingTimesheets = employeeTimesheets.filter(ts => ts.status === 'submitted').length;
      const approvedTimesheets = employeeTimesheets.filter(ts => ts.status === 'approved').length;
      const draftTimesheets = employeeTimesheets.filter(ts => ts.status === 'draft').length;
      
      return {
        employee,
        timesheets: employeeTimesheets,
        stats: {
          totalHours,
          pendingTimesheets,
          approvedTimesheets,
          draftTimesheets,
          totalTimesheets: employeeTimesheets.length
        }
      };
    });
  };

  // Générer tous les jours du mois sélectionné
  const generateMonthDays = () => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      
      // Trouver toutes les entrées pour ce jour
      const dayEntries = timesheetsToShow.flatMap(ts => 
        ts.entries.filter(entry => entry.date === dayStr)
      );

      // Calculer les heures totales pour ce jour
      const normalHours = dayEntries.reduce((sum, e) => sum + (e.normalHours || 0), 0);
      const overtimeHours = dayEntries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0);
      const absenceHours = dayEntries.reduce((sum, e) => sum + (e.absenceHours || e.absence_hours || 0), 0);
      const totalHours = normalHours + overtimeHours + absenceHours;
      
      // Déterminer le statut du jour selon la logique métier
      let status = 'upcoming'; // Par défaut
      
      // Vérifier si c'est aujourd'hui
      const isToday = dayDate.getTime() === today.getTime();
      
      // Vérifier si c'est un jour futur
      const isFuture = dayDate > today;
      
      // Vérifier si c'est après la date d'approbation automatique (15 du mois suivant à 23h59)
      const isAfterAutoApproval = isAfterAutoApprovalDate(format(day, 'yyyy-MM-dd'));
      
      // RÈGLE CRITIQUE : Vérifier si le dimanche 23h59 de cette semaine est STRICTEMENT passé
      const dayWeekRange = getWeekRange(format(day, 'yyyy-MM-dd'));
      const weekEndDate = new Date(dayWeekRange.end + 'T23:59:59');
      const isWeekAutoSubmitted = now > weekEndDate; // Si on est APRÈS dimanche 23h59
      
      // Vérifier si c'est un week-end (samedi ou dimanche)
      const dayOfWeek = day.getDay(); // 0 = dimanche, 6 = samedi
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      console.log('🔍 ANALYSE JOUR', format(day, 'yyyy-MM-dd'), ':', {
        dayWeekRange,
        weekEndDate: weekEndDate.toISOString(),
        now: now.toISOString(),
        isWeekAutoSubmitted: isWeekAutoSubmitted,
        dimanchePasse: now > weekEndDate,
        hasEntries: dayEntries.length > 0,
        isWeekend,
        isFuture
      });
      
      // LOGIQUE PRINCIPALE : Traiter d'abord les jours futurs
      if (isFuture) {
        // TOUS les jours futurs sont "À venir" (week-end ou pas)
        status = 'upcoming';
      } else if (dayEntries.length > 0) {
        // JOUR AVEC HEURES ENREGISTRÉES
        if (isAfterAutoApproval) {
          // Jour passé après le 15 du mois suivant à 23h59
          if (dayEntries.some(e => e.status === 'rejected')) {
            // Si il y a du rejeté ET de l'approuvé = partiellement approuvé
            if (dayEntries.some(e => e.status === 'approved')) {
              status = 'partially_approved';
            } else {
              status = 'rejected';
            }
          } else {
            status = 'approved';
          }
        } else if (isWeekAutoSubmitted) {
          // Semaine soumise automatiquement (dimanche 23h59 passé)
          if (dayEntries.every(e => e.status === 'approved')) {
            status = 'approved';
          } else if (dayEntries.some(e => e.status === 'rejected')) {
            // Si il y a du rejeté ET de l'approuvé = partiellement approuvé
            if (dayEntries.some(e => e.status === 'approved')) {
              status = 'partially_approved';
            } else {
              status = 'rejected';
            }
          } else {
            status = 'submitted';
          }
        } else {
          // SEMAINE EN COURS (avant dimanche 23h59) - Utiliser le statut réel
          if (dayEntries.every(e => e.status === 'approved')) {
            status = 'approved';
          } else if (dayEntries.some(e => e.status === 'rejected')) {
            // Si il y a du rejeté ET de l'approuvé = partiellement approuvé
            if (dayEntries.some(e => e.status === 'approved')) {
              status = 'partially_approved';
            } else {
              status = 'rejected';
            }
          } else if (dayEntries.some(e => e.status === 'pending' || e.status === 'submitted')) {
            status = 'submitted';
          } else {
            status = 'draft';
          }
        }
      } else {
        // JOUR PASSÉ SANS HEURES ENREGISTRÉES
        if (isWeekend) {
          // Week-end passé sans heures = Non travaillé
          status = 'non-travaille';
        } else if (isAfterAutoApproval) {
          // Jour passé après le 15 du mois suivant à 23h59
          status = 'approved';
        } else if (isWeekAutoSubmitted) {
          // Semaine soumise automatiquement (dimanche 23h59 passé)
          // Jour ouvré sans heures = Soumis avec 0h
          status = 'submitted';
        } else {
          // SEMAINE EN COURS (avant dimanche 23h59) sans heures
          // Jour ouvré sans heures = Non enregistré
          status = 'not_registered';
        }
      }

      return {
        date: dayStr,
        dayName: format(day, 'EEEE d MMMM', { locale: fr }),
        totalHours,
        normalHours,
        overtimeHours,
        absenceHours,
        status,
        entries: dayEntries
      };
    });
  };

  const employeeList = generateEmployeeList();
  const monthDays = generateMonthDays();

  // Calculer les statistiques
  const stats = {
    total: timesheetsToShow.length,
    draft: timesheetsToShow.filter(ts => ts.status === 'draft').length,
    submitted: timesheetsToShow.filter(ts => ts.status === 'submitted').length,
    approved: timesheetsToShow.filter(ts => ts.status === 'approved').length,
    rejected: timesheetsToShow.filter(ts => ts.status === 'rejected').length,
    totalHours: timesheetsToShow.reduce((sum, ts) => sum + ts.totalHours, 0)
  };

  const renderEmployeeList = () => (
    <div className="space-y-4">
      {/* Liste des employés */}
      <div className="space-y-3">
        {employeeList.map((employeeData) => {
          const { employee, timesheets: employeeTimesheets, stats } = employeeData;
          const employeeInfo = getEmployeeInfo(employee.id);
          
          return (
            <div key={employee.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {employee.name} - {employeeInfo.company} - {format(selectedMonth, 'MMMM', { locale: fr })}
                    </h3>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Statistiques rapides */}
                  <div className="flex items-center space-x-2">
                    {stats.draftTimesheets > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                        {stats.draftTimesheets} brouillon{stats.draftTimesheets > 1 ? 's' : ''}
                      </span>
                    )}
                    {stats.pendingTimesheets > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {stats.pendingTimesheets} en attente
                      </span>
                    )}
                    {stats.approvedTimesheets > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        {stats.approvedTimesheets} approuvé{stats.approvedTimesheets > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  
                  {/* Bouton pour voir les feuilles de cet employé */}
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          // Générer et afficher l'aperçu PDF du mois en cours pour cet employé
                          // Utiliser le mois sélectionné dans les filtres au lieu du mois en cours
                          const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
                          
                          // Calculer les données du mois pour cet employé
                          const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                          const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
                          
                          console.log('🔍 === DIAGNOSTIC PDF DONNÉES ===');
                          console.log('👤 Employé sélectionné:', employee.name);
                          console.log('📅 Période:', monthStart.toISOString().split('T')[0], 'au', monthEnd.toISOString().split('T')[0]);
                          console.log('📊 timesheetsToShow total:', timesheetsToShow.length);
                          
                          const periodEntries: any[] = [];
                          
                          // RÉCUPÉRER LES VRAIES DONNÉES depuis timesheetsToShow
                          const employeeTimesheetsFiltered = timesheetsToShow.filter(ts => ts.userId === employee.id);
                          
                          console.log('📋 Feuilles de temps pour cet employé:', employeeTimesheetsFiltered.length);
                          console.log('📋 Détail feuilles:', employeeTimesheetsFiltered.map(ts => ({
                            id: ts.id,
                            weekStarting: ts.weekStarting,
                            weekEnding: ts.weekEnding,
                            entriesCount: ts.entries?.length || 0,
                            totalHours: ts.totalHours
                          })));
                          
                          employeeTimesheetsFiltered.forEach(timesheet => {
                            console.log('📝 Traitement feuille:', timesheet.id, 'avec', timesheet.entries?.length || 0, 'entrées');
                            
                            if (timesheet.entries && timesheet.entries.length > 0) {
                              timesheet.entries.forEach(entry => {
                                const entryDate = new Date(entry.date);
                                console.log('📅 Vérification entrée:', {
                                  date: entry.date,
                                  entryDate: entryDate.toISOString().split('T')[0],
                                  isInPeriod: entryDate >= monthStart && entryDate <= monthEnd,
                                  project: entry.project || entry.projectName || 'Projet inconnu',
                                  normalHours: entry.normalHours || entry.normal_hours || 0,
                                  overtimeHours: entry.overtimeHours || entry.overtime_hours || 0,
                                  status: entry.status
                                });

                                if (entryDate >= monthStart && entryDate <= monthEnd) {
                                  // Récupérer le vrai nom du projet
                                  let projectName = 'Non enregistré';
                                  if (entry.projectId && entry.projectId !== 'non-enregistre') {
                                    const project = availableProjects?.find(p => p.id === entry.projectId);
                                    projectName = project?.name || entry.project || entry.projectName || 'Projet inconnu';
                                  } else if ((entry.project || entry.projectName) && (entry.project || entry.projectName) !== 'Non enregistré') {
                                    projectName = entry.project || entry.projectName;
                                  }

                                  periodEntries.push({
                                    date: entry.date,
                                    project: projectName,
                                    normalHours: entry.normalHours || entry.normal_hours || 0,
                                    overtimeHours: entry.overtimeHours || entry.overtime_hours || 0,
                                    absenceHours: entry.absenceHours || entry.absence_hours || 0
                                  });
                                  
                                  console.log('✅ Entrée ajoutée au PDF:', {
                                    date: entry.date,
                                    project: projectName,
                                    normalHours: entry.normalHours || entry.normal_hours || 0,
                                    overtimeHours: entry.overtimeHours || entry.overtime_hours || 0
                                  });
                                }
                              });
                            }
                          });
                          
                          console.log('📊 === RÉSULTAT FINAL POUR PDF ===');
                          console.log('📋 Nombre d\'entrées trouvées:', periodEntries.length);
                          console.log('📋 Détail des entrées:', periodEntries);
                          
                          const totalNormalHours = periodEntries.reduce((sum, entry) => sum + entry.normalHours, 0);
                          const totalOvertimeHours = periodEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0);
                          const totalAbsenceHours = periodEntries.reduce((sum, entry) => sum + entry.absenceHours, 0);
                          const totalHours = totalNormalHours + totalOvertimeHours;
                          const workingDays = new Set(periodEntries.map(e => e.date)).size;
                          const leaveDays = periodEntries.filter(e => e.project === 'CONGÉS PAYÉS').map(e => e.date);
                          const leaveDaysCount = new Set(leaveDays).size;
                          
                          console.log('📊 === VÉRIFICATION FINALE AVANT PDF ===');
                          console.log('📋 Nombre d\'entrées pour PDF:', periodEntries.length);
                          console.log('📋 Détail entrées PDF:', periodEntries);
                          console.log('📊 Totaux calculés pour PDF:', {
                            totalNormalHours,
                            totalOvertimeHours,
                            totalHours,
                            workingDays
                          });
                          
                          if (periodEntries.length === 0) {
                            console.error('🚨 AUCUNE ENTRÉE TROUVÉE POUR LE PDF !');
                            console.error('🔍 Vérifiez que les dates correspondent à la période sélectionnée');
                            alert('⚠️ Aucune donnée trouvée pour cette période !\n\nVérifiez que le salarié a bien des heures enregistrées pour ce mois.');
                            return;
                          }
                          
                          console.log('📊 Totaux calculés:', {
                            totalNormalHours,
                            totalOvertimeHours,
                            totalHours,
                            workingDays
                          });
                          
                          // Préparer les données PDF
                          const pdfData = {
                            employeeName: employee.name,
                            companyName: employeeInfo.company,
                            month: monthStr,
                            year: selectedMonth.getFullYear(),
                            totalHours,
                            normalHours: totalNormalHours,
                            overtimeHours: totalOvertimeHours,
                            absenceHours: totalAbsenceHours,
                            workingDays,
                            leaveDays: leaveDaysCount,
                            entries: periodEntries
                          };
                          
                          // Importer et utiliser la fonction de prévisualisation PDF
                          import('../utils/pdfGenerator').then(async ({ previewPDF }) => {
                            await previewPDF(pdfData);
                          }).catch(error => {
                            console.error('Erreur import pdfGenerator:', error);
                            alert('Erreur lors de la génération de l\'aperçu PDF');
                          });
                        }}
                        className="inline-flex items-center px-3 py-1 border border-green-300 dark:border-green-600 text-xs font-medium rounded-md text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800"
                        title="Aperçu PDF du mois en cours"
                      >
                        <Eye size={12} className="mr-1" />
                        Aperçu
                      </button>
                      
                      {employeeTimesheets.length > 0 && (
                        <Link
                          to={`/timesheets?employee=${employee.id}`}
                         target="_blank"
                         rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-blue-300 dark:border-blue-600 text-xs font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800"
                        >
                          <Eye size={12} className="mr-1" />
                          Voir feuilles
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const toggleDayExpanded = (date: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const renderDaysView = () => (
    <div className="space-y-4">
      {/* Sélecteur de mois */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm px-4 py-1 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
          </h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={goToPreviousMonth}
              disabled={isAtMinimumMonth()}
              className={`p-1 ${
                isAtMinimumMonth()
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              ←
            </button>
            <button
              onClick={goToNextMonth}
              disabled={!canNavigateToNextMonth()}
              className={`p-1 ${
                !canNavigateToNextMonth()
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Liste des jours */}
      <div className="space-y-3">
        {monthDays.map((day) => {
          const isExpanded = expandedDays.has(day.date);

          return (
            <div
              key={day.date}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
            >
              {/* En-tête du jour - toujours visible, cliquable sur mobile */}
              <div
                className="p-4 md:cursor-default cursor-pointer"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    toggleDayExpanded(day.date);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {day.dayName}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-1" />
                          {(() => {
                            // Vérifier si le jour contient des congés ou absences
                            const hasLeave = day.entries.some(entry => entry.isPaidLeave);
                            const workHours = (day.normalHours || 0) + (day.overtimeHours || 0);
                            const absenceHours = day.absenceHours || 0;

                            if (hasLeave) {
                              return 'Congés';
                            } else if (workHours > 0) {
                              // Si il y a des heures de travail, on les affiche (même avec absence)
                              return `${Math.floor(workHours)} heures`;
                            } else if (absenceHours > 0) {
                              // Si seulement absence (pas de travail)
                              return 'Absent';
                            } else {
                              return `${Math.floor(day.totalHours)} heures`;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getStatusBadge(day.status)}
                  </div>
                </div>
              </div>

              {/* Détails des chantiers - visible sur desktop, dépliable sur mobile */}
              <div className={`${isExpanded ? 'block' : 'hidden'} md:block px-4 pb-4`}>
                {day.entries.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="space-y-2">
                      {day.entries.sort((a, b) =>
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                      ).map((entry, index) => (
                        <div key={entry.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              entry.status === 'approved' ? 'bg-green-500' :
                              entry.status === 'rejected' ? 'bg-red-500' :
                              entry.status === 'pending' ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`} />
                            <span className="font-medium">
                              {entry.projectId === 'non-enregistre' ? 'Non enregistré' : entry.project}
                            </span>
                          </div>
                          <span>
                            {Math.floor((entry.normalHours || 0) + (entry.overtimeHours || 0) + (entry.absenceHours || entry.absence_hours || 0))}h
                            {entry.overtimeHours > 0 && (
                              <span className="ml-1 text-purple-600 dark:text-purple-400">
                                ({Math.floor(entry.normalHours || 0)}h + {Math.floor(entry.overtimeHours)}h sup.)
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {day.entries.length === 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                      Aucune heure enregistrée
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeeksView = () => (
    <div className="space-y-4">
      {/* Générer toutes les semaines de l'année en cours */}
      {(() => {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const allWeeks = [];
        
        // Générer les semaines de septembre à décembre de l'année en cours
        for (let month = 8; month <= 11; month++) { // 8 = septembre, 11 = décembre
          const monthStart = new Date(currentYear, month, 1);
          const monthEnd = new Date(currentYear, month + 1, 0);
          
          // Trouver le premier lundi du mois
          let currentDate = new Date(monthStart);
          while (currentDate.getDay() !== 1) { // 1 = lundi
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          let weekNumber = 1;
          
          while (currentDate <= monthEnd) {
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 6); // Dimanche
            
            const weekStartStr = weekStart.toISOString().split('T')[0];
            const weekEndStr = weekEnd.toISOString().split('T')[0];
            
            // Chercher la feuille de temps correspondante
            const existingTimesheet = userTimesheets.find(ts => 
              ts.weekStarting === weekStartStr && ts.weekEnding === weekEndStr
            );
            
            // Déterminer le statut réel de la semaine
            let weekStatus = 'upcoming'; // Par défaut pour les semaines futures
            
            if (existingTimesheet) {
              // Si une feuille existe, utiliser son statut réel
              weekStatus = existingTimesheet.status;
            } else {
              // Si pas de feuille, vérifier si c'est une semaine future ou passée
              const now = new Date();
              const weekEndDate = new Date(weekEndStr + 'T23:59:59');
              
              if (weekEndDate < now) {
                // Semaine passée sans feuille = devrait être soumise automatiquement
                // Mais si pas de feuille, c'est qu'il n'y avait pas d'heures
                weekStatus = 'upcoming'; // Ou on pourrait mettre un autre statut
              } else {
                // Semaine future sans feuille
                weekStatus = 'upcoming';
              }
            }
            
            const monthNames = ['', '', '', '', '', '', '', '', 'septembre', 'octobre', 'novembre', 'décembre'];
            
            allWeeks.push({
              id: `week-${currentYear}-${month}-${weekNumber}`,
              weekNumber,
              month: monthNames[month],
              year: currentYear,
              weekStarting: weekStartStr,
              weekEnding: weekEndStr,
              timesheet: existingTimesheet,
              totalHours: existingTimesheet?.totalHours || 0,
              entriesCount: existingTimesheet?.entries?.length || 0,
              status: weekStatus
            });
            
            // Passer à la semaine suivante
            currentDate.setDate(currentDate.getDate() + 7);
            weekNumber++;
          }
        }
        
        return (
          <div className="space-y-3">
            {/* En-tête avec mois */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                septembre 2025
              </h3>
            </div>
            
            {allWeeks.map((week) => (
              <div key={week.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                          Semaine {week.weekNumber}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatWeekDisplay(week.weekStarting, week.weekEnding)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(week.status)}
                    {week.timesheet ? (
                      <Link
                        to={`/timesheets/${week.timesheet.id}`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        <Eye size={12} className="mr-1" />
                        Voir
                      </Link>
                    ) : (
                      <Link
                        to="/calendar"
                        className="inline-flex items-center px-3 py-1 border border-blue-300 dark:border-blue-600 text-xs font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800"
                      >
                        <Plus size={12} className="mr-1" />
                        Créer
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );

  return (
    <div key={`timesheet-list-${dataVersion}`} className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/')}
            className="mr-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-blue-600 transition-colors duration-200 group"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isAdmin ? 'Feuilles de temps des salariés' : 'Mes feuilles de temps'}
            </h1>
            {isAdmin && (
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Consulter toutes les feuilles de temps
              </p>
            )}
          </div>
        </div>
        
        {!isAdmin && (
          <Link
            to="/calendar"
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-md hover:shadow-lg"
            title="Nouvelle feuille"
          >
            <Plus size={20} />
          </Link>
        )}
      </div>

      {isAdmin ? (
        // Interface administrateur avec filtres et liste des employés
        <div className="space-y-6">
          {/* Filtres administrateur */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Filter className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Filtres de recherche</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtre par entreprise */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entreprise
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setSelectedEmployee('all'); // Reset employee filter when company changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes les entreprises</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par employé */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employé
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les employés</option>
                  {filteredEmployees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.department})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par année */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Année
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par mois */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mois
                </label>
                <select
                  value={selectedMonth.getMonth()}
                  onChange={(e) => setSelectedMonth(new Date(selectedYear, parseInt(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0} disabled={isMonthDisabled(selectedYear, 0)}>Janvier</option>
                  <option value={1} disabled={isMonthDisabled(selectedYear, 1)}>Février</option>
                  <option value={2} disabled={isMonthDisabled(selectedYear, 2)}>Mars</option>
                  <option value={3} disabled={isMonthDisabled(selectedYear, 3)}>Avril</option>
                  <option value={4} disabled={isMonthDisabled(selectedYear, 4)}>Mai</option>
                  <option value={5} disabled={isMonthDisabled(selectedYear, 5)}>Juin</option>
                  <option value={6} disabled={isMonthDisabled(selectedYear, 6)}>Juillet</option>
                  <option value={7} disabled={isMonthDisabled(selectedYear, 7)}>Août</option>
                  <option value={8} disabled={isMonthDisabled(selectedYear, 8)}>Septembre</option>
                  <option value={9} disabled={isMonthDisabled(selectedYear, 9)}>Octobre</option>
                  <option value={10} disabled={isMonthDisabled(selectedYear, 10)}>Novembre</option>
                  <option value={11} disabled={isMonthDisabled(selectedYear, 11)}>Décembre</option>
                </select>
              </div>
              
              {/* Bouton Télécharger */}
              <div className="flex items-end">
                <button
                  onClick={handleDownloadFiltered}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                  title="Télécharger les feuilles selon les filtres"
                >
                  <Download size={16} className="mr-2" />
                  Télécharger
                </button>
              </div>
            </div>
            
            {/* Indicateur de filtrage actif */}
            {(selectedCompany !== 'all' || selectedEmployee !== 'all' || selectedYear !== new Date().getFullYear()) && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Filtres actifs : 
                  {selectedCompany !== 'all' && ` ${companies.find(c => c.id === selectedCompany)?.name}`}
                  {selectedEmployee !== 'all' && ` • ${employees.find(e => e.id === selectedEmployee)?.name}`}
                  {selectedYear !== new Date().getFullYear() && ` • ${selectedYear}`}
                </div>
                <button
                  onClick={() => {
                    setSelectedCompany('all');
                    setSelectedEmployee('all');
                    setSelectedYear(new Date().getFullYear());
                    setSelectedMonth(new Date());
                  }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Réinitialiser
                </button>
              </div>
            )}
          </div>
          
          {/* Liste des employés */}
          {renderEmployeeList()}
        </div>
      ) : (
        // Interface salarié avec statistiques compactes
        <div className="space-y-6">
          <div className="mb-4 grid grid-cols-5 gap-1 sm:gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <div className="flex flex-col items-center">
                <div className="bg-yellow-100 dark:bg-yellow-900 p-1 rounded-full mb-1">
                  <Clock className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">Brouillons</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{monthDays.filter(day => day.status === 'draft').length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <div className="flex flex-col items-center">
                <div className="bg-blue-100 dark:bg-blue-900 p-1 rounded-full mb-1">
                  <Send className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">Soumis</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{monthDays.filter(day => day.status === 'submitted').length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <div className="flex flex-col items-center">
                <div className="bg-green-100 dark:bg-green-900 p-1 rounded-full mb-1">
                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">Approuvés</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{monthDays.filter(day => day.status === 'approved').length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <div className="flex flex-col items-center">
                <div className="bg-orange-100 dark:bg-orange-900 p-1 rounded-full mb-1">
                  <AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">Partiellement</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{monthDays.filter(day => day.status === 'partially_approved').length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <div className="flex flex-col items-center">
                <div className="bg-red-100 dark:bg-red-900 p-1 rounded-full mb-1">
                  <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">Refusés</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{monthDays.filter(day => day.status === 'rejected').length}</p>
              </div>
            </div>
          </div>
          
          {/* Vue par jour uniquement */}
          {renderDaysView()}
        </div>
      )}
    </div>
  );
};

export default TimesheetList;