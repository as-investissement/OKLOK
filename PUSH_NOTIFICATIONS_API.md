# 📱 API Routes pour Notifications Push

## ✅ Routes créées

### 1. POST `/functions/v1/push-register`
**Enregistrer un token push**

```typescript
// Body
{
  "token": "fcm-token-here",
  "platform": "android" | "ios", 
  "userId": "user-uuid"
}

// Response
{
  "success": true,
  "tokenId": "token-id",
  "platform": "android",
  "enabled": true,
  "revoked": false
}
```

**Fonctionnalités :**
- ✅ Upsert dans `push_tokens` (unique par token)
- ✅ Set `enabled=true`, `revoked=false`, `last_seen_at=now()`
- ✅ Crée `user_settings` avec `notifications_enabled=true` si NULL

---

### 2. POST `/functions/v1/push-revoke`
**Révoquer un token push**

```typescript
// Body
{
  "token": "fcm-token-here",
  "userId": "user-uuid"
}

// Response
{
  "success": true,
  "tokenId": "token-id",
  "enabled": false,
  "revoked": true
}
```

**Fonctionnalités :**
- ✅ Vérifie que le token appartient à l'utilisateur
- ✅ Set `enabled=false`, `revoked=true`
- ✅ Met à jour `last_seen_at`

---

### 3. POST `/functions/v1/users-notifications`
**Gérer les préférences de notifications**

```typescript
// Body
{
  "userId": "user-uuid",
  "enabled": true | false
}

// Response
{
  "success": true,
  "settings": {
    "enabled": true,
    "weekly_reminders_enabled": true,
    "push_notifications_enabled": true,
    "email_notifications_enabled": false
  },
  "active_tokens_count": 2
}
```

**Fonctionnalités :**
- ✅ Met à jour `user_settings.notifications_enabled`
- ✅ Si `enabled=false` → désactive TOUS les tokens de l'utilisateur
- ✅ Retourne l'état complet des préférences
- ✅ Compte les tokens actifs

---

## 📊 Tables mises à jour

### push_tokens
```sql
-- Nouvelles colonnes ajoutées
enabled boolean DEFAULT true NOT NULL
-- revoked et last_seen_at déjà existants
```

### user_settings (nouvelle table)
```sql
user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
notifications_enabled boolean DEFAULT true NOT NULL
weekly_reminders_enabled boolean DEFAULT true NOT NULL  
email_notifications_enabled boolean DEFAULT false NOT NULL
push_notifications_enabled boolean DEFAULT true NOT NULL
created_at timestamptz DEFAULT now() NOT NULL
updated_at timestamptz DEFAULT now() NOT NULL
```

## 🔐 Sécurité RLS

- ✅ **user_settings** : RLS activé
- ✅ **Policy utilisateur** : Chaque user gère ses propres paramètres
- ✅ **Policy admin** : Les admins voient tous les paramètres
- ✅ **Validation** : Vérification ownership des tokens

## 🎯 Utilisation dans l'app

```typescript
// Enregistrer un token
await fetch('/functions/v1/push-register', {
  method: 'POST',
  body: JSON.stringify({
    token: fcmToken,
    platform: 'android',
    userId: currentUser.id
  })
});

// Désactiver les notifications
await fetch('/functions/v1/users-notifications', {
  method: 'POST', 
  body: JSON.stringify({
    userId: currentUser.id,
    enabled: false
  })
});

// Révoquer un token (déconnexion)
await fetch('/functions/v1/push-revoke', {
  method: 'POST',
  body: JSON.stringify({
    token: fcmToken,
    userId: currentUser.id
  })
});
```

## 🔄 Gestion automatique

### Déconnexion utilisateur
- ✅ **Révocation automatique** du token lors du logout
- ✅ **Nettoyage** des listeners Capacitor
- ✅ **Sécurité** : Token inutilisable après déconnexion

### Multi-appareils
- ✅ **Plusieurs tokens** par utilisateur supportés
- ✅ **Désactivation globale** : Switch OFF → tous les tokens désactivés
- ✅ **Gestion individuelle** : Révocation par token spécifique

### Tokens invalides
- ✅ **Détection automatique** des tokens FCM "NotRegistered"
- ✅ **Marquage revoked=true** automatique
- ✅ **Nettoyage** des tokens obsolètes
---

**🎊 Votre API de notifications push est maintenant complète et professionnelle !**