import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { deepLinkHandler } from './lib/deepLinkHandler'

// Fonction pour gérer les erreurs globales
window.addEventListener('error', (event) => {
  console.error('Erreur globale:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejetée:', event.reason);
});

// Initialiser la gestion des Deep Links
const initDeepLinkHandler = async () => {
  try {
    const { App: CapApp } = await import('@capacitor/app');
    const { Capacitor } = await import('@capacitor/core');

    if (Capacitor.isNativePlatform()) {
      console.log('🔗 Initialisation du gestionnaire de Deep Links...');

      CapApp.addListener('appUrlOpen', ({ url }) => {
        console.log('🔗 Deep Link reçu:', url);

        try {
          const u = new URL(url);
          // feuillestemps://messages
          if (u.protocol === 'feuillestemps:' && (u.host === 'messages' || u.pathname === '/messages')) {
            console.log('📨 Redirection vers Messages');
            window.location.hash = '#/messages';
            return;
          }

          // Gérer les liens d'activation
          const params = deepLinkHandler.parseDeepLink(url);
          if (params) {
            deepLinkHandler.saveActivationParams(params.token, params.inviteId);
            console.log('✅ Paramètres d\'activation sauvegardés depuis Deep Link');
            window.location.href = '/';
          }
        } catch (error) {
          console.error('❌ Erreur parsing Deep Link:', error);
        }
      });

      console.log('✅ Gestionnaire de Deep Links initialisé');
    }
  } catch (error) {
    console.warn('⚠️ Deep Links non disponibles (mode web):', error);
  }
};

initDeepLinkHandler();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)

// Enregistrer les notifications push de manière sécurisée
const initPushNotifications = async () => {
  try {
    // Import dynamique pour éviter les erreurs
    const { registerPushNotifications } = await import('./utils/pushNotifications');
    const { Capacitor } = await import('@capacitor/core');
    
    if (Capacitor.isNativePlatform()) {
      // Attendre que l'app soit complètement chargée
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          registerPushNotifications().catch(error => {
            console.error('❌ Erreur initialisation notifications push:', error);
          });
        }, 2000);
      });
    }
  } catch (error) {
    console.warn('⚠️ Capacitor non disponible, notifications push désactivées:', error.message);
  }
};

// Initialiser les notifications push de manière sécurisée
initPushNotifications();

// Only register service worker in supported environments
if ('serviceWorker' in navigator && !window.location.hostname.includes('stackblitz')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ ServiceWorker enregistré avec succès:', registration);
      })
      .catch((error) => {
        console.log('❌ Erreur lors de l\'enregistrement du ServiceWorker:', error);
      });
  });
}