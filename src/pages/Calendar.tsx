import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Calendar from '../components/Calendar';
import AddPeriodModal from '../components/AddPeriodModal';
import { generateSnowflakes as generateSnowflakeElements, generateCalendarSnowfallAnimations as generateSnowfallCSS } from '../utils/snowflakes';

const CalendarPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();

  // Ajouter un état pour suivre si une navigation est en cours
  const [isNavigating, setIsNavigating] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  // Vérifier si on est en décembre pour les flocons de neige
  const isDecember = new Date().getMonth() === 11;

  // Generate snowflake data with useMemo to prevent HMR issues
  const snowflakeData = useMemo(() => {
    return isDecember ? generateSnowflakeElements() : { snowflakes: [], animations: [] };
  }, [isDecember]);

  const snowfallAnimations = useMemo(() => {
    return isDecember && snowflakeData.animations.length > 0 
      ? generateSnowfallCSS(snowflakeData.animations) 
      : '';
  }, [isDecember, snowflakeData.animations]);

  // Fonction pour rendre le titre avec style spécial pour décembre
  const renderPageTitle = () => {
    if (isDecember) {
      return (
        <span className="relative">
          <span className="calendar-title">
            Mon calendrier
            <span className="ml-2 inline-block animate-bounce">❄️</span>
          </span>
        </span>
      );
    }
    
    return (
      <span>
        Mon calendrier
      </span>
    );
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="h-full bg-white dark:bg-gray-900 relative transition-colors duration-200 overflow-hidden flex flex-col">
      {/* Indicateur de chargement lors de la navigation */}
      {isNavigating && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Chargement de la feuille de temps...</p>
          </div>
        </div>
      )}

      {/* Styles pour le titre du calendrier */}
      {isDecember && (
        <style>
          {`
            .calendar-title {
              font-family: 'Super Adorable', 'Comic Sans MS', cursive, sans-serif;
              font-weight: bold;
              font-size: 1.1em;
              color: var(--calendar-title-color);
              display: inline-block;
              letter-spacing: 0.5px;
            }
            
            :root {
              --calendar-title-color: black;
            }
            
            .dark {
              --calendar-title-color: white;
            }
          `}
        </style>
      )}

      {/* Flocons de neige sur toute la page pour décembre */}
      {isDecember && (
        <>
          <style dangerouslySetInnerHTML={{ __html: snowfallAnimations }} />
          <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
            {snowflakeData.snowflakes}
          </div>
        </>
      )}

      {/* En-tête - MOBILE RESPONSIVE */}
      <div className="relative z-10 flex-shrink-0 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 sm:p-6">
        <div className="flex items-center justify-between w-full gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {renderPageTitle()}
          </h1>
          {currentUser?.role === 'employee' && (
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg hover:shadow-xl rounded-full sm:rounded-md px-3 py-2 sm:px-4 sm:py-2"
              title="Enregistrer une période"
            >
              <div className="relative">
                <CalendarIcon size={20} className="text-white" />
                <Clock size={12} className="absolute -bottom-1 -right-1 text-white" />
              </div>
              <span className="hidden sm:inline text-sm font-medium">Enregistrer une période</span>
            </button>
          )}
        </div>
      </div>

      {/* Calendrier centré - MOBILE RESPONSIVE */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 overflow-y-auto">
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <Calendar 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              snowfallAnimations={snowfallAnimations}
            />
          </div>
        </div>

        {/* Message d'aide supplémentaire - MOBILE RESPONSIVE */}
      </div>

      {/* Modal d'enregistrement de période */}
      <AddPeriodModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
      />
    </div>
  );
};

export default CalendarPage;