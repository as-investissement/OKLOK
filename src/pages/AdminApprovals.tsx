import React, { useState, useEffect, useMemo } from 'react';
import { useTimesheets } from '../context/TimesheetContext';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDate, getEntryDisplayName } from '../utils/helpers';
import { CheckCircle, XCircle, ArrowLeft, Clock, User, Building2, Calendar, AlertTriangle, Users, Briefcase, Flag, ChevronRight } from 'lucide-react';

const AdminApprovals = () => {
  const { approveDayByDate, rejectDayByDate, approveEntryById, rejectEntryById } = useTimesheets();
  const { companies, employees, currentUser, isAdmin, session } = useAuth();
  const [realTimesheets, setRealTimesheets] = useState<any[]>([]);
  const [loadingRealData, setLoadingRealData] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentData, setCommentData] = useState<{
    timesheetId: string;
    date: string;
    action: 'approve' | 'reject';
    entryDetails?: any;
  } | null>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const navigate = useNavigate();
  
  // État pour le diagnostic
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // Charger les vraies données depuis Supabase
  const loadRealDataFromSupabase = async () => {
    try {
      setLoadingRealData(true);
      console.log('📊 === DÉBUT CHARGEMENT ADMIN APPROVALS ===');
      console.log('👤 Utilisateur connecté:', employees.find(emp => emp.email === 'ahlemoslah@outlook.fr')?.name || 'Non trouvé');
      
      // DIAGNOSTIC COMPLET
      const diagnostic: any = {
        timestamp: new Date().toISOString(),
        user: currentUser,
        isAdmin,
        session: !!session,
        companies: companies.length,
        employees: employees.length,
        timesheets: { total: 0, withEntries: 0, pending: 0 },
        entries: { total: 0, byStatus: {} }
      };

      // Charger toutes les feuilles de temps avec leurs entrées
      console.log('🔍 === DIAGNOSTIC ÉTAPE 1: CHARGEMENT TIMESHEETS ===');
      const { data: timesheetsData, error: timesheetsError } = await supabase
        .from('timesheets')
        .select(`
          id,
          user_id,
          company_id,
          week_starting,
          week_ending,
          total_hours,
          status,
          created_at,
          updated_at
        `)
        .order('week_starting', { ascending: false });

      if (timesheetsError) {
        console.error('❌ === ERREUR CHARGEMENT TIMESHEETS ===');
        console.error('❌ Code:', timesheetsError.code);
        console.error('❌ Message:', timesheetsError.message);
        console.error('❌ Détails:', timesheetsError.details);
        diagnostic.timesheetsError = timesheetsError;
        setDiagnosticInfo(diagnostic);
        return;
      }

      console.log('✅ Timesheets chargées:', timesheetsData?.length || 0);
      console.log('📋 Échantillon timesheets:', timesheetsData?.slice(0, 2));
      
      diagnostic.timesheets.total = timesheetsData?.length || 0;
      diagnostic.timesheetsData = timesheetsData?.slice(0, 5); // Échantillon

      // Charger toutes les entrées
      console.log('🔍 === DIAGNOSTIC ÉTAPE 2: CHARGEMENT ENTRIES ===');
      const { data: entriesData, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select(`
          id,
          timesheet_id,
          user_id,
          date,
          project_id,
          project_name,
          normal_hours,
          overtime_hours,
          status,
          created_at,
          updated_at
        `)
        .neq('status', 'draft') // ← MASQUER LES BROUILLONS POUR L'ADMIN
        .order('date', { ascending: false });

      if (entriesError) {
        console.error('❌ === ERREUR CHARGEMENT ENTRIES ===');
        console.error('❌ Code:', entriesError.code);
        console.error('❌ Message:', entriesError.message);
        console.error('❌ Détails:', entriesError.details);
        diagnostic.entriesError = entriesError;
        setDiagnosticInfo(diagnostic);
        return;
      }

      console.log('✅ Entries chargées:', entriesData?.length || 0);
      diagnostic.entries.total = entriesData?.length || 0;
      
      // Analyser les statuts
      const statusBreakdown = entriesData?.reduce((acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      diagnostic.entries.byStatus = statusBreakdown;
      diagnostic.entriesData = entriesData?.slice(0, 10); // Échantillon
      
      console.log('📋 Statuts des entries:', entriesData?.reduce((acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log('📋 Échantillon entries pending:', entriesData?.filter(e => e.status === 'pending').slice(0, 3));

      // Assembler les données
      console.log('🔍 === DIAGNOSTIC ÉTAPE 3: ASSEMBLAGE ===');
      const assembledTimesheets = timesheetsData.map(ts => {
        const tsEntries = entriesData.filter(entry => entry.timesheet_id === ts.id);
        const employee = employees.find(emp => emp.id === ts.user_id);
        
        return {
          id: ts.id,
          userId: ts.user_id,
          userName: employee?.name || 'Employé inconnu',
          companyId: ts.company_id,
          weekStarting: ts.week_starting,
          weekEnding: ts.week_ending,
          totalHours: ts.total_hours || 0,
          status: ts.status,
          entries: tsEntries.map(entry => {
            // Filtre par année
            if (selectedYear !== 'all') {
              const entryDate = new Date(entry.date);
              const entryYear = entryDate.getFullYear();
              if (entryYear.toString() !== selectedYear) {
                return null;
              }
            }
            
            return {
              id: entry.id,
              userId: entry.user_id,
              date: entry.date,
              projectId: entry.project_id,
              project: entry.project_name || 'Projet inconnu',
              normalHours: entry.normal_hours || 0,
              overtimeHours: entry.overtime_hours || 0,
              status: entry.status,
              createdAt: entry.created_at,
              updatedAt: entry.updated_at
            };
          }).filter(entry => entry !== null),
          createdAt: ts.created_at,
          updatedAt: ts.updated_at
        };
      });

      diagnostic.timesheets.withEntries = assembledTimesheets.filter(ts => ts.entries.length > 0).length;
      diagnostic.timesheets.pending = assembledTimesheets.filter(ts => 
        ts.entries.some(entry => entry.status === 'pending')
      ).length;
      
      diagnostic.assembledTimesheets = assembledTimesheets.slice(0, 3); // Échantillon
      setDiagnosticInfo(diagnostic);

      setRealTimesheets(assembledTimesheets);
      
      console.log('✅ === TIMESHEETS VIRTUELS CRÉÉS ===');
      console.log('📊 Total feuilles assemblées:', assembledTimesheets.length);
      
      const timesheetsWithEntries = assembledTimesheets.filter(ts => ts.entries && ts.entries.length > 0);
      console.log('📊 Feuilles avec entrées:', timesheetsWithEntries.length);
      
      const timesheetsWithPending = timesheetsWithEntries.filter(ts => 
        ts.entries.some(entry => entry.status === 'pending')
      );
      console.log('📊 Feuilles avec pending:', timesheetsWithPending.length);
      
      // VÉRIFICATION FINALE
      const pendingEntriesCheck = entriesData?.filter(e => e.status === 'pending') || [];
      console.log('🎯 === VÉRIFICATION FINALE ===');
      console.log('📊 Entries pending trouvées directement:', pendingEntriesCheck.length);
      console.log('📋 Détail entries pending:', pendingEntriesCheck.map(e => ({
        id: e.id,
        user_id: e.user_id,
        date: e.date,
        status: e.status,
        normal_hours: e.normal_hours,
        overtime_hours: e.overtime_hours
      })));
      
      console.log('📊 Timesheets virtuels avec pending:', assembledTimesheets.filter(ts => 
        ts.entries.some(entry => entry.status === 'pending')
      ).length);
      
    } catch (error) {
      console.error('❌ === EXCEPTION CHARGEMENT ===');
      console.error('❌ Type:', error.constructor.name);
      console.error('❌ Message:', error.message);
      console.error('❌ Stack:', error.stack);
    } finally {
      setLoadingRealData(false);
    }
  };

  // Écouter les mises à jour globales des données
  useEffect(() => {
    // Attendre que les données d'auth soient prêtes
    if (!currentUser || companies.length === 0 || employees.length === 0) {
      console.log('⏳ Attente des données d\'auth...');
      return;
    }
    
    // Charger les vraies données au montage
    loadRealDataFromSupabase();
    
    const handleGlobalUpdate = () => {
      setDataVersion(prev => prev + 1);
      // Recharger les vraies données quand il y a une mise à jour
      loadRealDataFromSupabase();
      console.log('📊 AdminApprovals: Données mises à jour globalement');
    };

    window.addEventListener('globalTimesheetUpdate', handleGlobalUpdate);
    window.addEventListener('timesheetDataUpdated', handleGlobalUpdate);

    return () => {
      window.removeEventListener('globalTimesheetUpdate', handleGlobalUpdate);
      window.removeEventListener('timesheetDataUpdated', handleGlobalUpdate);
    };
  }, [currentUser, companies, employees]);
  
  // Filtrer les feuilles de temps en attente
  const pendingTimesheets = realTimesheets.filter(ts => {
    const hasPending = ts.entries && ts.entries.length > 0 && ts.entries.some(entry => entry.status === 'pending');
    
    if (hasPending) {
      console.log('🎯 Feuille avec pending trouvée:', {
        id: ts.id,
        userName: ts.userName,
        pendingCount: ts.entries.filter(e => e.status === 'pending').length
      });
    }
    
    return hasPending;
  });
  
  // Grouper par salarié avec leurs jours en attente
  const employeesWithPendingWork = useMemo(() => {
    const employeeMap = new Map();
    
    pendingTimesheets.forEach(timesheet => {
      const employee = employees.find(emp => emp.id === timesheet.userId);
      if (!employee) return;
      
      const company = companies.find(c => c.id === employee.companyId);
      
      // Appliquer les filtres intelligents
      // Filtre par entreprise
      if (selectedCompany !== 'all' && employee.companyId !== selectedCompany) {
        return;
      }
      
      // Filtre par nom/prénom
      if (searchTerm.trim() && !employee.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return;
      }
      
      if (!employeeMap.has(employee.id)) {
        employeeMap.set(employee.id, {
          employee,
          company,
          pendingDays: []
        });
      }
      
      // Ajouter les jours en attente
      timesheet.entries.forEach(entry => {
        if (entry.status === 'pending') {
          // Filtre par mois
          if (selectedMonth !== 'all') {
            const entryDate = new Date(entry.date);
            const entryMonth = entryDate.getMonth() + 1;
            if (entryMonth.toString() !== selectedMonth) {
              return;
            }
          }
          
          employeeMap.get(employee.id).pendingDays.push({
            date: entry.date,
            timesheetId: timesheet.id,
            entry,
            entryId: entry.id, // AJOUTER L'ID D'ENTRÉE
            timesheet
          });
        }
      });
    });
    
    // Calculer le nombre de jours uniques pour chaque employé
    return Array.from(employeeMap.values())
      .map(emp => ({
        ...emp,
        uniqueDaysCount: new Set(emp.pendingDays.map(day => day.date)).size
      }))
      .filter(emp => emp.pendingDays.length > 0);
  }, [pendingTimesheets, employees, companies, dataVersion, selectedCompany, searchTerm, selectedMonth, selectedYear]);

  // Statistiques
  const stats = {
    totalEmployees: employeesWithPendingWork.length,
    totalDays: employeesWithPendingWork.reduce((sum, emp) => sum + emp.pendingDays.length, 0),
    totalHours: pendingTimesheets.reduce((sum, ts) => 
      sum + ts.entries.filter(e => e.status === 'pending').reduce((entrySum, entry) => 
        entrySum + (entry.normalHours || 0) + (entry.overtimeHours || 0), 0
      ), 0
    )
  };

  // Obtenir les jours en attente pour le salarié sélectionné
  const selectedEmployeeData = employeesWithPendingWork.find(emp => emp.employee.id === selectedEmployeeId);

  // Obtenir les détails du jour sélectionné
  const selectedDayData = useMemo(() => {
    if (!selectedEmployeeData || !selectedDate) return null;

    const dayEntries = selectedEmployeeData.pendingDays.filter(day => day.date === selectedDate);
    if (dayEntries.length === 0) return null;

    return {
      date: selectedDate,
      entries: dayEntries.map(day => ({ entry: day.entry, timesheet: day.timesheet })),
      totalHours: dayEntries.reduce((sum, day) => sum + (day.entry.normalHours || 0) + (day.entry.overtimeHours || 0), 0)
    };
  }, [selectedEmployeeData, selectedDate]);

  const handleEntryAction = (entry: any, timesheet: any, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      // Approbation directe sans modal
      handleDirectEntryApproval(entry);
    } else {
      // Refus avec modal et raison obligatoire
      const entryTotalHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
      
      console.log('🎯 === DÉBUT REFUS ENTRÉE ===');
      console.log('🆔 Entry ID reçu:', entry.id);
      
      setCommentData({ 
        timesheetId: timesheet.id, 
        date: entry.date, 
        action,
        entryDetails: {
          entryId: entry.id || entry.entryId,
          date: entry.date,
          project: getEntryDisplayName(entry),
          hours: entryTotalHours
        }
      });
      
      setComment('');
      setCommentError('');
      setShowCommentModal(true);
    }
  };

  const handleDirectEntryApproval = async (entry: any) => {
    try {
      console.log('✅ === APPROBATION DIRECTE ENTRÉE ===');
      console.log('🆔 Entry ID:', entry.id);
      
      const entryId = entry.id || entry.entryId;
      if (!entryId) {
        throw new Error('ID d\'entrée manquant');
      }
      
      await approveEntryById(entryId); // Pas de commentaire pour l'approbation
      await loadRealDataFromSupabase(); // Recharger les données
      
      console.log('✅ Approbation directe réussie');
    } catch (error) {
      console.error('❌ Erreur approbation directe:', error);
      alert(`❌ Erreur lors de l'approbation: ${error.message}`);
    }
  };

  const handleDayAction = (timesheetId: string, date: string, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      // Pour les refus : ouvrir le modal avec commentaire obligatoire
      setCommentData({ timesheetId, date, action });
      setComment('');
      setCommentError('');
      setShowCommentModal(true);
    } else {
      // Pour les approbations : action directe sans modal
      handleDirectApproval(timesheetId, date);
    }
  };

  const handleDirectApproval = async (timesheetId: string, date: string) => {
    try {
      await approveDayByDate(timesheetId, date, null); // Approbation directe sans commentaire
      await loadRealDataFromSupabase(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      alert(`❌ Erreur lors de l'approbation: ${error.message}`);
    }
  };

  const handleConfirmDayAction = async () => {
    if (!commentData) return;
    
    // Vérifier que le commentaire est obligatoire pour les refus (seule action possible dans le modal)
    if (!comment.trim()) {
      setCommentError('La raison du refus est obligatoire');
      return;
    }
    
    const { entryDetails } = commentData;
    
    console.log('🎯 === CONFIRMATION REFUS ===');
    console.log('🆔 Entry ID depuis entryDetails:', entryDetails?.entryId);
    console.log('💬 Commentaire:', comment.trim());
    
    try {
      if (!entryDetails?.entryId) {
        throw new Error('ID d\'entrée manquant pour le refus');
      }
      
      // Seulement refus possible dans le modal
      console.log('🎯 === UTILISATION LOGIQUE PAR ENTRÉE ===');
      await rejectEntryById(entryDetails.entryId, comment.trim());
      
      setShowCommentModal(false);
      setCommentData(null);
      setComment('');
      setCommentError('');
      
      // Recharger les vraies données après action
      await loadRealDataFromSupabase();
    } catch (error) {
      console.error('❌ Erreur lors du refus de l\'entrée:', error);
      alert(`❌ Erreur: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête moderne */}
      <div className="bg-white shadow-sm border-b border-gray-100 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Approbations en attente</h1>
                <p className="text-gray-600">
                  Examiner et approuver les feuilles de temps des salariés
                </p>
              </div>
            </div>
            
            {/* Icône d'alerte avec badge */}
            <div className="relative">
              <div className="bg-yellow-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
              {stats.totalDays > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {stats.totalDays}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filtres intelligents */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Filtres de recherche</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtre par entreprise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entreprise
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les entreprises</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Recherche nom/prénom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom/Prénom
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un salarié..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filtre par mois */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mois
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les mois</option>
                <option value="1">Janvier</option>
                <option value="2">Février</option>
                <option value="3">Mars</option>
                <option value="4">Avril</option>
                <option value="5">Mai</option>
                <option value="6">Juin</option>
                <option value="7">Juillet</option>
                <option value="8">Août</option>
                <option value="9">Septembre</option>
                <option value="10">Octobre</option>
                <option value="11">Novembre</option>
                <option value="12">Décembre</option>
              </select>
            </div>
            
            {/* Filtre par année */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Année
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les années</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>
          
          {/* Indicateur de filtrage actif */}
          {(selectedCompany !== 'all' || searchTerm.trim() || selectedMonth !== 'all' || selectedYear !== 'all') && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-blue-600">
                Filtres actifs : 
                {selectedCompany !== 'all' && ` ${companies.find(c => c.id === selectedCompany)?.name}`}
                {searchTerm.trim() && ` • "${searchTerm}"`}
                {selectedMonth !== 'all' && ` • ${['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][parseInt(selectedMonth)]}`}
                {selectedYear !== 'all' && ` • ${selectedYear}`}
              </div>
              <button
                onClick={() => {
                  setSelectedCompany('all');
                  setSearchTerm('');
                  setSelectedMonth('all');
                  setSelectedYear('all');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
          
          {/* Résultats du filtrage */}
          <div className="mt-4 text-sm text-gray-600">
            {employeesWithPendingWork.length} salarié{employeesWithPendingWork.length > 1 ? 's' : ''} avec jours en attente
          </div>
        </div>

        {/* Indicateur de chargement des vraies données */}
        {loadingRealData && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-sm text-blue-700">Chargement des données en temps réel depuis Supabase...</span>
            </div>
          </div>
        )}

        {/* Statistiques globales */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Salariés concernés</p>
                <p className="text-lg font-semibold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-2 rounded-full">
                <Calendar className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Jours en attente</p>
                <p className="text-lg font-semibold text-gray-900">{stats.totalDays}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-full">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Heures à approuver</p>
                <p className="text-lg font-semibold text-gray-900">{stats.totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interface principale */}
        {employeesWithPendingWork.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Colonne 1 : Liste des salariés */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 lg:col-span-1">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  Salariés avec jours en attente
                </h2>
              </div>
              
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {employeesWithPendingWork.map((empData) => (
                  <div 
                    key={empData.employee.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedEmployeeId === empData.employee.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedEmployeeId(empData.employee.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Drapeau d'alerte */}
                        <div className="flex-shrink-0">
                          <Flag className="h-5 w-5 text-red-500" />
                        </div>

                        {/* Avatar */}
                        <div className="bg-blue-100 p-2 rounded-full">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>

                        {/* Informations du salarié */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {empData.employee.name}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600">{empData.employee.department}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-sm text-gray-500">{empData.company?.name}</span>
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {empData.uniqueDaysCount} jour{empData.uniqueDaysCount > 1 ? 's' : ''} en attente
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Flèche pour indiquer la sélection */}
                      <ChevronRight className={`h-5 w-5 transition-colors ${
                        selectedEmployeeId === empData.employee.id ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Colonne 2 : Jours en attente du salarié sélectionné */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 lg:col-span-1">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  {selectedEmployeeData ?
                    `Jours en attente - ${selectedEmployeeData.employee.name}` :
                    'Sélectionnez un salarié'
                  }
                </h2>
              </div>

              {selectedEmployeeData ? (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {/* Grouper les entrées par date pour un affichage simplifié */}
                  {(() => {
                    // Grouper toutes les entrées pending par date
                    const entriesByDate: Record<string, any[]> = {};

                    selectedEmployeeData.pendingDays.forEach(dayData => {
                      const { date, entry, timesheet } = dayData;
                      if (!entriesByDate[date]) {
                        entriesByDate[date] = [];
                      }
                      entriesByDate[date].push({ entry, timesheet });
                    });

                    return Object.entries(entriesByDate)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, dayEntries]) => {
                        const totalHours = dayEntries.reduce((sum, {entry}) =>
                          sum + (entry.normalHours || 0) + (entry.overtimeHours || 0), 0
                        );

                        return (
                          <div
                            key={date}
                            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedDate === date ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                            }`}
                            onClick={() => setSelectedDate(date)}
                          >
                            {/* En-tête de la date */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="bg-blue-100 p-2 rounded-full">
                                  <Calendar className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {formatDate(date)}
                                  </h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-600">
                                      {dayEntries.length} entrée{dayEntries.length > 1 ? 's' : ''}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-600">
                                      {totalHours.toFixed(1)}h
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className={`h-5 w-5 transition-colors ${
                                selectedDate === date ? 'text-blue-500' : 'text-gray-400'
                              }`} />
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sélectionnez un salarié
                  </h3>
                  <p className="text-gray-500">
                    Cliquez sur un salarié dans la liste de gauche pour voir ses jours en attente
                  </p>
                </div>
              )}
            </div>

            {/* Colonne 3 : Détail du jour sélectionné */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 lg:col-span-2">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  {selectedDayData ?
                    `Détail du ${formatDate(selectedDayData.date)}` :
                    'Sélectionnez un jour'
                  }
                </h2>
              </div>

              {selectedDayData ? (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {/* Résumé de la journée */}
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-1.5 rounded-full">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">
                            {formatDate(selectedDayData.date)}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {selectedDayData.entries.length} entrée{selectedDayData.entries.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Total</p>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedDayData.totalHours.toFixed(1)}h
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Liste détaillée des entrées */}
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Détail des entrées</h4>
                    <div className="space-y-3">
                      {selectedDayData.entries.map(({ entry, timesheet }) => {
                        const entryTotalHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);

                        return (
                          <div key={entry.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <div className="bg-green-100 p-2 rounded-full">
                                  <Briefcase className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900 text-base">
                                    {getEntryDisplayName(entry)}
                                  </h5>
                                  <div className="mt-2 space-y-1">
                                    {(entry.normalHours || 0) > 0 && (
                                      <div className="flex items-center text-sm">
                                        <Clock className="h-4 w-4 text-green-600 mr-2" />
                                        <span className="text-gray-600">Heures normales:</span>
                                        <span className="ml-2 font-medium text-green-600">{entry.normalHours}h</span>
                                      </div>
                                    )}
                                    {(entry.overtimeHours || 0) > 0 && (
                                      <div className="flex items-center text-sm">
                                        <Clock className="h-4 w-4 text-purple-600 mr-2" />
                                        <span className="text-gray-600">Heures supplémentaires:</span>
                                        <span className="ml-2 font-medium text-purple-600">{entry.overtimeHours}h</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions pour cette entrée - à droite du chantier */}
                              <div className="flex items-center space-x-1 ml-4">
                                <button
                                  onClick={() => handleEntryAction({...entry, entryId: entry.id}, timesheet, 'reject')}
                                  className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                                >
                                  <XCircle size={12} className="mr-1" />
                                  Refuser
                                </button>
                                <button
                                  onClick={() => handleEntryAction({...entry, entryId: entry.id}, timesheet, 'approve')}
                                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle size={12} className="mr-1" />
                                  Approuver
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sélectionnez un jour
                  </h3>
                  <p className="text-gray-500">
                    Cliquez sur un jour dans la colonne du milieu pour voir son détail
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-100">
            <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune entrée en attente
            </h3>
            <p className="text-gray-600 mb-6">
              Toutes les entrées ont été traitées ou aucune entrée n'a été soumise.
            </p>
          </div>
        )}

      </div>

      {/* Modal pour commentaire */}
      {showCommentModal && commentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Refuser l'entrée - Raison obligatoire
              </h3>
              
              {/* Détails de l'entrée */}
              {commentData.entryDetails && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      📅 {formatDate(commentData.entryDetails.date)}
                    </div>
                    <div className="text-gray-600 mt-1">
                      🏗️ {commentData.entryDetails.project} - {commentData.entryDetails.hours}h
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison du refus (obligatoire)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    setCommentError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Expliquez pourquoi vous refusez cette entrée..."
                  required
                />
                {commentError && (
                  <p className="mt-1 text-sm text-red-600">{commentError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Le salarié recevra cette raison dans ses messages
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setCommentData(null);
                    setComment('');
                    setCommentError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmDayAction}
                  disabled={!comment.trim()}
                  className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                    !comment.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Refuser cette entrée
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;