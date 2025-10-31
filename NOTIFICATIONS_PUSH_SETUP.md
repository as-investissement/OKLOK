# Configuration des Notifications Push Firebase

Ce document explique comment les notifications push sont configurées dans l'application.

## Architecture

L'application utilise **Firebase Cloud Messaging (FCM) V1 API** pour envoyer des notifications push aux appareils Android et iOS.

### Composants

1. **Edge Function `send-push-notification`** : Service centralisé pour envoyer des notifications
2. **Utility `pushNotifications.ts`** : Gestion côté client des tokens et permissions
3. **Edge Function `notify-missing-timesheets`** : Envoi automatique de rappels hebdomadaires

## Configuration Firebase

### Service Account

Les credentials Firebase sont stockés de manière sécurisée dans l'Edge Function `send-push-notification`.

**Informations du projet:**
- Project ID: `feuilles-de-temps-b6524`
- Client Email: `firebase-adminsdk-fbsvc@feuilles-de-temps-b6524.iam.gserviceaccount.com`

### Fichiers de configuration

- **Android**: `/android/app/google-services.json`
- **iOS**: `/ios/App/App/GoogleService-Info.plist`

## Utilisation

### Côté Client

```typescript
import { sendPushNotification } from '@/utils/pushNotifications';

// Envoyer une notification
await sendPushNotification(
  'TOKEN_FCM_DESTINATAIRE',
  'Titre de la notification',
  'Corps du message',
  { key: 'valeur' } // Données optionnelles
);
```

### Côté Serveur

Les Edge Functions peuvent appeler `send-push-notification`:

```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/send-push-notification`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: 'TOKEN_FCM',
      title: 'Titre',
      body: 'Message',
      data: { type: 'custom_data' }
    })
  }
);
```

## Base de données

### Table `push_tokens`

Stocke les tokens FCM des utilisateurs:

- `user_id`: Référence vers l'utilisateur
- `token`: Token FCM unique
- `platform`: 'android' ou 'ios'
- `enabled`: Notification activée/désactivée
- `revoked`: Token révoqué (appareil désinscrit)

### Table `push_notifications_log`

Historique des notifications envoyées pour éviter les spams:

- `user_id`: Destinataire
- `kind`: Type de notification ('timesheet_reminder', etc.)
- `week_start`: Semaine concernée
- `sent_at`: Date d'envoi
- `tokens_count`: Nombre de tokens notifiés

## Sécurité

1. **Authentification**: L'Edge Function `send-push-notification` nécessite un JWT valide
2. **Credentials**: Les clés privées Firebase sont stockées dans le code de l'Edge Function
3. **RLS**: Les tables `push_tokens` et `push_notifications_log` sont protégées par Row Level Security

## Tests

Pour tester l'envoi de notifications:

1. Déployer l'Edge Function `send-push-notification`
2. Obtenir un token FCM valide depuis un appareil
3. Appeler la fonction avec le token

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "FCM_TOKEN",
    "title": "Test",
    "body": "Message de test"
  }'
```

## Maintenance

### Mettre à jour les credentials Firebase

Si vous devez mettre à jour le Service Account:

1. Télécharger le nouveau fichier JSON depuis Firebase Console
2. Mettre à jour l'objet `FIREBASE_SERVICE_ACCOUNT` dans `/supabase/functions/send-push-notification/index.ts`
3. Redéployer la fonction

### Nettoyer les tokens invalides

Les tokens sont automatiquement marqués comme `revoked` lorsque Firebase retourne une erreur "NotRegistered".

## Dépannage

### Les notifications ne sont pas reçues

1. Vérifier que les permissions sont accordées sur l'appareil
2. Vérifier que `push_tokens.enabled = true` et `push_tokens.revoked = false`
3. Vérifier les logs de l'Edge Function `send-push-notification`
4. Vérifier que `google-services.json` / `GoogleService-Info.plist` sont à jour

### Erreur "Invalid credentials"

Les credentials Firebase sont peut-être expirés ou incorrects. Vérifier l'objet `FIREBASE_SERVICE_ACCOUNT` dans l'Edge Function.

### Erreur "Token not found"

L'appareil n'est pas enregistré ou le token a été révoqué. L'utilisateur doit réactiver les notifications dans les paramètres.
