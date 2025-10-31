# 🔥 Configuration Firebase FCM avec Service Account

## ✅ Configuration terminée !

### 🔐 Service Account configuré

Votre Edge Function `notify-missing-timesheets` utilise maintenant :
- **Project ID** : `feuilles-de-temps-b6524`
- **Client Email** : `firebase-adminsdk-fbsvc@feuilles-de-temps-b6524.iam.gserviceaccount.com`
- **Private Key** : Intégrée de manière sécurisée dans le code

### 🎯 Fonctionnalités

✅ **Authentification moderne** avec JWT + OAuth2  
✅ **API FCM v1** (la plus récente)  
✅ **Support iOS et Android** avec configurations spécifiques  
✅ **Anti-spam** : max 1 notification par 5h  
✅ **Préférences utilisateur** : respect des paramètres de notification  
✅ **Logging** des notifications dans `push_notifications_log`  

### 📊 Tables mises à jour

#### push_tokens
- ✅ `enabled` boolean DEFAULT true
- ✅ `revoked` boolean DEFAULT false  
- ✅ `last_seen_at` timestamptz

#### user_settings (nouvelle)
- `user_id` (PK/FK vers users)
- `notifications_enabled` boolean DEFAULT true
- `weekly_reminders_enabled` boolean DEFAULT true
- `email_notifications_enabled` boolean DEFAULT false
- `push_notifications_enabled` boolean DEFAULT true

### 📱 Types de notifications

- **Titre** : "Rappel : heures non soumises"
- **Message** : "Il reste à soumettre : Lundi, Mardi. Soumission auto dimanche 23:59."
- **Données** : type, timestamp, platform

### ⏰ Créneaux d'envoi automatique

- **Samedi 18h** : Rappel de fin de semaine
- **Dimanche 9h, 14h, 19h, 23h** : Rappels avant soumission auto

### 🔍 Monitoring

Consultez les logs dans la table `push_notifications_log` :
```sql
SELECT 
  pnl.*,
  u.name as user_name,
  u.email
FROM push_notifications_log pnl
JOIN users u ON u.id = pnl.user_id
ORDER BY sent_at DESC 
LIMIT 10;
```

### 🧪 Test manuel

Pour tester, appelez l'Edge Function :
```bash
curl -X POST https://your-supabase-url/functions/v1/notify-missing-timesheets
```

### 🎛️ Gestion des préférences

Les utilisateurs peuvent désactiver les notifications via :
```sql
-- Désactiver toutes les notifications
UPDATE user_settings 
SET notifications_enabled = false 
WHERE user_id = 'user-uuid';

-- Désactiver seulement les rappels hebdomadaires
UPDATE user_settings 
SET weekly_reminders_enabled = false 
WHERE user_id = 'user-uuid';
```

---

**🎊 FÉLICITATIONS ! Vos notifications push Firebase sont maintenant configurées avec l'API moderne et la gestion des préférences !**