import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimesheets } from '../context/TimesheetContext';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Users, FileSpreadsheet, Building2, RefreshCw, AlertTriangle, CheckCircle, Database, User, Calendar as CalendarIcon } from 'lucide-react';
import { getCurrentWeekRange } from '../utils/helpers';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

function Dashboard() {
  const { currentUser, isAdmin, companies, employees, projects, getProjectsForCompany, syncData: syncAuthData } = useAuth();
  const { timesheets, userTimesheets, resetData, checkAndSubmitWeeklyTimesheets, syncData: syncTimesheetData, loading } = useTimesheets();
  const currentWeek = getCurrentWeekRange();
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weeklySubmissionStatus, setWeeklySubmissionStatus] = useState<{
    hasCurrentWeek: boolean;
    isSubmitted: boolean;
    timeUntilSubmission: string;
  }>({ hasCurrentWeek: false, isSubmitted: false, timeUntilSubmission: '' });
  const [dataVersion, setDataVersion] = useState(0);
  const [pendingEmployeesCount, setPendingEmployeesCount] = useState(0);
  const navigate = useNavigate();
  
  // Charger le nombre de salariés avec des entrées en attente
  useEffect(() => {
    const loadPendingEmployeesCount = async () => {
      if (!isAdmin) return;

      try {
        const { data, error } = await supabase
          .from('timesheet_entries')
          .select('user_id')
          .eq('status', 'pending');

        if (error) {
          console.error('Erreur chargement salariés en attente:', error);
          return;
        }

        const uniqueUsers = new Set(data?.map(entry => entry.user_id) || []);
        setPendingEmployeesCount(uniqueUsers.size);
        console.log('📊 DASHBOARD - Salariés en attente (depuis timesheet_entries):', uniqueUsers.size);
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    loadPendingEmployeesCount();
  }, [isAdmin, dataVersion]);

  // Trouver la feuille de temps de la semaine en cours - recalculé à chaque rendu
  const getCurrentWeekTimesheet = () => {
    return userTimesheets.find(
      ts => ts.weekStarting === currentWeek.start && ts.weekEnding === currentWeek.end
    );
  };

  const currentWeekTimesheet = getCurrentWeekTimesheet();
  
  // Vérifier si on est en décembre
  const isDecember = new Date().getMonth() === 11;

  // Composant pour les flocons de neige
  const Snowflake: React.FC<{ delay: number; duration: number; left: string; size: number; drift: number }> = ({ delay, duration, left, size, drift }) => (
    <div
      className="fixed text-blue-300 opacity-90 pointer-events-none select-none"
      style={{
        left,
        top: '-200px',
        fontSize: `${size}px`,
        animation: `snowfall-${Math.abs(drift)} ${duration}s linear ${delay}s infinite`,
        zIndex: 1
      }}
    >
      ❄
    </div>
  );

  // Générer des flocons de neige pour décembre
  const generateSnowflakes = () => {
    const snowflakes = [];
    const animations = [];
    
    for (let i = 0; i < 70; i++) {
      const drift = Math.random() * 80 - 40; // Dérive de -40px à +40px
      const animationId = Math.floor(Math.abs(drift));
      
      // Créer une animation unique pour chaque type de dérive
      if (!animations.includes(animationId)) {
        animations.push(animationId);
      }
      
      snowflakes.push(
        <Snowflake
          key={i}
          delay={Math.random() * 3} // Délai réduit de 0-3 secondes
          duration={Math.random() * 10 + 8} // 8-18 secondes (plus rapide)
          left={`${Math.random() * 100}%`}
          size={Math.random() * 14 + 10}
          drift={drift}
        />
      );
    }
    
    return { snowflakes, animations };
  };
  
  const { snowflakes, animations } = generateSnowflakes();
  
  // Générer les animations CSS dynamiquement
  const generateSnowfallAnimations = () => {
    return animations.map(drift => `
      @keyframes snowfall-${drift} {
        0% {
          transform: translateY(-100px) translateX(0px) rotate(0deg) scale(0.8);
          opacity: 1;
        }
        10% {
          transform: translateY(8vh) translateX(${drift * 0.1 + Math.sin(0.1 * Math.PI) * 12}px) rotate(36deg) scale(1);
          opacity: 1;
        }
        25% {
          transform: translateY(20vh) translateX(${drift * 0.25 + Math.sin(0.25 * Math.PI * 2) * 16}px) rotate(90deg) scale(0.9);
          opacity: 1;
        }
        40% {
          transform: translateY(35vh) translateX(${drift * 0.4 + Math.sin(0.4 * Math.PI * 3) * 14}px) rotate(144deg) scale(1.1);
          opacity: 1;
        }
        50% {
          transform: translateY(45vh) translateX(${drift * 0.5 + Math.sin(0.5 * Math.PI * 4) * 18}px) rotate(180deg) scale(0.95);
          opacity: 1;
        }
        65% {
          transform: translateY(60vh) translateX(${drift * 0.65 + Math.sin(0.65 * Math.PI * 5) * 13}px) rotate(234deg) scale(1.05);
          opacity: 1;
        }
        75% {
          transform: translateY(70vh) translateX(${drift * 0.75 + Math.sin(0.75 * Math.PI * 6) * 15}px) rotate(270deg) scale(0.9);
          opacity: 1;
        }
        90% {
          transform: translateY(85vh) translateX(${drift * 0.9 + Math.sin(0.9 * Math.PI * 7) * 11}px) rotate(324deg) scale(1);
          opacity: 1;
        }
        100% {
          transform: translateY(calc(100vh + 100px)) translateX(${drift + Math.sin(Math.PI * 8) * 10}px) rotate(360deg) scale(0.8);
          opacity: 0;
        }
      }
    `).join('\n');
  };
  
  // Écouter les mises à jour globales des données
  useEffect(() => {
    const handleGlobalUpdate = () => {
      setRefreshKey(prev => prev + 1);
      setDataVersion(prev => prev + 1);
      console.log('📊 Dashboard: Données mises à jour globalement');
    };

    // Écouter l'événement personnalisé
    window.addEventListener('globalTimesheetUpdate', handleGlobalUpdate);
    window.addEventListener('timesheetDataUpdated', handleGlobalUpdate);

    return () => {
      window.removeEventListener('globalTimesheetUpdate', handleGlobalUpdate);
      window.removeEventListener('timesheetDataUpdated', handleGlobalUpdate);
    };
  }, []);

  // Effet spécifique pour surveiller les changements dans userTimesheets
  useEffect(() => {
    console.log('📊 Dashboard: userTimesheets mis à jour, nombre de feuilles:', userTimesheets.length);
    setRefreshKey(prev => prev + 1);
    setDataVersion(prev => prev + 1);
  }, [userTimesheets]);

  // Calculer le statut de soumission hebdomadaire
  useEffect(() => {
    if (!currentUser) return;

    const updateWeeklyStatus = () => {
      const now = new Date();
      // Calculer le lundi de cette semaine (système français)
      const dayOfWeek = now.getDay(); // 0=dimanche, 1=lundi, 6=samedi
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si dimanche, c'est 6 jours depuis lundi
      
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - daysFromMonday);
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Dimanche = lundi + 6 jours

      // Calculer le temps restant jusqu'à dimanche 23h59
      const nextSunday = new Date(currentWeekEnd);
      nextSunday.setHours(23, 59, 59, 999);
      
      const timeLeft = nextSunday.getTime() - now.getTime();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      let timeUntilSubmission = '';
      if (hoursLeft >= 0 && minutesLeft >= 0) {
        if (hoursLeft > 24) {
          const daysLeft = Math.floor(hoursLeft / 24);
          timeUntilSubmission = `${daysLeft}j ${hoursLeft % 24}h`;
        } else {
          timeUntilSubmission = `${hoursLeft}h ${minutesLeft}min`;
        }
      } else {
        timeUntilSubmission = 'Soumission automatique en cours...';
      }

      setWeeklySubmissionStatus({
        hasCurrentWeek: !!currentWeekTimesheet && currentWeekTimesheet.entries.length > 0,
        isSubmitted: currentWeekTimesheet?.status !== 'draft',
        timeUntilSubmission
      });
    };

    updateWeeklyStatus();
    const interval = setInterval(updateWeeklyStatus, 60000); // Mettre à jour toutes les minutes

    return () => clearInterval(interval);
  }, [currentUser, currentWeekTimesheet, dataVersion]);
  
  // Calculer les heures de la semaine en cours - fonction pure
  const calculateCurrentWeekHours = () => {
    // Utiliser getCurrentWeekRange pour avoir les mêmes dates que partout ailleurs
    const weekRange = getCurrentWeekRange();
    const currentWeekStartStr = weekRange.start;
    const currentWeekEndStr = weekRange.end;
    
    console.log('📊 Dashboard: Recherche semaine en cours:', currentWeekStartStr, '-', currentWeekEndStr);
    console.log('📊 Dashboard: User ID recherché:', currentUser?.id);
    console.log('📊 Dashboard: Feuilles disponibles:', userTimesheets.length);
    
    // Chercher la feuille de temps correspondant à cette semaine
    const timesheet = userTimesheets.find(ts => 
      ts.weekStarting === currentWeekStartStr && 
      ts.weekEnding === currentWeekEndStr &&
      ts.userId === currentUser?.id
    );
    
    if (!timesheet) {
      console.log('📊 Dashboard: Aucune feuille de temps trouvée pour la semaine en cours', currentWeekStartStr, '-', currentWeekEndStr);
      console.log('📊 Dashboard: Feuilles disponibles:', userTimesheets.map(ts => ({
        weekStarting: ts.weekStarting,
        weekEnding: ts.weekEnding,
        totalHours: ts.totalHours,
        entriesCount: ts.entries?.length || 0,
        userId: ts.userId
      })));
      return { totalHours: 0, entriesCount: 0 };
    }
    
    // Utiliser directement total_hours de la table timesheets (calculé automatiquement par le trigger)
    const totalHours = timesheet.total_hours || 0;
    const entriesCount = timesheet.entries?.length || 0;
    
    console.log('📊 Dashboard: Heures semaine en cours (depuis timesheets.total_hours):', {
      totalHours,
      entriesCount,
      timesheetId: timesheet.id,
      weekStart: timesheet.weekStarting,
      weekEnd: timesheet.weekEnding
    });
    
    return { totalHours, entriesCount };
  };
  
  const currentWeekData = calculateCurrentWeekHours();
  
  const getCompanyStats = (companyId: string) => {
    const activeEmployees = employees.filter(
      emp => emp.companyId === companyId && !emp.archived && emp.role !== 'admin'
    ).length;

    console.log('📊 DASHBOARD - Calcul stats pour entreprise:', companyId);
    const companyEmployees = employees.filter(emp => emp.companyId === companyId && !emp.archived);
    console.log('👥 EMPLOYÉS ACTIFS pour', companyId, ':', companyEmployees.map(emp => ({ id: emp.id, name: emp.name, companyId: emp.companyId })));
    
    const companyTimesheets = timesheets.filter(ts => {
      // Vérifier que l'employé appartient SPÉCIFIQUEMENT à cette entreprise
      const employee = employees.find(emp => emp.id === ts.userId && !emp.archived);
      const belongsToCompany = employee && employee.companyId === companyId;
      
      if (companyId === '550e8400-e29b-41d4-a716-446655440011') { // NUMELEC
        console.log('🏢 DASHBOARD NUMELEC - Feuille examinée:', {
          id: ts.id,
          userId: ts.userId,
          userName: ts.userName,
          status: ts.status,
          employeeCompanyId: employee?.companyId,
          targetCompanyId: companyId,
          entriesCount: ts.entries?.length || 0,
          belongsToCompany,
          employeeFound: employee
        });
      }
      
      return belongsToCompany;
    });
    
    const companyName = companies.find(c => c.id === companyId)?.name;
    console.log('📋 FEUILLES TROUVÉES POUR', companyName, ':', companyTimesheets.length);
    
    // 🎯 NOUVELLE LOGIQUE : Compter les salariés avec des entrées 'pending' (SANS les brouillons)
    const employeesWithPending = new Set<string>();
    companyTimesheets.forEach(ts => {
      // ✅ LOGIQUE CORRIGÉE AVEC AUTH_ID : Chercher les entrées 'pending' (EXCLURE les 'draft')
      if (ts.entries && ts.entries.length > 0) {
        // Vérifier si ce timesheet a des entrées pending/submitted
        const hasPendingEntries = ts.entries.some(entry => 
          entry.status === 'pending' || entry.status === 'submitted'
        );
        
        if (hasPendingEntries) {
          // Utiliser auth_id en priorité, sinon user_id
          const employeeIdentifier = ts.auth_id || ts.userId;
          employeesWithPending.add(employeeIdentifier);
        }
      }
    });
    const pendingApprovals = employeesWithPending.size;
    
    console.log('⏳ APPROBATIONS EN ATTENTE POUR', companyName, ':', pendingApprovals);
    
    const now = new Date();
    const startOfMonthDate = startOfMonth(now);
    const monthlyTimesheets = companyTimesheets.filter(ts => {
      const tsDate = new Date(ts.weekStarting);
      return tsDate >= startOfMonthDate;
    });

    const totalHours = monthlyTimesheets.reduce((sum, ts) => sum + ts.totalHours, 0);
    
    // Compter les chantiers de cette entreprise (principaux + secondaires)
    const companyProjects = projects.filter(p => 
      p.companyId === companyId && p.active && !p.archived
    );

    return {
      activeEmployees,
      pendingApprovals,
      totalHours,
      projectsCount: companyProjects.length
    };
  };

  // Calculer les statistiques mensuelles pour l'utilisateur connecté - CORRIGÉ
  const getMonthlyStats = () => {
    if (!currentUser) return { totalHours: 0, normalHours: 0, overtimeHours: 0, workingDays: 0, absenceHours: 0, leaveDays: 0 };

    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    console.log('📊 DASHBOARD - Calcul mensuel pour:', format(now, 'MMMM yyyy', { locale: fr }));
    console.log('📊 DASHBOARD - Période:', start.toISOString().split('T')[0], 'au', end.toISOString().split('T')[0]);
    console.log('📊 DASHBOARD - Feuilles utilisateur disponibles:', userTimesheets.length);

    // Créer un map des entrées par date pour le mois en cours
    const entriesByDate: Record<string, any[]> = {};

    userTimesheets.forEach(timesheet => {
      console.log('📋 DASHBOARD - Traitement feuille:', timesheet.id, 'avec', timesheet.entries.length, 'entrées');

      timesheet.entries.forEach(entry => {
        const entryDate = new Date(entry.date + 'T00:00:00'); // Forcer l'heure locale

        // Vérifier si l'entrée est dans le mois sélectionné
        if (entryDate >= start && entryDate <= end) {
          const dateKey = entry.date;
          if (!entriesByDate[dateKey]) {
            entriesByDate[dateKey] = [];
          }

          entriesByDate[dateKey].push(entry);

          console.log('✅ DASHBOARD - Entrée ajoutée pour', dateKey, ':', entry.normalHours, 'h normales +', entry.overtimeHours, 'h supp');
        } else {
          console.log('❌ DASHBOARD - Entrée ignorée (hors mois):', entry.date);
        }
      });
    });

    console.log('📅 DASHBOARD - Entrées par date:', Object.keys(entriesByDate).length, 'jours avec des données');

    // Calculer les totaux
    let totalNormalHours = 0;
    let totalOvertimeHours = 0;
    let totalAbsenceHours = 0;
    const workingDaysSet = new Set<string>();
    const leaveDaysSet = new Set<string>();

    Object.entries(entriesByDate).forEach(([date, dayEntries]) => {
      // Séparer les entrées par type
      const workEntries = dayEntries.filter(entry => !entry.isPaidLeave && !entry.isAbsence);
      const absenceEntries = dayEntries.filter(entry => entry.isAbsence);
      const leaveEntries = dayEntries.filter(entry => entry.isPaidLeave);

      // Compter les heures de travail
      const dayNormalHours = workEntries.reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
      const dayOvertimeHours = workEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);

      // Compter les heures d'absence
      const dayAbsenceHours = absenceEntries.reduce((sum, entry) => sum + (entry.absenceHours || entry.normalHours || 0), 0);

      totalNormalHours += dayNormalHours;
      totalOvertimeHours += dayOvertimeHours;
      totalAbsenceHours += dayAbsenceHours;

      // Compter les jours travaillés (avec des heures de travail)
      if (dayNormalHours > 0 || dayOvertimeHours > 0) {
        workingDaysSet.add(date);
      }

      // Compter les jours de congés (jour complet uniquement)
      if (leaveEntries.length > 0) {
        leaveDaysSet.add(date);
      }

      console.log('📊 DASHBOARD - Jour', date, ':', dayNormalHours, 'h normales +', dayOvertimeHours, 'h supp +', dayAbsenceHours, 'h absence');
    });

    const totalHours = totalNormalHours + totalOvertimeHours;
    const workingDays = workingDaysSet.size;
    const leaveDays = leaveDaysSet.size;

    console.log('📊 DASHBOARD - Statistiques finales:', {
      totalHours,
      normalHours: totalNormalHours,
      overtimeHours: totalOvertimeHours,
      workingDays,
      absenceHours: totalAbsenceHours,
      leaveDays
    });

    return {
      totalHours,
      normalHours: totalNormalHours,
      overtimeHours: totalOvertimeHours,
      workingDays,
      absenceHours: totalAbsenceHours,
      leaveDays
    };
  };

  // Fonction de synchronisation complète
  const handleFullSync = async () => {
    console.log('🔄 SYNCHRONISATION COMPLÈTE DÉCLENCHÉE...');
    await Promise.all([
      syncAuthData(),
      syncTimesheetData()
    ]);
    console.log('✅ SYNCHRONISATION COMPLÈTE TERMINÉE');
  };

  // Fonction pour naviguer vers la gestion d'une entreprise spécifique
  const handleCompanyClick = (companyId: string) => {
    navigate(`/company/${companyId}`);
  };

  const monthlyStats = getMonthlyStats();

  return (
    <div key={`dashboard-${dataVersion}-${refreshKey}`} className="h-full bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Flocons de neige sur tout l'écran pour décembre */}
      {isDecember && (
        <>
          <style dangerouslySetInnerHTML={{ __html: generateSnowfallAnimations() }} />
          <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
            {snowflakes}
          </div>
        </>
      )}

      {/* Contenu */}
      <div className="h-full p-3 sm:p-4 md:p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de bord</h1>
          </div>
        </div>
      </div>

      {/* Indicateur de chargement */}
      {loading && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 transition-colors duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Synchronisation en cours...
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>Synchronisation des données avec Supabase en cours.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification de soumission automatique pour les employés */}
      {!isAdmin && weeklySubmissionStatus.hasCurrentWeek && !weeklySubmissionStatus.isSubmitted && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 transition-colors duration-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Soumission automatique programmée
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  Votre feuille de temps sera automatiquement soumise pour approbation dans : 
                  <span className="font-medium ml-1">{weeklySubmissionStatus.timeUntilSubmission}</span>
                </p>
                <p className="mt-1 text-xs">
                  📅 Soumission automatique : Dimanche 23h59
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation de soumission automatique */}
      {!isAdmin && weeklySubmissionStatus.hasCurrentWeek && weeklySubmissionStatus.isSubmitted && (
        <div className="mb-6 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 transition-colors duration-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                Feuille de temps soumise
              </h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>
                  Votre feuille de temps de cette semaine a été soumise pour approbation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Contenu principal - MOBILE RESPONSIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {isAdmin ? (
          <div className="lg:col-span-3">
            {/* Navigation rapide pour les administrateurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Link
                to="/employees"
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Employés</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {employees.filter(emp => !emp.archived && emp.role !== 'admin').length}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/projects"
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Building2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Chantiers</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {(() => {
                        // Compter tous les projets actifs non archivés
                        const activeProjects = projects.filter(p => p.active && !p.archived);
                        console.log('📊 DASHBOARD - Projets actifs comptés:', activeProjects.length);
                        return activeProjects.length;
                      })()}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/approvals"
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Salariés en attente</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {pendingEmployeesCount}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/archives"
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <FileSpreadsheet className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Archives</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Consulter
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Titre pour les entreprises */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Gestion par entreprise</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cliquez sur une entreprise pour gérer ses employés et chantiers</p>
            </div>

            {/* Cartes des entreprises CLIQUABLES pour les administrateurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map(company => {
                const stats = getCompanyStats(company.id);
                return (
                  <div 
                    key={company.id} 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group"
                    onClick={() => handleCompanyClick(company.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center min-w-0 flex-1">
                          <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              {company.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{company.email}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded group-hover:bg-blue-50 dark:group-hover:bg-blue-900 transition-colors">
                          <Users className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Employés actifs</p>
                            <p className="text-sm font-semibold">{stats.activeEmployees}</p>
                          </div>
                        </div>

                        <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded group-hover:bg-blue-50 dark:group-hover:bg-blue-900 transition-colors">
                          <FileSpreadsheet className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Salariés</p>
                            <p className="text-sm font-semibold">{stats.pendingApprovals}</p>
                          </div>
                        </div>

                        <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded group-hover:bg-blue-50 dark:group-hover:bg-blue-900 transition-colors">
                          <Clock className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Heures ce mois</p>
                            <p className="text-sm font-semibold">{stats.totalHours}h</p>
                          </div>
                        </div>

                        <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded group-hover:bg-blue-50 dark:group-hover:bg-blue-900 transition-colors">
                          <Building2 className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Chantiers</p>
                            <p className="text-sm font-semibold">{stats.projectsCount}</p>
                          </div>
                        </div>
                      </div>

                      {/* Indicateur visuel que c'est cliquable */}
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                        <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <span>Cliquer pour gérer cette entreprise</span>
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-3 space-y-6">
            {/* Récapitulatif du mois en cours */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {format(new Date(), 'MMMM yyyy', { locale: fr })}
                  </h2>
                  <Link to="/timesheets" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer transition-colors duration-200 whitespace-nowrap">
                    Voir détails
                  </Link>
                </div>

                <div className="space-y-4">
                  {/* Heures normales */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 rounded-lg transition-colors duration-200">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Heures normales</span>
                    </div>
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{Math.floor(monthlyStats.normalHours)}</span>
                  </div>

                  {/* Heures supplémentaires */}
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900 rounded-lg transition-colors duration-200">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Heures supplémentaires</span>
                    </div>
                    <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{Math.floor(monthlyStats.overtimeHours)}</span>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900 rounded-lg transition-colors duration-200">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Heures total du mois</span>
                    </div>
                    <span className="text-xl font-bold text-green-700 dark:text-green-300">{Math.floor(monthlyStats.totalHours)}</span>
                  </div>

                  {/* Jours travaillés */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Jours travaillés</span>
                    </div>
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{monthlyStats.workingDays}</span>
                  </div>

                  {/* Absences */}
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900 rounded-lg transition-colors duration-200">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Heures d'absence</span>
                    </div>
                    <span className="text-lg font-bold text-orange-700 dark:text-orange-300">{Math.floor(monthlyStats.absenceHours)}</span>
                  </div>

                  {/* Congés */}
                  <div className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-900 rounded-lg transition-colors duration-200">
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-teal-600 mr-2" />
                      <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Jours de congés</span>
                    </div>
                    <span className="text-lg font-bold text-teal-700 dark:text-teal-300">{monthlyStats.leaveDays}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default Dashboard;