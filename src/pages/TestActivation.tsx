import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { sendInvitationAlt } from '../lib/invitations';
import { useAuth } from '../context/AuthContext';

interface InvitationData {
  id: string;
  email: string;
  token: string;
  employee_data: any;
  company_id: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const TestActivation: React.FC = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [showNoInvitationsMessage, setShowNoInvitationsMessage] = useState(false);

  const loadInvitations = async () => {
    try {
      console.log('🔍 === DÉBUT CHARGEMENT INVITATIONS ===');
      console.log('🔧 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('🔧 Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Définie' : 'MANQUANTE');
      
      setLoading(true);
      setError('');
      
      console.log('🔍 Chargement de toutes les invitations...');
      
      // Utiliser l'Edge Function pour contourner RLS
      console.log('🔍 Utilisation Edge Function pour contourner RLS...');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Ajouter l'autorisation seulement si une session existe
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('✅ Session utilisateur trouvée:', session.user.email);
      } else {
        console.log('⚠️ Pas de session - utilisation sans autorisation');
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-invitations`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur Edge Function:', errorText);
        setError(`Erreur Edge Function (${response.status}): ${errorText}`);
        return;
      }
      
      const result = await response.json();
      console.log('✅ Réponse Edge Function:', result);
      
      const data = result.invitations || [];

      console.log('✅ Invitations trouvées:', data?.length || 0);
      setInvitations(data || []);
      
      if (!data || data.length === 0) {
        setShowNoInvitationsMessage(true);
      } else {
        setShowNoInvitationsMessage(false);
      }
      
    } catch (err) {
      console.error('❌ Exception:', err);
      setError(`Erreur de connexion à Supabase: ${err.message}`);
    } finally {
      console.log('🏁 Fin du chargement, loading = false');
      console.log('🏁 Fin du chargement, loading = false');
      setLoading(false);
    }
  };

  const createTestInvitation = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🧪 === CRÉATION INVITATION DE TEST ===');
      console.log('👤 Session utilisateur:', session?.user?.email || 'Non connecté');
      console.log('🔑 Token session:', session?.access_token ? 'Présent' : 'Manquant');
      
      // Appeler directement l'Edge Function invite-user-auth
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Ajouter l'autorisation seulement si une session existe
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user-auth`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`, // Email unique pour éviter les doublons
          employeeData: {
            name: `Test UTILISATEUR ${new Date().getHours()}h${new Date().getMinutes()}`,
            department: 'Ouvrier',
            position: 'employee',
            hire_date: new Date().toISOString().split('T')[0]
          },
          companyId: '550e8400-e29b-41d4-a716-446655440011'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur Edge Function:', errorText);
        setError(`Erreur Edge Function (${response.status}): ${errorText}`);
        return;
      }
      
      const result = await response.json();
      
      console.log('✅ === INVITATION DE TEST CRÉÉE ===');
      console.log('📧 Email ID Resend:', result.emailId);
      console.log('🔑 Token généré:', result.token);
      console.log('📋 Invite ID généré:', result.inviteId);
      console.log('🔗 URL d\'activation:', result.activationUrl);
      
      // Afficher un message de succès avec les détails
      alert(`✅ INVITATION DE TEST CRÉÉE !\n\n` +
            `📧 Email: test-${Date.now()}@example.com\n` +
            `🔑 Token: ${result.token}\n` +
            `📋 Invite ID: ${result.inviteId}\n` +
            `📨 Email ID Resend: ${result.emailId}\n\n` +
            `➡️ Rechargement de la liste...`);
      
      // Recharger les invitations
      await loadInvitations();
      
    } catch (err) {
      console.error('❌ Exception création invitation test:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testActivation = async (invitation: InvitationData) => {
    try {
      setTestResults(null);
      console.log('🧪 Test d\'activation pour:', invitation.email);
      
      // Construire l'URL de test
      const testUrl = `/activate-account?token=${invitation.token}&inviteId=${invitation.id}&platform=web`;
      console.log('🔗 URL de test:', testUrl);
      
      // Tester l'Edge Function directement
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteId: invitation.id,
          token: invitation.token,
          password: 'TestPassword123!'
        })
      });

      const result = await response.json();
      
      setTestResults({
        status: response.status,
        success: response.ok,
        data: result,
        invitation: invitation
      });
      
      console.log('🧪 Résultat test:', result);
      
    } catch (err) {
      console.error('❌ Erreur test:', err);
      setTestResults({
        status: 500,
        success: false,
        error: err.message,
        invitation: invitation
      });
    }
  };

  const generateActivationLink = (invitation: InvitationData) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/activate-account?token=${invitation.token}&inviteId=${invitation.id}&platform=web`;
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
            <h1 className="text-2xl font-bold text-gray-900">Test d'activation des comptes</h1>
            <p className="text-gray-600">Diagnostiquer et tester les liens d'activation</p>
          </div>
        </div>

        {/* Bouton pour charger les invitations */}
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={loadInvitations}
              disabled={loading || !session}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Database size={16} className="mr-2" />
              {loading ? 'Chargement...' : 'Charger les invitations'}
            </button>
            
            <button
              onClick={createTestInvitation}
              disabled={loading || !session}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertTriangle size={16} className="mr-2" />
              Créer invitation test
            </button>
          </div>
          
          {!session ? (
            <p className="mt-2 text-sm text-red-600">
              ⚠️ Vous devez être connecté pour utiliser cette page de test.
            </p>
          ) : (
            <p className="mt-2 text-sm text-blue-600">
              💡 Cette page de test fonctionne avec votre session utilisateur.
            </p>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Résultats de test */}
        {testResults && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Résultat du test</h3>
            
            <div className="space-y-3">
              <div className="flex items-center">
                {testResults.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <span className={`font-medium ${testResults.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResults.success ? 'Test réussi !' : 'Test échoué'}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  (Status: {testResults.status})
                </span>
              </div>
              
              <div className="bg-white rounded p-3 border">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(testResults.data, null, 2)}
                </pre>
              </div>
              
              {testResults.success && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      const url = generateActivationLink(testResults.invitation);
                      window.open(url, '_blank');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                  >
                    🎯 Ouvrir le lien d'activation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message quand aucune invitation */}
        {showNoInvitationsMessage && !loading && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-800 mb-2">
                Aucune invitation trouvée
              </h3>
              <p className="text-yellow-700 mb-4">
                Il n'y a actuellement aucune invitation en base de données.
              </p>
              <button
                onClick={createTestInvitation}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <AlertTriangle size={16} className="mr-2" />
                Créer une invitation de test
              </button>
            </div>
          </div>
        )}

        {/* Liste des invitations */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">
                Invitations trouvées ({invitations.length})
              </h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invitation.employee_data?.name || 'Nom manquant'}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invitation.status}
                        </span>
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        <div className="text-sm text-gray-600">
                          <strong>Email:</strong> {invitation.email}
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>ID:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{invitation.id}</code>
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Token:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{invitation.token}</code>
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Expire:</strong> {new Date(invitation.expires_at).toLocaleString('fr-FR')}
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Créé:</strong> {new Date(invitation.created_at).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => testActivation(invitation)}
                        className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        🧪 Tester l'activation
                      </button>
                      
                      <button
                        onClick={() => {
                          const url = generateActivationLink(invitation);
                          window.open(url, '_blank');
                        }}
                        className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                      >
                        🔗 Ouvrir le lien
                      </button>
                      
                      <button
                        onClick={() => {
                          const url = generateActivationLink(invitation);
                          navigator.clipboard.writeText(url);
                          alert('Lien copié !');
                        }}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        📋 Copier le lien
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message d'aide */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Comment utiliser cette page de test
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  1. <strong>Charger les invitations</strong> pour voir toutes les invitations en base<br/>
                  2. <strong>Tester l'activation</strong> pour vérifier si l'Edge Function fonctionne<br/>
                  3. <strong>Ouvrir le lien</strong> pour tester le workflow complet<br/>
                  4. <strong>Copier le lien</strong> pour l'utiliser ailleurs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestActivation;