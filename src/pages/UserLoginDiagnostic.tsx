import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Search, CheckCircle, XCircle, AlertTriangle, User, Key, Mail } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface DiagnosticResult {
  test: string;
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
}

const UserLoginDiagnostic: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [email, setEmail] = useState('halouma93360@gmail.com');
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, success: boolean, data?: any, error?: string, details?: string) => {
    setResults(prev => [...prev, { test, success, data, error, details }]);
  };

  const runDiagnostic = async () => {
    setResults([]);
    setLoading(true);

    try {
      console.log('🔍 === DIAGNOSTIC UTILISATEUR ===');
      console.log('📧 Email à diagnostiquer:', email);

      // Test 0: Vérifier la colonne auth_id dans users
      addResult('0. Vérification colonne auth_id', true, null, null, 'Vérification en cours...');
      
      try {
        const { data: authIdCheck, error: authIdError } = await supabase
          .from('users')
          .select('id, email, name, auth_id')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (authIdError) {
          addResult('0. Vérification colonne auth_id', false, null, authIdError.message);
        } else if (!authIdCheck) {
          addResult('0. Vérification colonne auth_id', false, null, 'Utilisateur non trouvé dans users');
        } else {
          addResult('0. Vérification colonne auth_id', true, {
            user_id: authIdCheck.id,
            email: authIdCheck.email,
            name: authIdCheck.name,
            auth_id: authIdCheck.auth_id,
            has_auth_id: !!authIdCheck.auth_id
          }, null, `auth_id: ${authIdCheck.auth_id ? 'PRÉSENT' : 'MANQUANT'}`);
        }
      } catch (authIdException) {
        addResult('0. Vérification colonne auth_id', false, null, authIdException.message);
      }

      // Test 1: Vérifier dans la table users
      addResult('1. Recherche dans table users', true, null, null, 'Recherche en cours...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (userError) {
        addResult('1. Recherche dans table users', false, null, userError.message);
        return;
      }

      if (!userData) {
        addResult('1. Recherche dans table users', false, null, 'Utilisateur non trouvé dans la table users');
        return;
      }

      addResult('1. Recherche dans table users', true, {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        status: userData.status,
        company_id: userData.company_id,
        archived: userData.archived
      }, null, `Utilisateur trouvé: ${userData.name}`);

      // Test 2: Vérifier dans le système d'authentification Supabase
      addResult('2. Recherche dans auth.users', true, null, null, 'Recherche en cours...');
      
      if (!isAdmin) {
        addResult('2. Recherche dans auth.users', false, null, 'Privilèges administrateur requis pour cette vérification');
      } else {
        try {
          const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
          
          if (authError) {
            addResult('2. Recherche dans auth.users', false, null, authError.message);
          } else {
            const authUser = authUsers.users.find(u => u.email === email.toLowerCase());
            
            if (!authUser) {
              addResult('2. Recherche dans auth.users', false, null, 'Utilisateur non trouvé dans le système d\'authentification');
            } else {
              addResult('2. Recherche dans auth.users', true, {
                id: authUser.id,
                email: authUser.email,
                email_confirmed_at: authUser.email_confirmed_at,
                last_sign_in_at: authUser.last_sign_in_at,
                created_at: authUser.created_at,
                user_metadata: authUser.user_metadata
              }, null, `Utilisateur auth trouvé: ${authUser.id}`);
            }
          }
        } catch (authException) {
          addResult('2. Recherche dans auth.users', false, null, authException.message);
        }
      }

      // Test 3: Vérifier les invitations
      addResult('3. Recherche invitations', true, null, null, 'Recherche en cours...');
      
      const { data: invitationData, error: invitationError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('email', email.toLowerCase())
        .order('created_at', { ascending: false });

      if (invitationError) {
        addResult('3. Recherche invitations', false, null, invitationError.message);
      } else {
        addResult('3. Recherche invitations', true, {
          count: invitationData?.length || 0,
          invitations: invitationData?.map(inv => ({
            id: inv.id,
            status: inv.status,
            expires_at: inv.expires_at,
            accepted_at: inv.accepted_at,
            created_at: inv.created_at
          })) || []
        }, null, `${invitationData?.length || 0} invitation(s) trouvée(s)`);
      }

      // Test 4: Vérifier les accords utilisateur
      if (userData) {
        addResult('4. Recherche accords utilisateur', true, null, null, 'Recherche en cours...');
        
        const { data: agreementsData, error: agreementsError } = await supabase
          .from('user_agreements')
          .select('*')
          .eq('user_id', userData.id);

        if (agreementsError) {
          addResult('4. Recherche accords utilisateur', false, null, agreementsError.message);
        } else {
          addResult('4. Recherche accords utilisateur', true, {
            count: agreementsData?.length || 0,
            agreements: agreementsData?.map(agr => ({
              agreement_type: agr.agreement_type,
              accepted_at: agr.accepted_at
            })) || []
          }, null, `${agreementsData?.length || 0} accord(s) trouvé(s)`);
        }
      }

      // Test 5: Vérification du statut de connexion (sans test de mot de passe)
      addResult('5. Statut de connexion', true, null, null, 'Test de connexion avec mot de passe ignoré - nécessite le vrai mot de passe');

      // Test 6: Vérifier les logs d'activation
      if (userData) {
        addResult('6. Recherche logs activation', true, null, null, 'Recherche en cours...');
        
        const { data: activationData, error: activationError } = await supabase
          .from('activation_log')
          .select('*')
          .eq('user_id', userData.id);

        if (activationError) {
          addResult('6. Recherche logs activation', false, null, activationError.message);
        } else {
          addResult('6. Recherche logs activation', true, {
            count: activationData?.length || 0,
            logs: activationData?.map(log => ({
              activation_type: log.activation_type,
              activated_at: log.activated_at
            })) || []
          }, null, `${activationData?.length || 0} log(s) d'activation trouvé(s)`);
        }
      }

    } catch (error) {
      addResult('Diagnostic général', false, null, error.message);
    } finally {
      setLoading(false);
    }
  };

  const createUserAccount = async () => {
    try {
      setLoading(true);
      
      if (!isAdmin) {
        addResult('Création compte auth', false, null, 'Privilèges administrateur requis');
        return;
      }
      
      console.log('🚀 === CRÉATION COMPTE UTILISATEUR ===');
      
      // Créer l'utilisateur dans le système d'authentification
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: 'TempPassword123!',
        email_confirm: true
      });

      if (authError) {
        addResult('Création compte auth', false, null, authError.message);
        return;
      }

      addResult('Création compte auth', true, {
        user_id: authData.user?.id,
        email: authData.user?.email
      }, null, 'Compte auth créé avec succès');

      // Recharger le diagnostic
      await runDiagnostic();
      
    } catch (error) {
      addResult('Création compte', false, null, error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetUserPassword = async () => {
    try {
      setLoading(true);
      
      if (!isAdmin) {
        addResult('Reset mot de passe', false, null, 'Privilèges administrateur requis');
        return;
      }
      
      console.log('🔐 === RESET MOT DE PASSE ===');
      
      // Trouver l'utilisateur dans auth
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        addResult('Reset mot de passe', false, null, listError.message);
        return;
      }

      const authUser = authUsers.users.find(u => u.email === email.toLowerCase());
      
      if (!authUser) {
        addResult('Reset mot de passe', false, null, 'Utilisateur non trouvé dans auth');
        return;
      }

      // Réinitialiser le mot de passe
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        { password: 'NewPassword123!' }
      );

      if (updateError) {
        addResult('Reset mot de passe', false, null, updateError.message);
        return;
      }

      addResult('Reset mot de passe', true, {
        new_password: 'NewPassword123!'
      }, null, 'Mot de passe réinitialisé avec succès');

      // Recharger le diagnostic
      await runDiagnostic();
      
    } catch (error) {
      addResult('Reset mot de passe', false, null, error.message);
    } finally {
      setLoading(false);
    }
  };

  const fixUserAuth = async () => {
    try {
      setLoading(true);
      console.log('🔧 === RÉPARATION AUTH UTILISATEUR ===');
      
      // Appeler l'Edge Function pour réparer l'auth
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-user-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: 'TempPassword123!' // Mot de passe temporaire
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        addResult('Réparation auth', false, null, errorData.error || 'Erreur inconnue');
        return;
      }

      const result = await response.json();
      addResult('Réparation auth', true, result, null, `Action: ${result.action}`);

      // Recharger le diagnostic
      await runDiagnostic();
      
    } catch (error) {
      addResult('Réparation auth', false, null, error.message);
    } finally {
      setLoading(false);
    }
  };

  const syncAuthId = async () => {
    try {
      setLoading(true);
      console.log('🔧 === SYNCHRONISATION AUTH_ID ===');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-auth-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        addResult('Synchronisation auth_id', false, null, errorData.error || 'Erreur inconnue');
        return;
      }

      const result = await response.json();
      addResult('Synchronisation auth_id', true, result, null, `auth_id synchronisé: ${result.auth_id}`);

      // Recharger le diagnostic
      await runDiagnostic();
      
    } catch (error) {
      addResult('Synchronisation auth_id', false, null, error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate('/')}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔍 Diagnostic utilisateur</h1>
            <p className="text-gray-600">Analyser pourquoi un utilisateur ne peut pas se connecter</p>
          </div>
        </div>

        {/* Saisie email */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-800 mb-4">👤 Utilisateur à diagnostiquer</h3>
          
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@exemple.com"
              />
            </div>
            
            <button
              onClick={runDiagnostic}
              disabled={loading || !email}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Search size={16} className="mr-2" />
              {loading ? 'Diagnostic...' : 'Diagnostiquer'}
            </button>
          </div>
        </div>

        {/* Actions de réparation */}
        {results.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-800 mb-4">🔧 Actions de réparation</h3>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={createUserAccount}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <User size={16} className="mr-2" />
                Créer compte auth
              </button>
              
              <button
                onClick={resetUserPassword}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              >
                <Key size={16} className="mr-2" />
                Reset mot de passe
              </button>
              
              <button
                onClick={fixUserAuth}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                <Database size={16} className="mr-2" />
                Réparer Auth
              </button>
              
              <button
                onClick={syncAuthId}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <Database size={16} className="mr-2" />
                Sync auth_id
              </button>
            </div>
          </div>
        )}

        {/* Résultats */}
        {results.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">📊 Résultats du diagnostic</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {results.map((result, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-start space-x-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{result.test}</div>
                      {result.error && (
                        <div className="text-sm text-red-600 mt-1">{result.error}</div>
                      )}
                      {result.details && (
                        <div className="text-sm text-blue-600 mt-1">{result.details}</div>
                      )}
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer">Voir les données</summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-gray-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-2">
                🎯 Ce diagnostic va vérifier
              </h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>1.</strong> Si l'utilisateur existe dans la table `users`</p>
                <p><strong>2.</strong> Si l'utilisateur existe dans le système d'authentification Supabase (admin requis)</p>
                <p><strong>3.</strong> Si des invitations ont été envoyées</p>
                <p><strong>4.</strong> Si les accords ont été acceptés</p>
                <p><strong>5.</strong> Statut de connexion (sans test de mot de passe)</p>
                <p><strong>6.</strong> Si l'activation a été enregistrée</p>
              </div>
            </div>
          </div>
        </div>

        {/* Avertissement admin */}
        {!isAdmin && (
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-2">
                  ⚠️ Privilèges limités
                </h3>
                <p className="text-sm text-orange-700">
                  Certaines vérifications nécessitent des privilèges administrateur. 
                  Connectez-vous en tant qu'admin pour accéder à toutes les fonctionnalités de diagnostic.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Problèmes courants */}
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">
            🚨 Problèmes courants de connexion
          </h3>
          <div className="text-sm text-red-700 space-y-1">
            <p><strong>• Utilisateur dans table users mais pas dans auth :</strong> Compte non activé</p>
            <p><strong>• Utilisateur dans auth mais pas dans table users :</strong> Données manquantes</p>
            <p><strong>• Invalid credentials :</strong> Mauvais mot de passe ou email</p>
            <p><strong>• Email not confirmed :</strong> Email non confirmé</p>
            <p><strong>• User not found :</strong> Compte inexistant</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLoginDiagnostic;