import React, { useState, useEffect } from 'react';
import { Clock, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTimesheets } from '../context/TimesheetContext';
import { useAuth } from '../context/AuthContext';

const WeeklySubmissionNotification: React.FC = () => {
  const { timesheets } = useTimesheets();
  const { currentUser } = useAuth();
  const [showNotification, setShowNotification] = useState(false);
  const [timeUntilSubmission, setTimeUntilSubmission] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;

    const checkCurrentWeekStatus = () => {
      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi de cette semaine
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

      const currentWeekStartStr = currentWeekStart.toISOString().split('T')[0];
      const currentWeekEndStr = currentWeekEnd.toISOString().split('T')[0];

      // Trouver la feuille de temps de la semaine en cours
      const currentWeekTimesheet = timesheets.find(ts => 
        ts.userId === currentUser.id &&
        ts.weekStarting === currentWeekStartStr && 
        ts.weekEnding === currentWeekEndStr
      );

      // Calculer le temps restant jusqu'à dimanche 23h59
      const nextSunday = new Date(currentWeekEnd);
      nextSunday.setHours(23, 59, 59, 999);
      
      const timeLeft = nextSunday.getTime() - now.getTime();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      if (hoursLeft >= 0 && minutesLeft >= 0) {
        setTimeUntilSubmission(`${hoursLeft}h ${minutesLeft}min`);
      } else {
        setTimeUntilSubmission('Soumission automatique en cours...');
      }

      // Afficher la notification si :
      // 1. Il y a une feuille de temps avec des entrées
      // 2. Elle n'est pas encore soumise
      // 3. Il reste moins de 24h avant dimanche 23h59
      if (currentWeekTimesheet && 
          currentWeekTimesheet.entries.length > 0 && 
          currentWeekTimesheet.status === 'draft' && 
          hoursLeft <= 24 && hoursLeft >= 0) {
        setShowNotification(true);
      } else {
        setShowNotification(false);
      }
    };

    // Vérifier immédiatement
    checkCurrentWeekStatus();

    // Mettre à jour toutes les minutes
    const interval = setInterval(checkCurrentWeekStatus, 60000);

    return () => clearInterval(interval);
  }, [timesheets, currentUser]);

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Soumission automatique programmée
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Votre feuille de temps sera automatiquement soumise pour approbation dans :
              </p>
              <div className="mt-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span className="font-medium">{timeUntilSubmission}</span>
              </div>
              <p className="mt-2 text-xs">
                Soumission automatique : Dimanche 23h59
              </p>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => setShowNotification(false)}
              className="bg-yellow-50 rounded-md inline-flex text-yellow-400 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
            >
              <span className="sr-only">Fermer</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklySubmissionNotification;