import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

let isRegistered = false;

export const registerPushNotifications = async () => {
  try {
    if (Capacitor.getPlatform() === 'web') {
      console.log('⚠️ Plateforme web détectée, notifications push désactivées');
      return;
    }

    if (isRegistered) {
      console.log('⚠️ Notifications push déjà enregistrées');
      return;
    }

    console.log('🔔 Début enregistrement notifications push');

    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('❌ Permission refusée pour les notifications');
      return;
    }

    console.log('✅ Permission accordée');
    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token: any) => {
      console.log('🔑 Token FCM reçu:', token.value);

      try {
        const platform = Capacitor.getPlatform();
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-push-token`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token.value,
            platform: platform
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de l\'enregistrement du token');
        }

        const result = await response.json();
        console.log('✅ Token enregistré avec succès:', result);

      } catch (error) {
        console.error('❌ Erreur envoi token:', error);
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ Erreur enregistrement:', error.error);
    });

    isRegistered = true;
    console.log('✅ Enregistrement notifications terminé');

  } catch (error) {
    console.error('❌ Erreur générale notifications:', error);
  }
};

export async function enableNotifications(userId: string): Promise<boolean> {
  try {
    console.log('🔔 Activation notifications pour:', userId);

    if (Capacitor.getPlatform() === 'web') {
      console.log('🌐 Web - activation préférences serveur uniquement');

      const serverResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/users-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, enabled: true })
      });

      if (!serverResponse.ok) {
        const errorData = await serverResponse.json();
        throw new Error(errorData.error || 'Erreur serveur');
      }

      return true;
    }

    const serverResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/users-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, enabled: true })
    });

    if (!serverResponse.ok) {
      const errorData = await serverResponse.json();
      throw new Error(errorData.error || 'Erreur serveur');
    }

    console.log('📱 Demande de permissions...');
    let perm = await PushNotifications.checkPermissions();

    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive !== 'granted') {
      console.log('❌ Permission refusée');
      return false;
    }

    console.log('✅ Permission accordée');
    await PushNotifications.register();

    return new Promise((resolve) => {
      const once = async (ev: any) => {
        try {
          console.log('🔑 Token FCM reçu');

          const registerResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              token: ev.value,
              platform: Capacitor.getPlatform()
            })
          });

          if (!registerResponse.ok) {
            resolve(false);
            return;
          }

          console.log('✅ Token enregistré');
          PushNotifications.removeAllListeners();
          resolve(true);

        } catch (error) {
          console.error('❌ Erreur:', error);
          resolve(false);
        }
      };

      PushNotifications.addListener('registration', once);

      setTimeout(() => {
        PushNotifications.removeAllListeners();
        resolve(true);
      }, 10000);
    });

  } catch (error) {
    console.error('❌ Erreur enableNotifications:', error);
    return false;
  }
}

export async function disableNotifications(userId: string, currentToken?: string): Promise<boolean> {
  try {
    console.log('🔕 Désactivation notifications pour:', userId);

    if (Capacitor.getPlatform() === 'web') {
      const serverResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/users-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, enabled: false })
      });

      if (!serverResponse.ok) {
        const errorData = await serverResponse.json();
        throw new Error(errorData.error || 'Erreur serveur');
      }

      return true;
    }

    const serverResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/users-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, enabled: false })
    });

    if (!serverResponse.ok) {
      const errorData = await serverResponse.json();
      throw new Error(errorData.error || 'Erreur serveur');
    }

    if (currentToken) {
      const revokeResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: currentToken })
      });

      if (revokeResponse.ok) {
        console.log('✅ Token révoqué');
      }
    }

    await PushNotifications.removeAllListeners();
    console.log('✅ Désactivation terminée');
    return true;

  } catch (error) {
    console.error('❌ Erreur disableNotifications:', error);
    return false;
  }
}

export async function getCurrentPushToken(): Promise<string | null> {
  try {
    if (Capacitor.getPlatform() === 'web') {
      return null;
    }

    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      return null;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        PushNotifications.removeAllListeners();
        resolve(null);
      }, 5000);

      PushNotifications.addListener('registration', (token: any) => {
        clearTimeout(timeout);
        PushNotifications.removeAllListeners();
        resolve(token.value);
      });

      PushNotifications.register().catch(() => {
        clearTimeout(timeout);
        resolve(null);
      });
    });

  } catch (error) {
    console.error('❌ Erreur getCurrentPushToken:', error);
    return null;
  }
}

export const unregisterPushNotifications = async () => {
  try {
    if (Capacitor.getPlatform() === 'web') {
      return;
    }

    console.log('🔕 Désinscription des notifications');
    await PushNotifications.removeAllListeners();
    isRegistered = false;
    console.log('✅ Désinscription terminée');

  } catch (error) {
    console.error('❌ Erreur désinscription:', error);
  }
};

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          token,
          title,
          body,
          data,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur envoi notification');
    }

    const result = await response.json();
    console.log('✅ Notification envoyée:', result);
    return true;

  } catch (error) {
    console.error('❌ Erreur sendPushNotification:', error);
    return false;
  }
}
