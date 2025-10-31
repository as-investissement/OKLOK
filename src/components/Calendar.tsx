import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { canRecordHours } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { useTimesheets } from '../context/TimesheetContext';
import { useAuth } from '../context/AuthContext';
import { getCurrentWeekRange, getWeekRange } from '../utils/helpers';
import TimeRestrictionModal from './TimeRestrictionModal';
import PastWeekModal from './PastWeekModal';
import FutureDateModal from './FutureDateModal';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [showTimeRestrictionModal, setShowTimeRestrictionModal] = React.useState(false);
  const [showPastWeekModal, setShowPastWeekModal] = React.useState(false);
  const [showLegend, setShowLegend] = React.useState(false);
  const [showFutureDateModal, setShowFutureDateModal] = React.useState(false);
  const [currentHour, setCurrentHour] = React.useState(0);
  const navigate = useNavigate();
  const { addTimesheet, timesheets, addTimesheetWithCallback } = useTimesheets();
  const { currentUser } = useAuth();

  // Définir les constantes nécessaires
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Calculer les jours du mois
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Ajuster pour que lundi = 0
  const days = Array.from({ length: lastDayOfMonth.getDate() }, (_, i) => i + 1);

  // Fonction pour rendre le titre du mois
  const renderMonthTitle = () => {
    const monthName = months[currentMonth.getMonth()];
    const year = currentMonth.getFullYear();
    return `${monthName} ${year}`;
  };
  

  // Fonction pour calculer la date de Pâques (algorithme de Gauss)
  const calculateEaster = (year: number) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    // Retourner le lundi de Pâques (dimanche de Pâques + 1 jour)
    const easterSunday = new Date(year, month - 1, day);
    const easterMonday = new Date(easterSunday);
    easterMonday.setDate(easterSunday.getDate() + 1);
    
    return easterMonday;
  };

  const isAtMinimumMonth = () => {
    if (!currentUser?.createdAt) return false;
    const accountCreationDate = new Date(currentUser.createdAt);
    const minMonth = new Date(accountCreationDate.getFullYear(), accountCreationDate.getMonth());
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth());
    return currentMonthStart.getTime() === minMonth.getTime();
  };

  const previousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);

    if (currentUser?.createdAt) {
      const accountCreationDate = new Date(currentUser.createdAt);
      const minDate = new Date(accountCreationDate.getFullYear(), accountCreationDate.getMonth(), 1);

      if (newMonth >= minDate) {
        setCurrentMonth(newMonth);
      }
    } else {
      setCurrentMonth(newMonth);
    }
  };

  const nextMonth = () => {
    const today = new Date();
    const currentDay = today.getDate();
    
    // Vérifier si on peut naviguer vers le mois suivant
    const todayMonth = new Date(today.getFullYear(), today.getMonth());
    const currentCalendarMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth());
    const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    
    // Si on est avant le 25 du mois en cours, bloquer complètement
    if (currentDay < 25 && currentCalendarMonth.getTime() === todayMonth.getTime()) {
      console.log('🚫 Navigation bloquée - Attendez le 25 du mois en cours');
      return;
    }
    
    // À partir du 25, autoriser seulement le mois immédiatement suivant
    if (currentDay >= 25) {
      // Si on est sur le mois en cours, on peut aller sur le suivant
      if (currentCalendarMonth.getTime() === todayMonth.getTime()) {
        setCurrentMonth(nextMonthDate);
        return;
      }
      
      // Si on est déjà sur un mois suivant, bloquer la navigation plus loin
      if (currentCalendarMonth > todayMonth) {
        console.log('🚫 Navigation bloquée - Vous ne pouvez aller que sur le mois immédiatement suivant');
        return;
      }
    }
    
    // Pour les autres cas (navigation dans le passé autorisé), permettre
    setCurrentMonth(nextMonthDate);
  };

  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === currentMonth.getMonth() &&
           selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  const isPastWeek = (date: Date) => {
    const currentWeek = getCurrentWeekRange();
    const currentWeekStart = new Date(currentWeek.start);
    const currentWeekEnd = new Date(currentWeek.end);
    return date < currentWeekStart || date > currentWeekEnd;
  };
  // Vérifier si c'est une date future (exclure aujourd'hui)
  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    targetDate.setHours(0, 0, 0, 0);
    const isFuture = targetDate > today;
    console.log('🔮 Vérification date future:', {
      date: date.toISOString().split('T')[0],
      today: today.toISOString().split('T')[0],
      isFuture
    });
    return isFuture;
  };

  // Fonction pour vérifier si c'est une semaine passée (bloquée)
  const isPastWeekBlocked = (date: Date) => {
    const now = new Date();
    
    // Calculer le lundi de cette semaine (système français)
    const dayOfWeek = now.getDay(); // 0=dimanche, 1=lundi, 6=samedi
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si dimanche, c'est 6 jours depuis lundi
    
    const currentWeekMonday = new Date(now);
    currentWeekMonday.setDate(now.getDate() - daysFromMonday);
    currentWeekMonday.setHours(0, 0, 0, 0);
    
    // Calculer le dimanche de la semaine de la date cliquée (système français)
    const clickedDateDayOfWeek = date.getDay();
    const daysToSunday = clickedDateDayOfWeek === 0 ? 0 : 7 - clickedDateDayOfWeek; // 0 si déjà dimanche
    const clickedWeekSunday = new Date(date);
    clickedWeekSunday.setDate(date.getDate() + daysToSunday);
    clickedWeekSunday.setHours(23, 59, 59, 999);
    
    // La semaine est bloquée seulement si son dimanche 23h59 est STRICTEMENT passé
    const isBlocked = clickedWeekSunday < currentWeekMonday;
    
    console.log('🔒 Vérification semaine bloquée:', {
      date: date.toISOString().split('T')[0],
      currentWeekMonday: currentWeekMonday.toISOString().split('T')[0],
      clickedWeekSunday: clickedWeekSunday.toISOString().split('T')[0],
      isBlocked
    });
    
    return isBlocked;
  };

  // Fonction pour vérifier si c'est le jour actuel avant 18h
  const isCurrentDayBeforeRestriction = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Si c'est aujourd'hui et qu'il est avant 17h
    const isRestricted = targetDate.getTime() === today.getTime() && now.getHours() < 17;
    console.log('⏰ Vérification restriction horaire:', {
      date: date.toISOString().split('T')[0],
      isToday: targetDate.getTime() === today.getTime(),
      currentHour: now.getHours(),
      isRestricted
    });
    return isRestricted;
  };

  // Vérifier si c'est le 25 décembre
  const isChristmasDay = (day: number) => {
    return day === 25 && currentMonth.getMonth() === 11; // Décembre = mois 11
  };

  // Vérifier si c'est le 31 octobre (Halloween)
  const isHalloweenDay = (day: number) => {
    return day === 31 && currentMonth.getMonth() === 9; // Octobre = mois 9
  };

  // Vérifier si c'est le lundi de Pâques
  const isEasterMonday = (day: number) => {
    const easterMonday = calculateEaster(currentMonth.getFullYear());
    return day === easterMonday.getDate() && 
           currentMonth.getMonth() === easterMonday.getMonth();
  };

  // Fonction pour formater une date en YYYY-MM-DD sans décalage de fuseau horaire
  const formatDateToString = (year: number, month: number, day: number): string => {
    const monthStr = (month + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };

  const handleDateClick = async (day: number, event: React.MouseEvent) => {
    console.log('🖱️ ===== CLIC CALENDRIER DÉTECTÉ =====', { 
      day, 
      currentMonth: currentMonth.getMonth() + 1,
      currentUser: currentUser?.name,
      timestamp: new Date().toISOString()
    });
    
    // FORCER L'ARRÊT DE LA PROPAGATION
    event.preventDefault();
    event.stopPropagation();
    
    // Créer la date en utilisant le fuseau horaire local pour éviter les décalages
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0);
    console.log('📅 ===== DATE CLIQUÉE CRÉÉE =====', clickedDate.toISOString());
    
    onDateSelect(clickedDate);
    
    if (!currentUser) {
      console.log('❌ ===== PAS D\'UTILISATEUR CONNECTÉ =====');
      alert('Erreur: Utilisateur non connecté');
      return;
    }
    
    console.log('✅ ===== UTILISATEUR CONNECTÉ =====', currentUser.name);
    
    // Vérifier si c'est une semaine passée bloquée
    if (isPastWeekBlocked(clickedDate)) {
      console.log('🚫 ===== SEMAINE PASSÉE BLOQUÉE =====');
      setShowPastWeekModal(true);
      return;
    }

    // Vérifier si c'est le jour actuel avant 18h
    if (isCurrentDayBeforeRestriction(clickedDate)) {
      console.log('⏰ ===== RESTRICTION HORAIRE =====');
      setCurrentHour(new Date().getHours());
      setShowTimeRestrictionModal(true);
      return;
    }

    // Vérifier si c'est une date future (exclure aujourd'hui)
    if (isFutureDate(clickedDate)) {
      console.log('🔮 ===== DATE FUTURE DÉTECTÉE =====');
      setShowFutureDateModal(true);
      return;
    }

    console.log('✅ ===== TOUTES LES VÉRIFICATIONS PASSÉES =====');
    
    // Formater la date en utilisant les méthodes locales pour éviter les décalages UTC
    const year = clickedDate.getFullYear();
    const month = String(clickedDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(clickedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    console.log('📝 ===== DATE FORMATÉE =====', dateString);
    
    const weekRange = getWeekRange(dateString);
    console.log('📊 ===== PLAGE DE SEMAINE =====', weekRange);
    
    // Chercher une feuille de temps existante pour cette semaine
    const existingTimesheet = timesheets.find(ts => 
      ts.weekStarting === weekRange.start && 
      ts.weekEnding === weekRange.end &&
      ts.userId === currentUser.id
    );

    console.log('🔍 ===== RECHERCHE FEUILLE EXISTANTE =====', {
      weekStart: weekRange.start,
      weekEnd: weekRange.end,
      userId: currentUser.id,
      found: !!existingTimesheet,
      existingId: existingTimesheet?.id,
      totalTimesheets: timesheets.length
    });
    
    if (existingTimesheet) {
      // Pour les salariés, naviguer directement avec les bons paramètres
      console.log('➡️ ===== NAVIGATION VERS FEUILLE EXISTANTE =====', existingTimesheet.id);
      navigate(`/timesheets/${existingTimesheet.id}?date=${dateString}&from=calendar&openForm=true`);
      return;
    }
    
    // Créer une nouvelle feuille de temps avec navigation garantie
    const timesheetId = `ts-${Date.now()}-${currentUser.id}`;
    console.log('🆕 ===== CRÉATION NOUVELLE FEUILLE =====', timesheetId);
    
    const newTimesheet = {
      id: timesheetId,
      userId: currentUser.id,
      userName: currentUser.name,
      companyId: currentUser.companyId || '550e8400-e29b-41d4-a716-446655440011',
      weekStarting: weekRange.start,
      weekEnding: weekRange.end,
      totalHours: 0,
      status: 'draft' as const,
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Utiliser la nouvelle fonction avec callback pour garantir la navigation
    addTimesheetWithCallback(newTimesheet, (createdId) => {
      console.log('🎯 ===== NAVIGATION VERS FEUILLE CRÉÉE =====', createdId);
      navigate(`/timesheets/${createdId}?date=${dateString}&from=calendar&openForm=true`);
    });
  };

  const getDayStatusFromTimesheets = (date: Date): 'not_registered' | 'draft' | 'pending' | 'approved' | 'rejected' | 'partially_approved' => {
    if (!currentUser) return 'not_registered';

    // CORRECTION : Vérifier SEULEMENT les entrées du jour dans timesheet_entries
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Chercher DIRECTEMENT dans les entrées de ce jour spécifique
    const userTimesheets = timesheets.filter(ts => ts.userId === currentUser.id);

    for (const timesheet of userTimesheets) {
      const dayEntries = timesheet.entries.filter(entry => entry.date === dateString);

      if (dayEntries.length > 0) {
        // NOUVELLE LOGIQUE : rejected > partially_approved > approved > pending > draft > not_registered
        if (dayEntries.some(entry => entry.status === 'rejected')) {
          // Si il y a du rejeté ET de l'approuvé = partiellement approuvé
          if (dayEntries.some(entry => entry.status === 'approved')) {
            return 'partially_approved';
          }
          return 'rejected';
        }
        if (dayEntries.every(entry => entry.status === 'approved')) return 'approved';
        if (dayEntries.some(entry => entry.status === 'pending')) return 'pending';
        if (dayEntries.some(entry => entry.status === 'draft')) return 'draft';
        return 'not_registered';
      }
    }

    // Aucune entrée pour ce jour = non enregistré
    return 'not_registered';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 sm:p-6 border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-colors duration-200">
      {/* Contenu du calendrier avec z-index plus élevé */}
      <div className="relative" style={{ zIndex: 10 }}>
        {/* En-tête du calendrier - MOBILE RESPONSIVE */}
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <button
            onClick={previousMonth}
            className={`p-1 sm:p-2 rounded-full transition-colors ${
              isAtMinimumMonth()
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'hover:bg-gray-100 dark:hover:bg-blue-900 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            disabled={isAtMinimumMonth()}
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 text-center">
            {renderMonthTitle()}
          </h2>
          <button
            onClick={nextMonth}
            className={`p-1 sm:p-2 rounded-full transition-colors ${
              (() => {
                const today = new Date();
                const currentDay = today.getDate();
                const todayMonth = new Date(today.getFullYear(), today.getMonth());
                const currentCalendarMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth());
                const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
                
                // Logique de blocage corrigée
                let isBlocked = false;
                
                // Si on est avant le 25 du mois en cours, bloquer complètement
                if (currentDay < 25 && currentCalendarMonth.getTime() === todayMonth.getTime()) {
                  isBlocked = true;
                }
                
                // À partir du 25, bloquer si on est déjà sur un mois suivant
                if (currentDay >= 25 && currentCalendarMonth > todayMonth) {
                  isBlocked = true;
                }
                
                return isBlocked
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'hover:bg-gray-100 dark:hover:bg-blue-900 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300';
              })()
            }`}
            disabled={(() => {
              const today = new Date();
              const currentDay = today.getDate();
              const todayMonth = new Date(today.getFullYear(), today.getMonth());
              const currentCalendarMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth());
              
              // Logique de blocage corrigée
              // Si on est avant le 25 du mois en cours, bloquer complètement
              if (currentDay < 25 && currentCalendarMonth.getTime() === todayMonth.getTime()) {
                return true;
              }
              
              // À partir du 25, bloquer si on est déjà sur un mois suivant
              if (currentDay >= 25 && currentCalendarMonth > todayMonth) {
                return true;
              }
              
              return false;
            })()}
            title={(() => {
              const today = new Date();
              const currentDay = today.getDate();
              const todayMonth = new Date(today.getFullYear(), today.getMonth());
              const currentCalendarMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth());
              
              // Messages d'aide selon le contexte
              if (currentDay < 25 && currentCalendarMonth.getTime() === todayMonth.getTime()) {
                return `Navigation disponible à partir du 25 (actuellement ${currentDay})`;
              }
              
              if (currentDay >= 25 && currentCalendarMonth > todayMonth) {
                return 'Vous ne pouvez naviguer que sur le mois immédiatement suivant';
              }
              
              return 'Mois suivant';
            })()}
          >
            <ChevronRight size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Jours de la semaine - MOBILE RESPONSIVE */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 py-1">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        {/* Grille des jours - MOBILE RESPONSIVE */}
        <div className="grid grid-cols-7 gap-1">
          {Array(startingDayOfWeek).fill(null).map((_, index) => (
            <div key={`empty-${index}`} className="h-8 sm:h-10" />
          ))}
          
          {days.map(day => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isPast = isPastWeek(date);
            const isFuture = isFutureDate(date);
            const isClickable = true; // Tous les jours sont cliquables
            const isPastWeekGrayed = isPastWeekBlocked(date);
            const isCurrentWeek = !isPastWeekBlocked(date) && !isFutureDate(date);
            const dayStatus = getDayStatusFromTimesheets(date);

            // Déterminer la couleur selon le statut (uniquement pour la semaine en cours)
            let dayColorClass = '';
            if (isCurrentWeek) {
              switch(dayStatus) {
                case 'draft':
                  dayColorClass = 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-100';
                  break;
                case 'pending':
                  dayColorClass = 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-100';
                  break;
                case 'approved':
                  dayColorClass = 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-100';
                  break;
                case 'rejected':
                  dayColorClass = 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-100';
                  break;
                case 'partially_approved':
                  dayColorClass = 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-100';
                  break;
                case 'not_registered':
                default:
                  dayColorClass = 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-blue-900 hover:text-gray-900 dark:hover:text-white';
                  break;
              }
            }

            return (
              <button
                key={day}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🖱️ CLIC CALENDRIER DÉTECTÉ:', { day, isClickable, isPast, isFuture });
                  handleDateClick(day, e);
                }}
                className={`h-8 sm:h-10 flex items-center justify-center rounded-full text-xs sm:text-sm transition-colors relative cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200
                  ${isSelectedDate(day)
                    ? `border-2 border-blue-800 dark:border-blue-400 ${isPastWeekGrayed ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400' : dayColorClass || 'bg-white dark:bg-gray-800 text-gray-700 dark:text-white'}`
                    : isPastWeekGrayed
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      : dayColorClass
                  }`}
                style={{ zIndex: 20, overflow: 'hidden' }}
              >
                {/* Chiffre du jour - MOBILE RESPONSIVE */}
                <span className={`relative font-medium pointer-events-none ${isPastWeekGrayed ? '' : 'text-gray-700 dark:text-white'}`} style={{ zIndex: 60 }}>
                  {day}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Message d'aide - MOBILE RESPONSIVE */}
        <div className="mt-3 sm:mt-4 text-xs text-gray-500 dark:text-gray-400 text-center px-2">
          <span>
            Cliquez sur un jour pour enregistrer vos heures
          </span>
        </div>

        {/* Bouton Légende */}
        <div className="mt-3 sm:mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="flex items-center justify-center gap-2 w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <span className="font-medium">Légende</span>
            {showLegend ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Légende dépliable */}
          {showLegend && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Jours passés</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Non enregistré</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Brouillon</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Soumis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Approuvé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Refusé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/50 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Partiellement approuvé</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals d'erreur */}
      <TimeRestrictionModal
        isOpen={showTimeRestrictionModal}
        onClose={() => setShowTimeRestrictionModal(false)}
        currentHour={currentHour}
      />

      <PastWeekModal
        isOpen={showPastWeekModal}
        onClose={() => setShowPastWeekModal(false)}
      />

      <FutureDateModal
        isOpen={showFutureDateModal}
        onClose={() => setShowFutureDateModal(false)}
      />
    </div>
  );
};

export default Calendar;