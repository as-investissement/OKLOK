import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, Building2, Calendar, Clock, CheckCircle, XCircle, Send, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getWeekRange, getEntryDisplayName } from '../utils/helpers';
import { supabase } from '../lib/supabase';

const EmployeeTimesheetView: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { employees, companies, isAdmin, projects } = useAuth();
  const [timesheetEntries, setTimesheetEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const month = searchParams.get('month');
  const year = searchParams.get('year');

  // Fonction pour trouver un projet par son ID (gère les projets secondaires)
  const findProjectById = (projectId: string | null) => {
    if (!projectId) return undefined;

    // Chercher d'abord normalement
    let project = projects.find(p => p.id === projectId);

    // Si pas trouvé et que c'est un ID de projet secondaire, extraire l'ID original
    if (!project && projectId.includes('-secondary-')) {
      const originalId = projectId.split('-secondary-')[0];
      project = projects.find(p => p.id === originalId);
    }

    return project;
  };
  
  // Rediriger si pas admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // Charger les entrées directement depuis Supabase
  useEffect(() => {
    const loadEmployeeEntries = async () => {
      if (!employeeId) return;
      
      try {
        setLoading(true);
        console.log('📊 === CHARGEMENT ENTRÉES EMPLOYÉ (DIRECT SUPABASE) ===');
        console.log('👤 Employee ID:', employeeId);
        
        // Trouver l'utilisateur correspondant
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) {
          console.log('❌ Employé non trouvé:', employeeId);
          setTimesheetEntries([]);
          return;
        }
        
        console.log('✅ Employé trouvé:', employee.name, '-', employee.email);
        
        // Chercher directement dans timesheet_entries
        const { data: entries, error } = await supabase
          .from('timesheet_entries')
          .select('*')
          .eq('user_id', employeeId)
          .neq('status', 'draft'); // ← MASQUER LES BROUILLONS POUR L'ADMIN
        
        if (error) {
          console.error('❌ Erreur Supabase:', error);
          setTimesheetEntries([]);
          return;
        }
        
        console.log('📊 === ENTRÉES TROUVÉES SUPABASE ===');
        console.log('📊 Total entrées:', entries?.length || 0);
        console.log('📋 Échantillon entrées:', entries?.slice(0, 3));
        
        setTimesheetEntries(entries || []);
        
      } catch (error) {
        console.error('❌ Exception chargement entrées:', error);
        setTimesheetEntries([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (employees.length > 0) {
      loadEmployeeEntries();
    }
  }, [employeeId, employees]);
  if (!isAdmin) {
    return null;
  }

  // Trouver l'employé
  const employee = employees.find(emp => emp.id === employeeId);
  if (!employee) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Employé non trouvé</h1>
          <button
            onClick={() => navigate('/recapitulatif')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Retour au récapitulatif
          </button>
        </div>
      </div>
    );
  }

  const company = companies.find(c => c.id === employee.companyId);
  const selectedMonth = month && year ? new Date(parseInt(year), parseInt(month) - 1) : new Date();

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
      
      // Trouver toutes les entrées pour ce jour directement depuis Supabase
      const dayEntries = timesheetEntries.filter(entry => entry.date === dayStr);

      // Calculer les heures totales pour ce jour
      const totalHours = dayEntries.reduce((sum, e) => sum + (e.normal_hours || 0) + (e.overtime_hours || 0), 0);
      const normalHours = dayEntries.reduce((sum, e) => sum + (e.normal_hours || 0), 0);
      const overtimeHours = dayEntries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0);
      
      // Déterminer le statut du jour
      let status = 'upcoming';
      
      const isFuture = dayDate > today;
      const dayOfWeek = day.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Vérifier si la semaine est auto-soumise
      const dayWeekRange = getWeekRange(format(day, 'yyyy-MM-dd'));
      const weekEndDate = new Date(dayWeekRange.end + 'T23:59:59');
      const isWeekAutoSubmitted = now > weekEndDate;
      
      if (isFuture) {
        status = 'upcoming';
      } else if (dayEntries.length > 0) {
        if (dayEntries.every(e => e.status === 'approved')) {
          status = 'approved';
        } else if (dayEntries.some(e => e.status === 'rejected')) {
          status = 'rejected';
        } else if (dayEntries.some(e => e.status === 'pending' || e.status === 'submitted')) {
          status = 'submitted';
        } else {
          status = 'draft';
        }
      } else {
        if (isWeekend) {
          status = 'non-travaille';
        } else if (isWeekAutoSubmitted) {
          status = 'submitted';
        } else {
          status = 'not_registered';
        }
      }

      // Enrichir les entrées avec les noms de projets
      const enrichedEntries = dayEntries.map(entry => ({
        ...entry,
        project: entry.project_name || findProjectById(entry.project_id)?.name || 'Projet inconnu',
        normalHours: entry.normal_hours || 0,
        overtimeHours: entry.overtime_hours || 0,
        absenceHours: entry.absence_hours || 0
      }));
      return {
        date: dayStr,
        dayName: format(day, 'EEEE d MMMM', { locale: fr }),
        totalHours,
        normalHours,
        overtimeHours,
        status,
        entries: enrichedEntries
      };
    });
  };

  const monthDays = generateMonthDays();

  // Calculer les statistiques du mois
  const monthStats = {
    totalHours: monthDays.reduce((sum, day) => sum + day.totalHours, 0),
    normalHours: monthDays.reduce((sum, day) => sum + day.normalHours, 0),
    overtimeHours: monthDays.reduce((sum, day) => sum + day.overtimeHours, 0),
    workingDays: monthDays.filter(day => day.totalHours > 0).length,
    draftDays: monthDays.filter(day => day.status === 'draft').length,
    submittedDays: monthDays.filter(day => day.status === 'submitted').length,
    approvedDays: monthDays.filter(day => day.status === 'approved').length,
    rejectedDays: monthDays.filter(day => day.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_registered':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Clock size={12} className="mr-1" />
            Non enregistré
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            Brouillon
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Send size={12} className="mr-1" />
            Soumis
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            Approuvé
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} className="mr-1" />
            Refusé
          </span>
        );
      case 'non-travaille':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            <Clock size={12} className="mr-1" />
            Non travaillé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Clock size={12} className="mr-1" />
            À venir
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête */}
      <div className="bg-white shadow-sm border-b border-gray-100 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/recapitulatif')}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Feuille de temps - {employee.name}
                  </h1>
                  <p className="text-gray-600">
                    {format(selectedMonth, 'MMMM yyyy', { locale: fr })} • {company?.name || 'Entreprise inconnue'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Statistiques du mois */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Brouillons</p>
                <p className="text-xl font-semibold text-gray-900">{monthStats.draftDays}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-full">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Soumis</p>
                <p className="text-xl font-semibold text-gray-900">{monthStats.submittedDays}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Approuvés</p>
                <p className="text-xl font-semibold text-gray-900">{monthStats.approvedDays}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-red-100 p-2 rounded-full">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Refusés</p>
                <p className="text-xl font-semibold text-gray-900">{monthStats.rejectedDays}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Récapitulatif des heures */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Récapitulatif du mois
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700">Heures normales</span>
                <span className="text-xl font-bold text-blue-700">{Math.floor(monthStats.normalHours)}h</span>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-700">Heures supplémentaires</span>
                <span className="text-xl font-bold text-purple-700">{Math.floor(monthStats.overtimeHours)}h</span>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Total du mois</span>
                <span className="text-xl font-bold text-green-700">{Math.floor(monthStats.totalHours)}h</span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Jours travaillés</span>
                <span className="text-xl font-bold text-gray-700">{monthStats.workingDays}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des jours */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900">
              Détail par jour - {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {monthDays.map((day) => (
              <div key={day.date} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 capitalize">
                        {day.dayName}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {day.totalHours.toFixed(1)} heures
                          {day.normalHours > 0 && day.overtimeHours > 0 && (
                            <span className="ml-1 text-xs">
                              ({day.normalHours}h + {day.overtimeHours}h sup.)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Afficher les projets si il y en a */}
                      {day.entries.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {day.entries.map((entry, index) => (
                              <span key={index} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                {entry.project_id === 'non-enregistre' ? 'Non enregistré' : getEntryDisplayName(entry)}
                                {entry.normalHours > 0 && ` (${entry.normalHours}h)`}
                                {entry.overtimeHours > 0 && ` (+${entry.overtimeHours}h sup)`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(day.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Debug info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Debug - Données chargées directement depuis timesheet_entries
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Total entrées trouvées : {timesheetEntries.length}<br/>
                  Période sélectionnée : {format(selectedMonth, 'MMMM yyyy', { locale: fr })}<br/>
                  Employé : {employee.name} (ID: {employee.id})
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Message d'information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Vue administrateur - Feuille de temps de {employee.name}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Cette vue vous permet de consulter en détail les heures enregistrées par ce salarié 
                  pour le mois sélectionné. Vous pouvez voir les statuts de chaque jour et les projets travaillés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTimesheetView;