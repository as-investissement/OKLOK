import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle, X, FileText, Shield, Check, Smartphone, Globe } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { deepLinkHandler } from '../lib/deepLinkHandler';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import { Capacitor } from '@capacitor/core';

interface InvitationData {
  id: string;
  email: string;
  employee_data: {
    name: string;
    department: string;
    position: string;
    hire_date: string;
    birth_date?: string;
    salary?: number;
    phone?: string;
    address?: string;
    emergency_contact?: string;
    social_security?: string;
    bank_info?: string;
  };
  company_id: string;
  status: string;
  expires_at: string;
}

const ActivateAccount: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const inviteId = searchParams.get('inviteId');
  const platform = searchParams.get('platform');
  const mode = searchParams.get('mode'); // 'reset' pour réinitialisation

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showCGUModal, setShowCGUModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [showPlatformChoice, setShowPlatformChoice] = useState(false);

  const passwordValidation = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [password]);

  const isPasswordValid = useMemo(() => {
    return Object.values(passwordValidation).every(Boolean);
  }, [passwordValidation]);

  // Plus besoin de redirection vers app-download
  // Le lien d'invitation va directement à la page de création de compte

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token || !inviteId) {
        setError('Lien d\'activation invalide. Paramètres manquants.');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Chargement de l\'invitation spécifique:', { token, inviteId });
        
        // Récupérer l'invitation directement depuis Supabase
        const { data, error } = await supabase
          .from('user_invitations')
          .select(`
            id,
            email,
            token,
            employee_data,
            company_id,
            status,
            expires_at,
            companies(name)
          `)
          .eq('id', inviteId)
          .eq('token', token)
          .maybeSingle();

        if (error) {
          console.error('❌ Erreur Supabase:', error);
          throw new Error('Invitation non trouvée ou expirée.');
        }
        
        if (!data) {
          setError('Invitation non trouvée ou expirée.');
          setLoading(false);
          return;
        }

        // Vérifier si l'invitation a expiré
        if (new Date(data.expires_at) < new Date()) {
          setError('Cette invitation a expiré.');
          setLoading(false);
          return;
        }

        // Vérifier si l'invitation a déjà été acceptée
        if (data.status === 'accepted') {
          setError('Cette invitation a déjà été utilisée. Le compte a déjà été activé.');
          setLoading(false);
          return;
        }

        console.log('✅ Invitation trouvée:', data);

        setInvitation(data);
        setLoading(false);
      } catch (err) {
        console.error('❌ Erreur:', err);
        setError(err.message || 'Erreur lors du chargement de l\'invitation.');
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, inviteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas tous les critères de sécurité');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!acceptedTerms) {
      setError('Vous devez accepter les conditions d\'utilisation.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log('🚀 === DÉBUT ACTIVATION COMPTE ===');
      console.log('📧 Email:', invitation.email);
      console.log('👤 Nom:', invitation.employee_data.name);
      console.log('🆔 Invite ID:', invitation.id);
      console.log('🔑 Token:', token);
      console.log('🔐 Mot de passe fourni:', password ? 'Présent' : 'Manquant');
      
      // Utiliser l'Edge Function activate-user pour gérer l'activation
      console.log('📡 === APPEL EDGE FUNCTION ===');
      console.log('🌐 URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-user`);
      
      const activationResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteId: invitation.id,
          token: token,
          password: password
        })
      });

      console.log('📡 Réponse Edge Function - Status:', activationResponse.status);
      console.log('📡 Réponse Edge Function - OK:', activationResponse.ok);

      if (!activationResponse.ok) {
        const errorData = await activationResponse.json();
        console.error('❌ Erreur Edge Function:', errorData);
        console.error('❌ Status HTTP:', activationResponse.status);
        console.error('❌ Détails complets:', JSON.stringify(errorData, null, 2));
        
        // Gestion spécifique de l'erreur "User already registered"
        if (errorData.details?.includes('User already registered') || 
            errorData.error?.includes('already registered') ||
            errorData.message?.includes('already registered')) {
          
          console.log('👤 Utilisateur déjà enregistré - Tentative de connexion...');
          
          // Essayer de se connecter avec les identifiants fournis
          try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: invitation.email,
              password: password,
            });

            if (signInError) {
              console.error('❌ Erreur connexion:', signInError);
              setError('Ce compte existe déjà mais le mot de passe ne correspond pas. Contactez votre administrateur.');
              setSubmitting(false);
              return;
            }

            console.log('✅ Connexion réussie avec compte existant');
            
            // Marquer l'invitation comme acceptée si ce n'est pas déjà fait
            if (invitation.status === 'pending') {
              await supabase
                .from('user_invitations')
                .update({
                  status: 'accepted',
                  accepted_at: new Date().toISOString(),
                })
                .eq('id', invitation.id);
            }
            
            // Rediriger vers le dashboard
            navigate('/');
            return;
            
          } catch (signInErr) {
            console.error('❌ Exception connexion:', signInErr);
            setError('Ce compte existe déjà. Contactez votre administrateur pour réinitialiser votre mot de passe.');
            setSubmitting(false);
            return;
          }
        }
        
        setError(errorData.error || 'Erreur lors de l\'activation du compte.');
        setSubmitting(false);
        return;
      }

      const result = await activationResponse.json();
      console.log('✅ === ACTIVATION RÉUSSIE ===');
      console.log('📋 Résultat:', result);
      
      // 🔐 CONNEXION AUTOMATIQUE APRÈS ACTIVATION
      console.log('🔐 === CONNEXION AUTOMATIQUE ===');
      console.log('📧 Tentative de connexion avec:', invitation.email);
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password,
      });

      if (signInError) {
        console.error('❌ Erreur connexion automatique:', signInError);
        
        // 🧪 AFFICHAGE DEBUG POUR TESTS
        alert(`✅ ACTIVATION RÉUSSIE !\n\n` +
              `👤 Utilisateur: ${invitation.employee_data.name}\n` +
              `📧 Email: ${invitation.email}\n` +
              `🆔 User ID: ${result.userId}\n` +
              `🏢 Entreprise: AS INVESTISSEMENT\n` +
              `📊 Mode: ${result.testMode ? 'Test (utilisateur existant)' : 'Nouveau compte'}\n\n` +
              `⚠️ ERREUR CONNEXION: ${signInError.message}\n\n` +
              `➡️ Veuillez vous connecter manuellement avec:\n` +
              `Email: ${invitation.email}\n` +
              `Mot de passe: celui que vous venez de créer`);
        
        // Rediriger vers la page de connexion avec l'email pré-rempli
        navigate(`/login?email=${encodeURIComponent(invitation.email)}`);
        return;
      }

      console.log('✅ Connexion automatique réussie:', signInData.user?.email);

      // Stocker l'ID utilisateur et marquer le compte comme créé
      setCreatedUserId(signInData.user?.id || result.userId);
      setAccountCreated(true);

      // Afficher la page de choix de plateforme
      setShowPlatformChoice(true);
      setSubmitting(false);

    } catch (err) {
      console.error('❌ Exception activation:', err);
      setError('Erreur lors de l\'activation du compte.');
      setSubmitting(false);
    }
  };

  const handleNotificationChoice = async (accepted: boolean) => {
    try {
      if (!createdUserId) {
        console.error('❌ Pas d\'ID utilisateur disponible');
        return;
      }

      console.log(`📱 Choix notification: ${accepted ? 'Accepté' : 'Refusé'}`);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          notification_preference: accepted,
          notification_preference_set_at: new Date().toISOString()
        })
        .eq('id', createdUserId);

      if (updateError) {
        console.error('❌ Erreur mise à jour préférence:', updateError);
      } else {
        console.log('✅ Préférence notification enregistrée');
      }

      setShowNotificationModal(false);

      if (platform === 'mobile') {
        deepLinkHandler.clearActivationParams();
        console.log('✅ Paramètres d\'activation nettoyés');
      }

      navigate('/');

    } catch (error) {
      console.error('❌ Erreur handleNotificationChoice:', error);
      setShowNotificationModal(false);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 sm:p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Erreur d'activation</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  // Page de choix de plateforme après création de compte
  if (showPlatformChoice) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">
              Félicitations !
            </h1>
            <p className="text-green-50 text-base">
              Votre compte a été créé avec succès
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Comment souhaitez-vous utiliser l'application ?
              </h2>
              <p className="text-gray-600 text-sm">
                Choisissez la plateforme qui vous convient le mieux
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {/* Continuer sur le Web */}
              <button
                onClick={() => navigate('/')}
                className="w-full bg-blue-600 text-white p-4 rounded-lg flex items-center justify-center space-x-3 hover:bg-blue-700 transition-colors shadow-md"
              >
                <Globe className="w-6 h-6" />
                <div className="text-left">
                  <div className="text-sm font-medium">Continuer sur le</div>
                  <div className="font-bold text-lg">Navigateur Web</div>
                </div>
              </button>

              {/* iOS */}
              <button
                onClick={() => {
                  const appStoreUrl = import.meta.env.VITE_APP_STORE_URL;
                  if (appStoreUrl && appStoreUrl.trim() !== '') {
                    window.location.href = appStoreUrl;
                  } else {
                    alert('L\'URL de l\'App Store n\'est pas configurée.');
                  }
                }}
                className="w-full bg-gray-800 text-white p-4 rounded-lg flex items-center justify-center space-x-3 hover:bg-gray-900 transition-colors shadow-md"
              >
                <span className="text-2xl">🍎</span>
                <div className="text-left">
                  <div className="text-sm font-medium">Télécharger sur</div>
                  <div className="font-bold text-lg">App Store (iOS)</div>
                </div>
              </button>

              {/* Android */}
              <button
                onClick={() => {
                  const googlePlayUrl = import.meta.env.VITE_GOOGLE_PLAY_URL;
                  if (googlePlayUrl && googlePlayUrl.trim() !== '') {
                    window.location.href = googlePlayUrl;
                  } else {
                    alert('L\'URL de Google Play n\'est pas configurée.');
                  }
                }}
                className="w-full bg-green-600 text-white p-4 rounded-lg flex items-center justify-center space-x-3 hover:bg-green-700 transition-colors shadow-md"
              >
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="text-sm font-medium">Disponible sur</div>
                  <div className="font-bold text-lg">Google Play</div>
                </div>
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-800 text-sm mb-1">
                    💡 Recommandation
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Si vous téléchargez l'application mobile, utilisez vos identifiants pour vous connecter.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-4 sm:p-6 text-center">
          <h1 className="text-white text-xl sm:text-2xl font-bold mb-2">
            {mode === 'reset' ? '🔐 Nouveau mot de passe' : '🎯 Invitation'}
          </h1>
          <h2 className="text-blue-100 text-base sm:text-lg">AS INVESTISSEMENT</h2>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-700 mb-4">
            Bonjour <strong>{invitation.employee_data.name}</strong>,
          </p>

          {mode === 'reset' ? (
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Créez votre nouveau mot de passe pour accéder à votre espace de feuilles de temps.
            </p>
          ) : (
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Créez votre espace personnel de gestion des feuilles de temps.
            </p>
          )}

          {/* Features */}
          {mode !== 'reset' && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border-l-4 border-blue-600">
              <h3 className="text-blue-800 font-semibold mb-3">🎯 Créez votre espace pour :</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="mr-2">⏰</span>
                  Saisir vos heures de travail quotidiennes
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🏗️</span>
                  Suivre vos projets et chantiers
                </li>
                <li className="flex items-center">
                  <span className="mr-2">📤</span>
                  Soumettre vos feuilles de temps pour validation
                </li>
                <li className="flex items-center">
                  <span className="mr-2">📊</span>
                  Consulter l'historique de vos heures
                </li>
                <li className="flex items-center">
                  <span className="mr-2">📱</span>
                  Accéder depuis mobile ou ordinateur
                </li>
              </ul>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Choisissez un mot de passe sécurisé"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {password && (
                <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Critères de sécurité :
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                        passwordValidation.minLength
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}>
                        {passwordValidation.minLength && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs transition-colors duration-200 ${
                        passwordValidation.minLength
                          ? 'text-green-600 font-medium'
                          : 'text-gray-600'
                      }`}>
                        Au moins 8 caractères
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                        passwordValidation.hasUpperCase
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}>
                        {passwordValidation.hasUpperCase && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs transition-colors duration-200 ${
                        passwordValidation.hasUpperCase
                          ? 'text-green-600 font-medium'
                          : 'text-gray-600'
                      }`}>
                        Une lettre majuscule (A-Z)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                        passwordValidation.hasLowerCase
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}>
                        {passwordValidation.hasLowerCase && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs transition-colors duration-200 ${
                        passwordValidation.hasLowerCase
                          ? 'text-green-600 font-medium'
                          : 'text-gray-600'
                      }`}>
                        Une lettre minuscule (a-z)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                        passwordValidation.hasNumber
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}>
                        {passwordValidation.hasNumber && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs transition-colors duration-200 ${
                        passwordValidation.hasNumber
                          ? 'text-green-600 font-medium'
                          : 'text-gray-600'
                      }`}>
                        Un chiffre (0-9)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                        passwordValidation.hasSpecialChar
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}>
                        {passwordValidation.hasSpecialChar && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs transition-colors duration-200 ${
                        passwordValidation.hasSpecialChar
                          ? 'text-green-600 font-medium'
                          : 'text-gray-600'
                      }`}>
                        Un caractère spécial (!@#$%^&*...)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Confirmez votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <div className="mt-1 text-xs text-red-600">
                  Les mots de passe ne correspondent pas
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start space-x-3">
              {/* Case à cocher personnalisée */}
              <div className="relative flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="sr-only"
                />
                <label
                  htmlFor="terms"
                  className={`flex items-center justify-center w-5 h-5 border-2 rounded cursor-pointer transition-all duration-200 ${
                    acceptedTerms
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {acceptedTerms && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </label>
              </div>
              <label htmlFor="terms" className="text-sm text-gray-600">
                J'ai lu et j'accepte les{' '}
                <button
                  type="button"
                  onClick={() => setShowCGUModal(true)}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  conditions d'utilisation, la politique de confidentialité et le traitement de mes données personnelles
                </button>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isPasswordValid || password !== confirmPassword || !acceptedTerms}
              className="w-full bg-gradient-to-r from-blue-800 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-900 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {mode === 'reset' ? 'Mise à jour en cours...' : 'Création en cours...'}
                </div>
              ) : (
                mode === 'reset' ? '🔑 Mettre à jour mon mot de passe' : '🚀 Créer mon espace maintenant'
              )}
            </button>
          </form>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
            <p className="text-yellow-800 text-sm">
              <strong>⏰ Important :</strong> Ce lien expire dans <strong>7 jours</strong>. 
              Créez votre espace rapidement pour accéder à l'application.
            </p>
          </div>

          {/* Help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <h4 className="text-blue-800 font-semibold text-sm mb-1">💬 Besoin d'aide ?</h4>
            <p className="text-blue-700 text-sm">
              Contactez votre administrateur ou l'équipe de AS INVESTISSEMENT pour toute question.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            Email envoyé automatiquement par la plateforme Feuilles de Temps de <strong>AS INVESTISSEMENT</strong>
            <br />Si vous n'êtes pas concerné par cette invitation, vous pouvez ignorer cet email.
          </p>
        </div>
      </div>

      {/* Modal CGU */}
      {showCGUModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header du modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">CGU et Confidentialité</h2>
              <button
                onClick={() => setShowCGUModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Conditions Générales d'Utilisation */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Conditions Générales d'Utilisation (CGU)
                  </h3>
                </div>
                
                <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">1. Objet</h4>
                    <p className="text-sm text-justify">
                      Les présentes CGU encadrent l'utilisation de l'application AS INVESTISSEMENT par les salariés. En accédant à l'application, l'utilisateur salarié déclare accepter les présentes conditions ainsi que la politique de confidentialité ci-dessous.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">2. Présentation de l'éditeur</h4>
                    <p className="text-sm text-justify">
                      L'application est éditée par AS INVESTISSEMENT, société holding immatriculée au RCS de Bobigny sous le numéro 391664430, dont le siège est situé au 72 avenue du Chalet – 93360 Neuilly-Plaisance. Elle est mise à disposition des salariés d'AS INVESTISSEMENT et des sociétés de son groupe (NUMELEC, BBSE, QUADRO CAB et JLCR), toutes ayant le même siège social. Contact : contact@as-numelec.fr.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">3. Accès et utilisation</h4>
                    <p className="text-sm text-justify">
                      L'accès à l'application est réservé aux salariés autorisés des sociétés mentionnées ci-dessus. Toute utilisation doit respecter la loi, le contrat de travail et les règles internes de l'entreprise.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">4. Responsabilité</h4>
                    <p className="text-sm text-justify">
                      L'éditeur s'efforce de garantir la fiabilité des informations diffusées via l'application mais ne peut assurer l'absence totale d'erreurs et décline toute responsabilité quant aux dommages indirects liés à son utilisation.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">5. Propriété intellectuelle</h4>
                    <p className="text-sm text-justify">
                      L'ensemble des contenus et données présents dans l'application est protégé par les lois en vigueur. Toute reproduction, diffusion ou exploitation sans autorisation préalable est interdite.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">6. Modification</h4>
                    <p className="text-sm text-justify">
                      L'éditeur se réserve le droit de modifier ou mettre à jour les présentes CGU et la politique de confidentialité. La version applicable est celle en vigueur au moment de l'utilisation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Politique de Confidentialité */}
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <Shield className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Politique de Confidentialité (Protection des données – RGPD)
                  </h3>
                </div>
                
                <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">1. Responsables du traitement</h4>
                    <p className="text-sm text-justify">
                      Les responsables du traitement sont AS INVESTISSEMENT, NUMELEC, BBSE, QUADRO CAB et JLCR, agissant en qualité de responsables conjoints. Le DPO désigné est MOSLAH Ahlem, joignable au 01 43 08 34 22 ou contact@as-numelec.fr.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">2. Finalités</h4>
                    <p className="text-sm text-justify">
                      Les données collectées servent exclusivement à la gestion administrative et RH, l'établissement des fiches de paie, le suivi des heures de travail et le respect des obligations légales.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">3. Base légale</h4>
                    <p className="text-sm text-justify">
                      Le traitement repose sur l'exécution du contrat de travail et le respect des obligations légales de l'employeur.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">4. Données collectées</h4>
                    <p className="text-sm text-justify">
                      Nom, prénom, date de naissance, date d'embauche, heures de travail enregistrées, ainsi que, le cas échéant, d'autres données nécessaires à la paie et à la gestion RH (ex. RIB, numéro de sécurité sociale).
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">5. Destinataires</h4>
                    <p className="text-sm text-justify">
                      Accès réservé au gérant, assistantes de direction, conducteurs de travaux si nécessaire, services paie/comptabilité/RH et prestataires externes habilités (ex. cabinet comptable, logiciel de paie), tous soumis à confidentialité.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">6. Conservation</h4>
                    <p className="text-sm text-justify">
                      Les données sont conservées pendant 5 ans, sauf obligations légales imposant un délai plus long (ex. 10 ans pour pièces comptables).
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">7. Droits des salariés</h4>
                    <p className="text-sm text-justify">
                      Chaque salarié dispose des droits d'accès, rectification, effacement, limitation, opposition et portabilité, ainsi que du droit de définir le sort de ses données après son décès. Réclamations possibles auprès de la CNIL (www.cnil.fr).
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">8. Exercice des droits</h4>
                    <p className="text-sm text-justify">
                      Demandes à adresser au Service Paie/Comptabilité/RH par e-mail (contact@as-numelec.fr) ou courrier (72 avenue du Chalet – 93360 Neuilly-Plaisance). Réponse sous un mois, prolongeable à trois mois.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">9. Transferts hors UE</h4>
                    <p className="text-sm text-justify">
                      Aucun transfert hors UE n'est effectué. En cas de recours à un prestataire externe situé hors UE, des garanties conformes au RGPD seront appliquées.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">10. Sécurité</h4>
                    <p className="text-sm text-justify">
                      Mesures techniques et organisationnelles mises en place : chiffrement des accès, gestion stricte des habilitations, sauvegardes régulières et règles de confidentialité afin de garantir l'intégrité et la protection des données.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact et informations */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">
                      Contact pour vos droits
                    </h4>
                    <div className="mt-2 text-sm text-blue-700">
                      <p className="text-justify">
                        Pour exercer vos droits ou pour toute question concernant le traitement de vos données personnelles, 
                        contactez le DPO MOSLAH Ahlem au 01 43 08 34 22 ou par e-mail à contact@as-numelec.fr.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer du modal */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCGUModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  J'ai lu et compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notification Permission */}
      {showNotificationModal && (
        <NotificationPermissionModal
          onAccept={() => handleNotificationChoice(true)}
          onRefuse={() => handleNotificationChoice(false)}
        />
      )}
    </div>
  );
};

export default ActivateAccount;