import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimesheets } from '../context/TimesheetContext';
import { ArrowLeft, FileText, Download, Calendar, Clock, Eye, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { downloadPDF, previewPDF, PDFData } from '../utils/pdfGenerator';

interface MonthlyDocument {
  id: string;
  month: string;
  year: number;
  monthName: string;
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  workingDays: number;
  generatedAt: string;
  pdfUrl: string;
  status: 'available' | 'generating';
}

const Documents: React.FC = () => {
  const { currentUser, companies } = useAuth();
  const { userTimesheets } = useTimesheets();
  const [documents, setDocuments] = useState<MonthlyDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Générer les documents pour les mois complets
  const generateDocumentsForCompleteMonths = (): MonthlyDocument[] => {
    const generatedDocs: MonthlyDocument[] = [];
    const currentDate = new Date();

    const userCreatedDate = currentUser?.createdAt ? new Date(currentUser.createdAt) : null;

    // Vérifier les 12 derniers mois
    for (let i = 0; i < 12; i++) {
      const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = checkDate.getFullYear();
      const month = checkDate.getMonth() + 1;

      if (userCreatedDate) {
        const monthStart = new Date(year, month - 1, 1);
        if (monthStart < new Date(userCreatedDate.getFullYear(), userCreatedDate.getMonth(), 1)) {
          continue;
        }
      }

      // Vérifier si le mois est complet (toutes les entrées soumises)
      if (isMonthComplete(year, month)) {
        const stats = getMonthStats(year, month);
        const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: fr });

        generatedDocs.push({
          id: `${year}-${month.toString().padStart(2, '0')}`,
          month: `${year}-${month.toString().padStart(2, '0')}`,
          year: year,
          monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          totalHours: stats.totalHours,
          normalHours: stats.normalHours,
          overtimeHours: stats.overtimeHours,
          workingDays: stats.workingDays,
          generatedAt: new Date().toISOString(),
          pdfUrl: '',
          status: 'available'
        });
      }
    }

    return generatedDocs;
  };

  // Générer les années disponibles (5 dernières années + année actuelle + 2 prochaines)
  const getYearOptions = (): number[] => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years.sort((a, b) => b - a); // Tri décroissant (plus récent en premier)
  };
  
  const navigate = useNavigate();

  // Fonction pour vérifier si tous les jours ouvrés d'un mois sont soumis
  const isMonthComplete = (year: number, month: number): boolean => {
    const now = new Date();
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    // Générer tous les jours ouvrés du mois (Lundi à Vendredi)
    const workingDays: string[] = [];
    const currentDay = new Date(monthStart);

    while (currentDay <= monthEnd) {
      const dayOfWeek = currentDay.getDay(); // 0=dimanche, 1=lundi, 6=samedi
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays.push(currentDay.toISOString().split('T')[0]);
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // Créer un Map des entrées par date
    const entriesByDate = new Map<string, any[]>();
    userTimesheets.forEach(timesheet => {
      timesheet.entries.forEach(entry => {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: monthStart, end: monthEnd })) {
          const dateKey = entry.date;
          if (!entriesByDate.has(dateKey)) {
            entriesByDate.set(dateKey, []);
          }
          entriesByDate.get(dateKey)!.push(entry);
        }
      });
    });

    // Vérifier que chaque jour ouvré est soit soumis, soit sa semaine est passée
    let allWorkingDaysSubmitted = true;
    const missingDays: string[] = [];

    for (const workingDay of workingDays) {
      const dayEntries = entriesByDate.get(workingDay) || [];

      // Calculer le dimanche 23h59 de la semaine de ce jour
      const dayDate = new Date(workingDay + 'T00:00:00');
      const dayOfWeek = dayDate.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const weekEndDate = new Date(dayDate);
      weekEndDate.setDate(dayDate.getDate() + daysUntilSunday);
      weekEndDate.setHours(23, 59, 59, 999);

      // Un jour est considéré soumis si :
      // 1. Il a au moins une entrée soumise/approuvée/refusée (pas draft)
      // 2. OU sa semaine est passée (dimanche 23h59 dépassé)
      const hasSubmittedEntries = dayEntries.some(entry => entry.status !== 'draft');
      const weekHasPassed = now > weekEndDate;

      if (!hasSubmittedEntries && !weekHasPassed) {
        allWorkingDaysSubmitted = false;
        missingDays.push(workingDay);
      }
    }

    console.log(`📅 Vérification mois ${month}/${year}:`, {
      totalWorkingDays: workingDays.length,
      daysWithEntries: entriesByDate.size,
      allWorkingDaysSubmitted,
      missingDays: missingDays.length > 0 ? missingDays : 'Aucun'
    });

    return allWorkingDaysSubmitted && workingDays.length > 0;
  };

  // Fonction pour calculer les statistiques d'un mois
  const getMonthStats = (year: number, month: number) => {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    
    const monthEntries: any[] = [];
    const workingDaysSet = new Set<string>();
    
    userTimesheets.forEach(timesheet => {
      timesheet.entries.forEach(entry => {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: monthStart, end: monthEnd })) {
          monthEntries.push(entry);
          workingDaysSet.add(entry.date);
        }
      });
    });

    const normalHours = monthEntries.reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
    const overtimeHours = monthEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
    const totalHours = normalHours + overtimeHours;
    const workingDays = workingDaysSet.size;

    return { totalHours, normalHours, overtimeHours, workingDays };
  };

  // Fonction pour préparer les données PDF
  const preparePDFData = (document: MonthlyDocument): PDFData => {
    const year = document.year;
    const month = document.month.split('-')[1];
    
    // Calculer les vraies heures du mois à partir des feuilles de temps
    const monthStart = startOfMonth(new Date(year, parseInt(month) - 1));
    const monthEnd = endOfMonth(new Date(year, parseInt(month) - 1));

    let realNormalHours = 0;
    let realOvertimeHours = 0;
    let realAbsenceHours = 0;
    let realWorkingDays = 0;
    let realLeaveDays = 0;
    const workingDaysSet = new Set<string>();
    const leaveDaysSet = new Set<string>();

    // Collecter les entrées du mois
    const monthEntries: any[] = [];
    userTimesheets.forEach(timesheet => {
      timesheet.entries.forEach(entry => {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: monthStart, end: monthEnd })) {
          realNormalHours += entry.normalHours || 0;
          realOvertimeHours += entry.overtimeHours || 0;
          realAbsenceHours += entry.absenceHours || 0;
          workingDaysSet.add(entry.date);

          // Compter les jours de congés
          if (entry.project === 'CONGÉS PAYÉS') {
            leaveDaysSet.add(entry.date);
          }

          monthEntries.push({
            date: entry.date,
            project: entry.project,
            normalHours: entry.normalHours || 0,
            overtimeHours: entry.overtimeHours || 0,
            absenceHours: entry.absenceHours || 0
          });
        }
      });
    });

    realWorkingDays = workingDaysSet.size;
    realLeaveDays = leaveDaysSet.size;
    const realTotalHours = realNormalHours + realOvertimeHours;

    return {
      employeeName: currentUser?.name || 'Employé',
      companyName: companies.find(c => c.id === currentUser?.companyId)?.name || 'AS INVESTISSEMENT',
      month: document.month,
      year: document.year,
      totalHours: realTotalHours,
      normalHours: realNormalHours,
      overtimeHours: realOvertimeHours,
      absenceHours: realAbsenceHours,
      workingDays: realWorkingDays,
      leaveDays: realLeaveDays,
      entries: monthEntries
    };
  };

  // Obtenir les années disponibles à partir des documents
  const getAvailableYears = (): number[] => {
    const years = new Set<number>();
    documents.forEach(doc => years.add(doc.year));
    return Array.from(years).sort((a, b) => b - a); // Tri décroissant
  };

  const yearOptions = getYearOptions();

  // Filtrer les documents selon les critères sélectionnés
  const getFilteredDocuments = (): MonthlyDocument[] => {
    return documents.filter(doc => {
      const yearMatch = selectedYear === 'all' || doc.year.toString() === selectedYear;
      const monthMatch = selectedMonth === 'all' || doc.month.endsWith(`-${selectedMonth.padStart(2, '0')}`);
      return yearMatch && monthMatch;
    });
  };

  const filteredDocuments = getFilteredDocuments();

  // Vérifier et générer les documents manquants
  const checkAndGenerateDocuments = async () => {
    if (!currentUser) return;

    setLoading(true);

    // Générer les documents pour les mois complets
    const generatedDocuments = generateDocumentsForCompleteMonths();
    setDocuments(generatedDocuments);

    console.log('📄 Documents générés:', generatedDocuments.length);
    console.log('📄 Détails des documents:', generatedDocuments);

    setLoading(false);
  };

  // Vérifier au chargement et quand les feuilles de temps changent
  useEffect(() => {
    checkAndGenerateDocuments();
  }, [userTimesheets, currentUser]);

  // Fonction pour télécharger un PDF réel
  const handleDownloadPDF = async (document: MonthlyDocument) => {
    const pdfData = preparePDFData(document);
    await downloadPDF(pdfData);
  };

  // Fonction pour prévisualiser un PDF réel
  const handlePreviewPDF = async (document: MonthlyDocument) => {
    const pdfData = preparePDFData(document);
    await previewPDF(pdfData);
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Mes documents</h1>
            </div>
          </div>
        </div>
        {/* Filtres année et mois */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-2 flex-1">
            <div>
              <label htmlFor="year-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Année
              </label>
              <select
                id="year-filter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="block w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors duration-200 [&>option]:bg-white [&>option]:dark:bg-gray-700 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
              >
                <option value="all">Toutes les années</option>
                {yearOptions.map(year => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="month-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mois
              </label>
              <select
                id="month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors duration-200 [&>option]:bg-white [&>option]:dark:bg-gray-700 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
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
            </div>
            
            {/* Boutons de mode d'affichage */}
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${
                  viewMode === 'list'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-blue-900'
                }`}
                title="Affichage en liste"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-blue-900'
                }`}
                title="Affichage en mosaïque"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 6.707 6.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Indicateur de filtrage actif */}
          {(selectedYear !== 'all' || selectedMonth !== 'all') && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {selectedYear !== 'all' && selectedMonth !== 'all' && (
                  <span>Affichage : {format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy', { locale: fr })}</span>
                )}
                {selectedYear !== 'all' && selectedMonth === 'all' && (
                  <span>Affichage : Toute l'année {selectedYear}</span>
                )}
                {selectedYear === 'all' && selectedMonth !== 'all' && (
                  <span>Affichage : {format(new Date(2024, parseInt(selectedMonth) - 1), 'MMMM', { locale: fr })} de toutes les années</span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedYear('all');
                  setSelectedMonth('all');
                }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Indicateur de chargement */}
        {loading && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 transition-colors duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Vérification en cours...
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>Vérification des mois complets et génération des documents manquants.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 min-h-[200px] transition-colors duration-200">
          {filteredDocuments.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 p-2 sm:p-4' : 'divide-y divide-gray-100'}>
              {filteredDocuments
                .sort((a, b) => {
                  // Tri par ordre croissant (plus ancien en premier)
                  const yearDiff = a.year - b.year;
                  if (yearDiff !== 0) return yearDiff;
                  return parseInt(a.month.split('-')[1]) - parseInt(b.month.split('-')[1]);
                })
                .map((document) => (
                <div key={document.id} className={viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden cursor-pointer group hover:bg-gray-50 dark:hover:bg-blue-900 transition-colors duration-200'
                  : 'px-6 py-4 hover:bg-gray-50 dark:hover:bg-blue-900 transition-colors duration-200'
                }>
                {viewMode === 'grid' ? (
                  // Affichage mosaïque - Style PDF avec aperçu
                  <div className="text-center p-2" onClick={() => handlePreviewPDF(document)}>
                    {/* Aperçu PDF simulé */}
                    <div className="relative mb-2 mx-auto w-16 h-20 sm:w-32 sm:h-40 bg-white border-2 border-gray-300 rounded-lg shadow-sm overflow-hidden">
                      {/* Simulation d'un PDF avec contenu */}
                      <div className="h-full bg-gradient-to-b from-white dark:from-gray-800 via-gray-50 dark:via-gray-700 to-gray-100 dark:to-gray-600 p-1 sm:p-2">
                        {/* En-tête FEUILLE D'HEURES */}
                        <div className="text-center mb-2">
                          <div className="text-[4px] sm:text-[6px] font-bold text-gray-800 dark:text-gray-200 mb-0.5">FEUILLE D'HEURES</div>
                          <div className="text-[3px] sm:text-[4px] text-gray-600 dark:text-gray-400">AS INVESTISSEMENT</div>
                          <div className="text-[3px] sm:text-[4px] text-gray-600 dark:text-gray-400">Période: Août 2025</div>
                          <div className="w-full h-[1px] bg-gray-400 dark:bg-gray-500 my-0.5"></div>
                        </div>
                        
                        {/* Informations du salarié */}
                        <div className="mb-1 sm:mb-2">
                          <div className="text-[3px] sm:text-[4px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">Informations du salarié</div>
                          <div className="grid grid-cols-2 gap-0.5 text-[2px] sm:text-[3px] text-gray-600 dark:text-gray-400">
                            <div>Nom: MARTIN</div>
                            <div>Prénom: Jean</div>
                          </div>
                        </div>
                          
                        {/* Récapitulatif */}
                        <div className="mb-1 sm:mb-2">
                          <div className="text-[2px] sm:text-[3px] text-center text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 py-0.5">
                            Récapitulatif: 12h normales | 8h sup | Total: 12h
                          </div>
                        </div>
                          
                        {/* Tableau des heures */}
                        <div className="space-y-[1px]">
                          {/* En-tête du tableau */}
                          <div className="grid grid-cols-4 gap-[1px] text-[2px] sm:text-[3px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-300 dark:bg-gray-600 py-0.5">
                            <div className="text-center">Date</div>
                            <div className="text-center">Chantier</div>
                            <div className="text-center">H. Norm.</div>
                            <div className="text-center">H. Supp.</div>
                          </div>
                          
                          {/* Lignes du tableau */}
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`grid grid-cols-4 gap-[1px] text-[2px] sm:text-[3px] text-gray-600 py-0.5 ${
                              i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
                            }`}>
                              <div className="text-center">{i} août 2025</div>
                              <div className="text-center truncate">RÉNOVATION ÉLECTRIQUE</div>
                              <div className="text-center">8h</div>
                              <div className="text-center">-</div>
                            </div>
                          ))}
                        </div>
                          
                        {/* Pied de page avec date de génération */}
                        <div className="mt-1 sm:mt-2 text-center">
                          <div className="text-[2px] sm:text-[3px] text-gray-500 dark:text-gray-400">
                            Document généré le 18/08/2025 à 15:34:38
                          </div>
                        </div>
                      </div>
                      
                      {/* Overlay avec actions au survol */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(document);
                            }}
                            className="p-0.5 sm:p-2 bg-white dark:bg-blue-800 rounded-full shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 hover:scale-110 transition-all duration-200 group/btn"
                            title="Télécharger"
                          >
                            <Download size={10} className="sm:w-4 sm:h-4 text-blue-600 dark:text-white group-hover/btn:text-white transition-colors duration-200" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Date en dessous */}
                    <div className="text-center">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {document.monthName}
                      </h3>
                    </div>
                  </div>
                ) : (
                  // Affichage liste simplifié - SEULEMENT mois, année, télécharger et aperçu
                  <div className="flex items-center justify-between w-full cursor-pointer" onClick={() => handlePreviewPDF(document)}>
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full transition-colors duration-200">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {document.monthName}
                        </h3>
                      </div>
                    </div>

                    {/* Actions simplifiées - tout à droite de l'encadrement */}
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(document);
                        }}
                        className="inline-flex items-center px-2 py-2 sm:px-3 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors duration-200"
                        title="Télécharger"
                      >
                        <Download size={14} className="sm:mr-1" />
                        <span className="hidden sm:inline">Télécharger</span>
                      </button>
                    </div>
                  </div>
                )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Aucun document disponible pour cette période.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Documents;