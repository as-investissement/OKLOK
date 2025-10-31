import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Lock, Bell, BellOff, Moon, Sun, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { enableNotifications, disableNotifications, getCurrentPushToken } from '../utils/pushNotifications';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { supabase } from '../lib/supabaseClient';

const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [currentPushToken, setCurrentPushToken] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const navigate = useNavigate();

  // Charger les préférences de notification au chargement
  React.useEffect(() => {
    const loadNotificationPreference = async () => {
      if (!currentUser) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('notification_preference')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (!error && data) {
          const preference = data.notification_preference ?? true;
          setNotificationsEnabled(preference);
          localStorage.setItem('weeklyNotificationsEnabled', JSON.stringify(preference));
        } else {
          const savedPreference = localStorage.getItem('weeklyNotificationsEnabled');
          if (savedPreference !== null) {
            setNotificationsEnabled(JSON.parse(savedPreference));
          }
        }
      } catch (error) {
        console.error('Erreur chargement préférence notification:', error);
        const savedPreference = localStorage.getItem('weeklyNotificationsEnabled');
        if (savedPreference !== null) {
          setNotificationsEnabled(JSON.parse(savedPreference));
        }
      }
    };

    loadNotificationPreference();

    // Charger les préférences de mode sombre
    const savedDarkMode = localStorage.getItem('darkModeEnabled');
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    }

    // Charger le token push actuel
    getCurrentPushToken().then(token => {
      setCurrentPushToken(token);
      console.log('🔑 Token push actuel:', token ? 'Présent' : 'Absent');
    });
  }, [currentUser]);

  // Fonction pour basculer les notifications
  const toggleNotifications = async () => {
    if (!currentUser) {
      alert('❌ Utilisateur non connecté');
      return;
    }

    setNotificationsLoading(true);
    const newValue = !notificationsEnabled;
    
    try {
      console.log('🔄 === BASCULEMENT NOTIFICATIONS ===');
      console.log('👤 User:', currentUser.name);
      console.log('🔄 Nouveau statut:', newValue ? 'ACTIVÉ' : 'DÉSACTIVÉ');
      
      let success = false;
      
      if (newValue) {
        // Activer les notifications
        success = await enableNotifications(currentUser.id);
        
        if (success) {
          // Récupérer le nouveau token
          const newToken = await getCurrentPushToken();
          setCurrentPushToken(newToken);
        }
      } else {
        // Désactiver les notifications
        success = await disableNotifications(currentUser.id, currentPushToken || undefined);
      }
      
      if (success) {
        setNotificationsEnabled(newValue);
        localStorage.setItem('weeklyNotificationsEnabled', JSON.stringify(newValue));

        // Mettre à jour dans la base de données
        await supabase
          .from('users')
          .update({
            notification_preference: newValue,
            notification_preference_set_at: new Date().toISOString()
          })
          .eq('id', currentUser.id);

        // Déclencher un événement pour notifier les autres composants
        window.dispatchEvent(new CustomEvent('notificationPreferenceChanged', {
          detail: { enabled: newValue }
        }));

        console.log('✅ Notifications', newValue ? 'activées' : 'désactivées', 'avec succès');
        
        // Message de succès différent selon la plateforme
        if (newValue) {
          alert('✅ Notifications activées !\n\n' + 
                (window.location.hostname.includes('webcontainer') || window.location.hostname.includes('bolt') 
                  ? '🌐 Mode démo web : Les préférences sont sauvegardées.\nSur mobile, vous recevrez les vraies notifications push.'
                  : '📱 Vous recevrez maintenant les notifications de rappel.'));
        } else {
          alert('🔕 Notifications désactivées avec succès !');
        }
      } else {
        console.error('❌ Échec du basculement des notifications');
        
        // Message d'erreur plus informatif
        if (window.location.hostname.includes('webcontainer') || window.location.hostname.includes('bolt')) {
          alert('ℹ️ Mode démo détecté\n\n' +
                '🌐 Sur cette démo web, les notifications push natives ne sont pas disponibles.\n' +
                '📱 Sur l\'app mobile, cette fonctionnalité marchera parfaitement !\n\n' +
                '✅ Vos préférences sont quand même sauvegardées.');
          
          // Forcer l'activation en mode démo
          setNotificationsEnabled(newValue);
          localStorage.setItem('weeklyNotificationsEnabled', JSON.stringify(newValue));
        } else {
          alert('❌ Erreur lors de la modification des notifications. Veuillez réessayer.');
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur toggleNotifications:', error);
      alert('❌ Erreur lors de la modification des notifications.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Fonction pour basculer les notifications (ancienne version locale)
  const toggleNotificationsLocal = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('weeklyNotificationsEnabled', JSON.stringify(newValue));
    
    // Déclencher un événement pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('notificationPreferenceChanged', {
      detail: { enabled: newValue }
    }));
  };

  // Fonction pour basculer le mode sombre
  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem('darkModeEnabled', JSON.stringify(newValue));
    
    // Appliquer le mode sombre immédiatement
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Déclencher un événement pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('darkModeChanged', {
      detail: { enabled: newValue }
    }));
  };


  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200 p-3 sm:p-6">
      <div className="flex items-center mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/')}
          className="mr-3 sm:mr-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-blue-600 transition-colors duration-200 group"
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Paramètres</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gérer vos préférences et votre sécurité
          </p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {/* Section Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center mb-3 sm:mb-4">
            <Bell className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">Notifications</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                  Rappels hebdomadaires
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Recevoir un rappel le samedi soir si vous n'avez pas encore enregistré vos heures de la semaine
                </p>
              </div>
              
              {/* Interrupteur à bascule */}
              <button
                type="button"
                onClick={toggleNotifications}
                disabled={notificationsLoading}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  notificationsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${notificationsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={notificationsEnabled}
              >
                <span className="sr-only">Activer les notifications</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {notificationsLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </span>
              </button>
            </div>
            
            {/* Indicateur visuel de l'état */}
            <div className={`flex items-center text-xs sm:text-sm transition-colors ${
              notificationsLoading ? 'text-blue-600 dark:text-blue-400' :
              notificationsEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {notificationsLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600 mr-1 sm:mr-2"></div>
                  <span>Configuration en cours...</span>
                </>
              ) : notificationsEnabled ? (
                <>
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span>Notifications activées</span>
                </>
              ) : (
                <>
                  <BellOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span>Notifications désactivées</span>
                </>
              )}
            </div>
            
            {/* Debug info pour développement */}
            {currentPushToken && (
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Token push : {currentPushToken.substring(0, 20)}...
              </div>
            )}
          </div>
        </div>

        {/* Section Mode Sombre */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center mb-3 sm:mb-4">
            {darkMode ? (
              <Moon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            ) : (
              <Sun className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            )}
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">Apparence</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                  Mode sombre
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Basculer vers un thème sombre pour réduire la fatigue oculaire, surtout en soirée
                </p>
              </div>
              
              {/* Interrupteur à bascule pour le mode sombre */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  darkMode ? 'bg-gray-800 dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={darkMode}
              >
                <span className="sr-only">Activer le mode sombre</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    darkMode ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            {/* Indicateur visuel de l'état */}
            <div className={`flex items-center text-xs sm:text-sm ${
              darkMode ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {darkMode ? (
                <>
                  <Moon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span>Mode sombre activé</span>
                </>
              ) : (
                <>
                  <Sun className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span>Mode clair activé</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section Mot de passe */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center mb-3 sm:mb-4">
            <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">Sécurité</h2>
          </div>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Changer le mot de passe
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Modifier votre mot de passe de connexion
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default Settings;