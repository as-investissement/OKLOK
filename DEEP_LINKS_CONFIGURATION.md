# Configuration des Deep Links pour l'Activation Mobile

Ce document explique comment configurer les Deep Links pour permettre aux utilisateurs d'activer leur compte directement depuis l'application mobile.

## Flux d'Activation

### 1. Invitation par Email
- L'administrateur invite un salarié depuis l'interface web
- Le salarié reçoit un email avec un lien d'activation contenant `token` et `inviteId`
- Format du lien : `https://votre-domaine.com/activate-account?token=XXX&inviteId=YYY`

### 2. Téléchargement de l'Application
- Le salarié clique sur le lien d'invitation
- Il est redirigé vers la page de téléchargement de l'app
- Il télécharge et installe l'application mobile (iOS ou Android)

### 3. Ouverture de l'Application
- Au premier lancement, l'app détecte les paramètres d'activation stockés
- L'app redirige automatiquement vers la page d'activation
- Le salarié crée son mot de passe
- Après activation, il est connecté et redirigé vers le dashboard

## Configuration Android

### Étape 1 : Modifier AndroidManifest.xml

Ajouter la configuration du Deep Link dans `/android/app/src/main/AndroidManifest.xml` :

```xml
<activity
    android:name=".MainActivity"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    android:label="@string/title_activity_main"
    android:launchMode="singleTask"
    android:theme="@style/AppTheme.NoActionBarLaunch">

    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- Deep Link Configuration -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />

        <!-- Remplacer par votre domaine -->
        <data android:scheme="https" />
        <data android:host="votre-domaine.com" />
        <data android:pathPrefix="/activate-account" />
    </intent-filter>

</activity>
```

### Étape 2 : Tester le Deep Link sur Android

```bash
# Tester le deep link avec ADB
adb shell am start -a android.intent.action.VIEW -d "https://votre-domaine.com/activate-account?token=test123&inviteId=invite456" com.ahlem.feuillesdetemps
```

## Configuration iOS

### Étape 1 : Modifier Info.plist

Ajouter la configuration du Deep Link dans `/ios/App/App/Info.plist` :

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.ahlem.feuillesdetemps</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>feuillesdetemps</string>
        </array>
    </dict>
</array>

<!-- Universal Links Configuration -->
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:votre-domaine.com</string>
</array>
```

### Étape 2 : Configurer Associated Domains

1. Aller dans Xcode → Project Settings → Signing & Capabilities
2. Ajouter "Associated Domains"
3. Ajouter : `applinks:votre-domaine.com`

### Étape 3 : Créer le fichier apple-app-site-association

Créer ce fichier à la racine de votre serveur web (accessible à `https://votre-domaine.com/.well-known/apple-app-site-association`) :

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.ahlem.feuillesdetemps",
        "paths": [
          "/activate-account",
          "/activate-account/*"
        ]
      }
    ]
  }
}
```

**Important** : Remplacer `TEAM_ID` par votre Team ID Apple Developer.

### Étape 4 : Tester le Deep Link sur iOS

```bash
# Utiliser xcrun simctl pour tester sur simulateur
xcrun simctl openurl booted "https://votre-domaine.com/activate-account?token=test123&inviteId=invite456"
```

## Architecture Technique

### Fichiers Modifiés/Créés

1. **`/src/lib/deepLinkHandler.ts`**
   - Service de gestion des paramètres d'activation
   - Stockage et récupération depuis localStorage
   - Parsing des URLs de Deep Links

2. **`/src/main.tsx`**
   - Initialisation du gestionnaire de Deep Links
   - Écoute de l'événement `appUrlOpen` de Capacitor
   - Sauvegarde des paramètres quand un Deep Link est reçu

3. **`/src/components/LoginForm.tsx`**
   - Vérification des paramètres d'activation au chargement
   - Redirection automatique vers la page d'activation si paramètres présents

4. **`/src/pages/ActivateAccount.tsx`**
   - Support du paramètre `platform=mobile`
   - Nettoyage des paramètres après activation réussie
   - Interface responsive pour mobile

5. **`/capacitor.config.ts`**
   - Configuration de `appUrlOpen` pour activer les Deep Links

## Flux de Données

```
1. Email d'invitation (Web)
   ↓
2. Clic sur le lien → Navigateur
   ↓
3. Redirection vers App Store/Google Play
   ↓
4. Installation de l'app
   ↓
5. Clic sur le lien d'invitation → Deep Link capturé
   ↓
6. app.addListener('appUrlOpen') → deepLinkHandler.saveActivationParams()
   ↓
7. Redirection vers '/' (LoginForm)
   ↓
8. LoginForm détecte les paramètres → Redirection vers /activate-account
   ↓
9. Création du mot de passe
   ↓
10. deepLinkHandler.clearActivationParams()
   ↓
11. Connexion automatique → Dashboard
```

## Sécurité

- Les paramètres d'activation sont stockés temporairement dans localStorage
- Expiration automatique après 1 heure
- Nettoyage automatique après activation réussie
- Les tokens sont validés côté serveur (Edge Function)

## Test en Mode Développement

### Test sans Deep Link (mode Web)

```bash
# 1. Démarrer l'app
npm run dev

# 2. Ouvrir l'URL avec les paramètres
http://localhost:5173/activate-account?token=test123&inviteId=invite456&platform=web
```

### Test avec Deep Link (mode Mobile)

```bash
# 1. Build l'app
npm run build

# 2. Sync avec Capacitor
npx cap sync

# 3. Android
npx cap open android
# Puis utiliser ADB pour tester le deep link

# 4. iOS
npx cap open ios
# Puis utiliser xcrun simctl pour tester le deep link
```

## Dépannage

### Le Deep Link ne fonctionne pas sur Android

1. Vérifier que le domaine est bien configuré dans `AndroidManifest.xml`
2. Vérifier que `android:autoVerify="true"` est présent
3. Tester avec ADB en ligne de commande
4. Vérifier les logs : `adb logcat | grep -i "deep"`

### Le Deep Link ne fonctionne pas sur iOS

1. Vérifier que le fichier `apple-app-site-association` est accessible
2. Vérifier que le Team ID est correct
3. Vérifier les Associated Domains dans Xcode
4. Tester sur un appareil physique (les simulateurs peuvent avoir des limitations)
5. Vérifier les logs dans Xcode Console

### L'activation ne se déclenche pas automatiquement

1. Ouvrir la console du navigateur/app
2. Vérifier les logs : "🔗 Deep Link reçu"
3. Vérifier : "✅ Paramètres d'activation sauvegardés"
4. Vérifier la redirection vers LoginForm
5. Vérifier la détection des paramètres dans LoginForm

## Variables d'Environnement

Assurez-vous que ces variables sont configurées dans `.env` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon
VITE_GOOGLE_PLAY_URL=https://play.google.com/store/apps/details?id=com.ahlem.feuillesdetemps
VITE_APP_STORE_URL=https://apps.apple.com/app/...
```

## Support

Pour toute question ou problème, contactez l'équipe de développement.
