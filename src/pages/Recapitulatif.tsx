import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimesheets } from '../context/TimesheetContext';
import { ArrowLeft, Users, Filter, Calendar, Building2, User, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Recapitulatif: React.FC = () => {
  const { companies, employees, isAdmin } = useAuth();
  const { timesheets } = useTimesheets();
  const navigate = useNavigate();
  
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthlyStats, setMonthlyStats] = useState({
    totalHours: 0,
    totalEntries: 0,
    employeesWithData: 0
  });
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Rediriger si pas admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // Générer les options d'années
  const getYearOptions = (): number[] => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years.sort((a, b) => b - a);
  };

  const yearOptions = getYearOptions();

  // Vérifier si le mois sélectionné peut être téléchargé
  const canDownloadSelectedMonth = (): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Mois futur = non téléchargeable
    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
      return false;
    }
    
    // Mois en cours = non téléchargeable (pas terminé)
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      return false;
    }
    
    // Mois passé = téléchargeable
    return true;
  };

  // Fonction pour télécharger les feuilles selon les filtres
  const handleDownloadFiltered = async () => {
    if (!canDownloadSelectedMonth()) {
      alert('❌ Téléchargement impossible\n\nSeuls les mois passés et terminés peuvent être téléchargés.\nLe mois en cours et les mois futurs ne sont pas disponibles.');
      return;
    }

    const filteredData = getFilteredEmployees();
    
    if (filteredData.length === 0) {
      alert('Aucun employé trouvé avec ces filtres');
      return;
    }

    setDownloadLoading(true);

    try {
      console.log('📥 === DÉBUT TÉLÉCHARGEMENT ADMIN ===');
      console.log('📅 Période:', selectedMonth + '/' + selectedYear);
      console.log('👥 Employés filtrés:', filteredData.length);

      const { downloadAdminPDF, generateAdminPDFBlob } = await import('../utils/adminPdfGenerator');
      const { createZipWithPDFs } = await import('../utils/zipGenerator');
      
      const pdfPromises = filteredData.map(async (employee) => {
        console.log('📊 Génération PDF pour:', employee.name);
        
        // Récupérer les statistiques de cet employé
        const stats = await getEmployeeStats(employee.id);
        

        // Récupérer les vraies entrées depuis Supabase
        const { supabase } = await import('../lib/supabase');
        
        const { data: entries, error } = await supabase
          .from('timesheet_entries')
          .select('*')
          .eq('user_id', employee.id)
          .neq('status', 'draft');
        
        if (error || !entries) {
          console.error('❌ Erreur chargement entrées pour:', employee.name);
          return null;
        }

        // Filtrer par mois/année sélectionnés
        const monthEntries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getFullYear() === selectedYear && 
                 (entryDate.getMonth() + 1) === selectedMonth;
        });

        if (monthEntries.length === 0) {
          console.log('⚠️ Pas d\'entrées pour le mois sélectionné:', employee.name);
          return null;
        }

        // Grouper les entrées par date
        const entriesByDate: Record<string, any[]> = {};
        monthEntries.forEach(entry => {
          if (!entriesByDate[entry.date]) {
            entriesByDate[entry.date] = [];
          }
          entriesByDate[entry.date].push(entry);
        });

        // Préparer les données pour le PDF
        const pdfEntries = Object.entries(entriesByDate).map(([date, dayEntries]) => ({
          date,
          projects: dayEntries.map(entry => ({
            name: entry.project_name || 'Projet inconnu',
            normalHours: entry.normal_hours || 0,
            overtimeHours: entry.overtime_hours || 0
          }))
        }));

        // Séparer prénom et nom
        const nameParts = employee.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const company = companies.find(c => c.id === employee.companyId);
        
        const pdfData: AdminPDFData = {
          employeeName: employee.name,
          firstName,
          lastName,
          companyName: company?.name || 'AS INVESTISSEMENT',
          month: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
          year: selectedYear,
          entries: pdfEntries
        };

        const pdfBlob = generateAdminPDFBlob(pdfData);
        const monthName = format(new Date(selectedYear, selectedMonth - 1), 'MMMM-yyyy', { locale: fr });
        const fileName = `feuille-temps-${lastName}-${firstName}-${monthName}.pdf`;
        
        return { name: fileName, blob: pdfBlob };
      });

      const pdfResults = await Promise.all(pdfPromises);
      const validPdfs = pdfResults.filter(pdf => pdf !== null);

      if (validPdfs.length === 0) {
        alert('❌ Aucune donnée trouvée pour la période sélectionnée');
        return;
      }

      if (validPdfs.length === 1) {
        // Un seul PDF - téléchargement direct
        const pdf = validPdfs[0];
        const url = URL.createObjectURL(pdf.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdf.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ PDF téléchargé:', pdf.name);
      } else {
        // Plusieurs PDFs - créer un ZIP (simulation pour l'instant)
        console.log('📦 Création ZIP avec', validPdfs.length, 'PDFs...');
        
        // Pour l'instant, télécharger chaque PDF individuellement
        // En production, vous pourriez utiliser JSZip pour créer un vrai ZIP
        validPdfs.forEach((pdf, index) => {
          setTimeout(() => {
            const url = URL.createObjectURL(pdf.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = pdf.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, index * 500); // Délai entre chaque téléchargement
        });
        
        console.log('✅ Tous les PDFs téléchargés');
      }

      // Message de confirmation
      const monthName = format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: fr });
      alert(`✅ Téléchargement terminé !\n\n📄 ${validPdfs.length} feuille(s) de temps générée(s)\n📅 Période: ${monthName}\n👥 Employé(s): ${validPdfs.map(p => p.name.split('-')[2]).join(', ')}`);

    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      alert('❌ Erreur lors du téléchargement des feuilles de temps');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Obtenir les employés filtrés
  const getFilteredEmployees = () => {
    let filtered = employees.filter(emp => !emp.archived && emp.role !== 'admin');
    
    // Filtre par entreprise
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(emp => emp.companyId === selectedCompany);
    }
    
    // Filtre par recherche nom/prénom
    if (searchTerm.trim()) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Calculer les statistiques d'un employé pour le mois sélectionné
  const getEmployeeStats = (employeeId: string) => {
    return new Promise(async (resolve) => {
      console.log('🔍 === NOUVEAU getEmployeeStats (SUPABASE DIRECT) ===');
      console.log('📋 Employee ID reçu:', employeeId);
      
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) {
        console.log('❌ Employé non trouvé:', employeeId);
        resolve({ totalHours: 0, totalEntries: 0, timesheetsCount: 0 });
        return;
      }
      
      console.log('✅ Employé trouvé:', employee.name, '-', employee.email);
      
      try {
        // 🎯 CHERCHER DIRECTEMENT DANS SUPABASE timesheet_entries
        console.log('🔍 === RECHERCHE DIRECTE SUPABASE ===');
        
        // Trouver l'utilisateur correspondant par email
        const correspondingUser = employees.find(emp => 
          emp.email === employee.email && emp.role !== 'admin'
        );
        
        if (!correspondingUser) {
          console.log('❌ Utilisateur correspondant non trouvé pour:', employee.email);
          resolve({ totalHours: 0, totalEntries: 0, timesheetsCount: 0 });
          return;
        }
        
        console.log('✅ Utilisateur correspondant trouvé:', correspondingUser.id);
        
        // Importer supabase dynamiquement
        const { supabase } = await import('../lib/supabase');
        
        // Chercher directement dans timesheet_entries - EXCLURE LES BROUILLONS POUR L'ADMIN
        const { data: entries, error } = await supabase
          .from('timesheet_entries')
          .select('*')
          .eq('user_id', correspondingUser.id)
          .neq('status', 'draft'); // ← MASQUER LES BROUILLONS POUR L'ADMIN
        
        if (error) {
          console.error('❌ Erreur Supabase:', error);
          resolve({ totalHours: 0, totalEntries: 0, timesheetsCount: 0 });
          return;
        }
        
        console.log('📊 === ENTRÉES TROUVÉES SUPABASE (SANS BROUILLONS) ===');
        console.log('📊 Total entrées utilisateur:', entries?.length || 0);
        console.log('📋 Échantillon entrées:', entries?.slice(0, 3));
        
        if (!entries || entries.length === 0) {
          console.log('❌ Aucune entrée soumise trouvée dans Supabase (brouillons exclus)');
          resolve({ totalHours: 0, totalEntries: 0, timesheetsCount: 0 });
          return;
        }
        
        // Filtrer par mois/année sélectionnés
        const monthEntries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          const matches = entryDate.getFullYear() === selectedYear && 
                         (entryDate.getMonth() + 1) === selectedMonth;
          
          if (matches) {
            console.log('✅ Entrée dans la période:', {
              date: entry.date,
              year: entryDate.getFullYear(),
              month: entryDate.getMonth() + 1,
              normalHours: entry.normal_hours,
              overtimeHours: entry.overtime_hours,
              status: entry.status, // ← Vérifier que c'est bien soumis
              project: entry.project_name
            });
          }
          
          return matches;
        });
        
        console.log('📅 === FILTRAGE PAR PÉRIODE ===');
        console.log('📅 Période sélectionnée:', selectedMonth + '/' + selectedYear);
        console.log('📅 Entrées soumises dans la période:', monthEntries.length);
        
        // Calculer les totaux
        const totalHours = monthEntries.reduce((sum, entry) => 
          sum + (entry.normal_hours || 0) + (entry.overtime_hours || 0), 0
        );
        
        console.log('📊 === RÉSULTAT FINAL (BROUILLONS EXCLUS) ===');
        console.log('📊 Total heures calculées:', totalHours);
        console.log('📊 Total entrées:', monthEntries.length);
        console.log('🔚 === FIN getEmployeeStats (SUPABASE DIRECT) ===\n');
        
        resolve({
          totalHours,
          totalEntries: monthEntries.length,
          timesheetsCount: monthEntries.length > 0 ? 1 : 0
        });
        
      } catch (error) {
        console.error('❌ Exception getEmployeeStats:', error);
        resolve({ totalHours: 0, totalEntries: 0, timesheetsCount: 0 });
      }
    });
  };

  // Ouvrir la feuille d'un employé pour le mois sélectionné
  const openEmployeeTimesheet = (employeeId: string) => {
    // Naviguer vers la nouvelle page dédiée
    navigate(`/employee-timesheet/${employeeId}?month=${selectedMonth}&year=${selectedYear}`);
  };

  const filteredEmployees = getFilteredEmployees();

  // Calculer les statistiques du mois en temps réel
  useEffect(() => {
    const calculateMonthlyStats = async () => {
      console.log('📊 === CALCUL STATISTIQUES MENSUELLES ===');
      console.log('📅 Période:', selectedMonth + '/' + selectedYear);
      console.log('👥 Employés filtrés:', filteredEmployees.length);
      
      let totalHours = 0;
      let totalEntries = 0;
      let employeesWithData = 0;
      
      // Calculer pour chaque employé filtré
      for (const employee of filteredEmployees) {
        const stats = await getEmployeeStats(employee.id);
        
        if (stats.totalHours > 0) {
          totalHours += stats.totalHours;
          totalEntries += stats.totalEntries;
          employeesWithData++;
          
          console.log('📊 Employé avec données:', {
            name: employee.name,
            hours: stats.totalHours,
            entries: stats.totalEntries
          });
        }
      }
      
      console.log('📊 === STATISTIQUES FINALES ===');
      console.log('📊 Total heures:', totalHours);
      console.log('📊 Total entrées:', totalEntries);
      console.log('📊 Employés avec données:', employeesWithData);
      
      setMonthlyStats({
        totalHours,
        totalEntries,
        employeesWithData
      });
    };
    
    if (filteredEmployees.length > 0) {
      calculateMonthlyStats();
    } else {
      setMonthlyStats({ totalHours: 0, totalEntries: 0, employeesWithData: 0 });
    }
  }, [selectedMonth, selectedYear, selectedCompany, searchTerm, filteredEmployees.length]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête */}
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
                <h1 className="text-2xl font-bold text-gray-900">Récapitulatif</h1>
                <p className="text-gray-600">
                  Vue d'ensemble des feuilles de temps par salarié
                </p>
              </div>
            </div>
            
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filtres intelligents */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Filtres de recherche</h3>
          </div>
          
          {/* Tous les filtres sur une seule ligne */}
          <div className="grid grid-cols-6 gap-3">
            {/* Filtre par entreprise */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Entreprise
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setSelectedEmployee('all');
                }}
                className="w-full px-2 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">Toutes</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Recherche nom/prénom */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nom/Prénom
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            {/* Filtre par année */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Année
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-2 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mois
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-2 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value={1}>Jan</option>
                <option value={2}>Fév</option>
                <option value={3}>Mar</option>
                <option value={4}>Avr</option>
                <option value={5}>Mai</option>
                <option value={6}>Juin</option>
                <option value={7}>Juil</option>
                <option value={8}>Août</option>
                <option value={9}>Sep</option>
                <option value={10}>Oct</option>
                <option value={11}>Nov</option>
                <option value={12}>Déc</option>
              </select>
            </div>
            
            {/* Période sélectionnée */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Période sélectionnée
              </label>
              <div className="px-2 py-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 font-medium">
                {format(new Date(selectedYear, selectedMonth - 1), 'MMM yyyy', { locale: fr })}
              </div>
            </div>
            
            {/* Bouton Télécharger */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Export
              </label>
              <button
                onClick={handleDownloadFiltered}
                disabled={downloadLoading || !canDownloadSelectedMonth()}
                className={`w-full px-2 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs font-medium ${
                  canDownloadSelectedMonth() && !downloadLoading
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
                title={!canDownloadSelectedMonth() ? 'Seuls les mois passés peuvent être téléchargés' : 'Télécharger les feuilles de temps'}
              >
                {downloadLoading ? '⏳ Génération...' : '📥 Télécharger'}
              </button>
              {!canDownloadSelectedMonth() && (
                <p className="text-xs text-red-600 mt-1">
                  Mois en cours/futur non téléchargeable
                </p>
              )}
            </div>
          </div>
          
          {/* Indicateur de filtrage actif */}
          {(selectedCompany !== 'all' || searchTerm.trim() !== '') && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-blue-600">
                Filtres actifs : 
                {selectedCompany !== 'all' && ` ${companies.find(c => c.id === selectedCompany)?.name}`}
                {searchTerm.trim() && ` • Recherche: "${searchTerm}"`}
              </div>
              <button
                onClick={() => {
                  setSelectedCompany('all');
                  setSelectedEmployee('all');
                  setSearchTerm('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Liste des salariés */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900">
              Salariés - {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: fr })}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {filteredEmployees.length} salarié{filteredEmployees.length > 1 ? 's' : ''} trouvé{filteredEmployees.length > 1 ? 's' : ''}
            </p>
          </div>

          {filteredEmployees.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredEmployees.map((employee) => {
                const stats = getEmployeeStats(employee.id);
                
                // Attendre le résultat de la Promise
                const [resolvedStats, setResolvedStats] = React.useState({ totalHours: 0, totalEntries: 0, timesheetsCount: 0 });
                
                React.useEffect(() => {
                  getEmployeeStats(employee.id).then(setResolvedStats);
                }, [employee.id, selectedMonth, selectedYear]);
                
                const company = companies.find(c => c.id === employee.companyId);
                
                return (
                  <div 
                    key={employee.id}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openEmployeeTimesheet(employee.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {employee.name}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-600">{employee.department}</span>
                            <div className="flex items-center text-sm text-gray-500">
                              <Building2 className="h-4 w-4 mr-1" />
                              {company?.name || 'Entreprise inconnue'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* Statistiques du mois */}
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {Math.floor(resolvedStats.totalHours)}h
                          </div>
                          <div className="text-sm text-gray-500">
                            {resolvedStats.totalEntries} entrée{resolvedStats.totalEntries > 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        {/* Bouton voir */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmployeeTimesheet(employee.id);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                          <Eye size={12} className="mr-1" />
                          Voir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun salarié trouvé</h3>
              <p className="text-gray-500">
                Aucun salarié ne correspond aux critères de recherche sélectionnés
              </p>
            </div>
          )}
        </div>

        {/* Message d'information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Statistiques du mois : 
                <span className="text-xl font-bold text-blue-700">{Math.floor(monthlyStats.totalHours)}h</span>
                {' '}pour{' '}
                <span className="text-xl font-bold text-gray-700">{monthlyStats.employeesWithData}</span>
                {' '}salarié{monthlyStats.employeesWithData > 1 ? 's' : ''}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Cliquez sur un salarié pour ouvrir sa feuille de temps du mois sélectionné. 
                  Utilisez les filtres pour affiner votre recherche par entreprise, nom ou période.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recapitulatif;