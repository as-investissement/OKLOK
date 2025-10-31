import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Search, CheckCircle, XCircle, AlertTriangle, Eye, RefreshCw, Bug } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface TableData {
  users: any[];
  user_agreements: any[];
  activation_log: any[];
  user_invitations: any[];
}

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
}

const ActivationDebug: React.FC = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<TableData>({
    users: [],
    user_agreements: [],
    activation_log: [],
    user_invitations: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const loadTableData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 === CHARGEMENT DONNÉES TABLES ===');
      
      // Charger les données de toutes les tables importantes
      const [usersResult, agreementsResult, activationResult, invitationsResult] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('user_agreements').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('activation_log').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('user_invitations').select('*').order('created_at', { ascending: false }).limit(10)
      ]);

      if (usersResult.error) throw new Error(`Erreur users: ${usersResult.error.message}`);
      if (agreementsResult.error) throw new Error(`Erreur agreements: ${agreementsResult.error.message}`);
      if (activationResult.error) throw new Error(`Erreur activation: ${activationResult.error.message}`);
      if (invitationsResult.error) throw new Error(`Erreur invitations: ${invitationsResult.error.message}`);

      setTableData({
        users: usersResult.data || [],
        user_agreements: agreementsResult.data || [],
        activation_log: activationResult.data || [],
        user_invitations: invitationsResult.data || []
      });

      console.log('✅ Données chargées:', {
        users: usersResult.data?.length || 0,
        agreements: agreementsResult.data?.length || 0,
        activationLog: activationResult.data?.length || 0,
        invitations: invitationsResult.data?.length || 0
      });
      
    } catch (err: any) {
      console.error('❌ Erreur chargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testActivationFunction = async (userId: string) => {
    try {
      setTestResults([]);
      
      // Trouver l'utilisateur
      const user = tableData.users.find(u => u.id === userId);
      if (!user) {
        setTestResults([{
          step: 'Recherche utilisateur',
          success: false,
          error: 'Utilisateur non trouvé'
        }]);
        return;
      }

      // Trouver l'invitation correspondante
      const invitation = tableData.user_invitations.find(inv => inv.email === user.email);
      if (!invitation) {
        setTestResults([{
          step: 'Recherche invitation',
          success: false,
          error: 'Invitation non trouvée pour cet email'
        }]);
        return;
      }

      const results: TestResult[] = [];

      // Test 1: Vérifier l'état initial
      results.push({
        step: '1. État initial',
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
          invitationId: invitation.id,
          invitationToken: invitation.token
        }
      });

      // Test 2: Tester l'Edge Function directement
      console.log('🧪 Test Edge Function activate-user...');
      
      const activationResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteId: invitation.id,
          token: invitation.token,
          password: 'TestPassword123!'
        })
      });

      const activationResult = await activationResponse.json();
      
      results.push({
        step: '2. Test Edge Function',
        success: activationResponse.ok,
        data: activationResult,
        error: activationResponse.ok ? undefined : `Status ${activationResponse.status}: ${JSON.stringify(activationResult)}`
      });

      // Test 3: Vérifier les accords après activation
      const { data: agreementsAfter, error: agreementsError } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', userId);

      results.push({
        step: '3. Vérification accords après activation',
        success: !agreementsError && (agreementsAfter?.length || 0) >= 3,
        data: {
          count: agreementsAfter?.length || 0,
          agreements: agreementsAfter || []
        },
        error: agreementsError?.message
      });

      // Test 4: Vérifier le log d'activation
      const { data: activationLogAfter, error: logError } = await supabase
        .from('activation_log')
        .select('*')
        .eq('user_id', userId);

      results.push({
        step: '4. Vérification log d\'activation',
        success: !logError && (activationLogAfter?.length || 0) > 0,
        data: {
          count: activationLogAfter?.length || 0,
          logs: activationLogAfter || []
        },
        error: logError?.message
      });

      setTestResults(results);
      
      // Recharger les données des tables
      await loadTableData();
      
    } catch (err: any) {
      console.error('❌ Erreur test activation:', err);
      setTestResults([{
        step: 'Test activation',
        success: false,
        error: err.message
      }]);
    }
  };

  const testDirectInsert = async (userId: string) => {
    try {
      console.log('🧪 === TEST INSERTION DIRECTE ===');
      
      const results: TestResult[] = [];
      
      // Test 1: Insertion directe dans user_agreements
      console.log('📝 Test insertion user_agreements...');
      
      const { data: insertAgreement, error: agreementError } = await supabase
        .from('user_agreements')
        .insert({
          user_id: userId,
          agreement_type: 'terms_of_service',
          accepted_at: new Date().toISOString(),
          ip_address: 'test-ip',
          user_agent: 'test-browser'
        })
        .select()
        .single();

      results.push({
        step: 'Test insertion user_agreements',
        success: !agreementError,
        data: insertAgreement,
        error: agreementError?.message,
        details: agreementError ? `Code: ${agreementError.code}, Détails: ${agreementError.details}` : undefined
      });

      // Test 2: Insertion directe dans activation_log
      console.log('📝 Test insertion activation_log...');
      
      const { data: insertLog, error: logError } = await supabase
        .from('activation_log')
        .insert({
          user_id: userId,
          activated_at: new Date().toISOString(),
          activation_type: 'account_activation'
        })
        .select()
        .single();

      results.push({
        step: 'Test insertion activation_log',
        success: !logError,
        data: insertLog,
        error: logError?.message,
        details: logError ? `Code: ${logError.code}, Détails: ${logError.details}` : undefined
      });

      setTestResults(results);
      
      // Recharger les données
      await loadTableData();
      
    } catch (err: any) {
      console.error('❌ Erreur test insertion:', err);
      setTestResults([{
        step: 'Test insertion directe',
        success: false,
        error: err.message
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate('/')}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔧 Diagnostic d'activation</h1>
            <p className="text-gray-600">Diagnostiquer pourquoi les tables ne se mettent pas à jour</p>
          </div>
        </div>

        {/* Boutons de contrôle */}
        <div className="mb-6 flex items-center space-x-3">
          <button
            onClick={loadTableData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Database size={16} className="mr-2" />
            {loading ? 'Chargement...' : 'Charger les données'}
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw size={16} className="mr-2" />
            Actualiser la page
          </button>
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
        {testResults.length > 0 && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Résultats des tests</h3>
            
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start space-x-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{result.step}</div>
                    {result.error && (
                      <div className="text-sm text-red-600 mt-1">{result.error}</div>
                    )}
                    {result.details && (
                      <div className="text-xs text-gray-500 mt-1">{result.details}</div>
                    )}
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer">Voir les données</summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sélection d'utilisateur pour test */}
        {tableData.users.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-800 mb-4">🧪 Tester l'activation</h3>
            
            <div className="flex items-center space-x-3">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Sélectionner un utilisateur</option>
                {tableData.users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || 'Nom manquant'} - {user.email || 'Email manquant'} - {user.role || 'Rôle manquant'}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => testActivationFunction(selectedUserId)}
                disabled={!selectedUserId}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Bug size={16} className="mr-2" />
                Tester activation
              </button>
              
              <button
                onClick={() => testDirectInsert(selectedUserId)}
                disabled={!selectedUserId}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                <Database size={16} className="mr-2" />
                Test insertion directe
              </button>
            </div>
          </div>
        )}

        {/* Affichage des tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table users */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">
                👥 Table users ({tableData.users.length})
              </h2>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {tableData.users.length > 0 ? (
                <div className="space-y-3">
                  {tableData.users.map(user => (
                    <div key={user.id} className="bg-gray-50 rounded p-3 border">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="text-xs text-gray-500">ID: {user.id}</div>
                      <div className="text-xs text-gray-500">Rôle: {user.role}</div>
                      <div className="text-xs text-gray-500">Créé: {new Date(user.created_at).toLocaleString('fr-FR')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucun utilisateur trouvé</p>
              )}
            </div>
          </div>

          {/* Table user_agreements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">
                📝 Table user_agreements ({tableData.user_agreements.length})
              </h2>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {tableData.user_agreements.length > 0 ? (
                <div className="space-y-3">
                  {tableData.user_agreements.map(agreement => {
                    const user = tableData.users.find(u => u.id === agreement.user_id);
                    return (
                      <div key={agreement.id} className="bg-gray-50 rounded p-3 border">
                        <div className="font-medium text-gray-900">
                          {user?.name || 'Utilisateur inconnu'}
                        </div>
                        <div className="text-sm text-gray-600">Type: {agreement.agreement_type}</div>
                        <div className="text-xs text-gray-500">User ID: {agreement.user_id}</div>
                        <div className="text-xs text-gray-500">Accepté: {new Date(agreement.accepted_at).toLocaleString('fr-FR')}</div>
                        <div className="text-xs text-gray-500">IP: {agreement.ip_address}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-red-500 text-center py-4 font-medium">❌ Aucun accord trouvé !</p>
              )}
            </div>
          </div>

          {/* Table activation_log */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">
                📋 Table activation_log ({tableData.activation_log.length})
              </h2>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {tableData.activation_log.length > 0 ? (
                <div className="space-y-3">
                  {tableData.activation_log.map(log => {
                    const user = tableData.users.find(u => u.id === log.user_id);
                    return (
                      <div key={log.id} className="bg-gray-50 rounded p-3 border">
                        <div className="font-medium text-gray-900">
                          {user?.name || 'Utilisateur inconnu'}
                        </div>
                        <div className="text-sm text-gray-600">Type: {log.activation_type}</div>
                        <div className="text-xs text-gray-500">User ID: {log.user_id}</div>
                        <div className="text-xs text-gray-500">Activé: {new Date(log.activated_at).toLocaleString('fr-FR')}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-red-500 text-center py-4 font-medium">❌ Aucun log d'activation trouvé !</p>
              )}
            </div>
          </div>

          {/* Table user_invitations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">
                ✉️ Table user_invitations ({tableData.user_invitations.length})
              </h2>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {tableData.user_invitations.length > 0 ? (
                <div className="space-y-3">
                  {tableData.user_invitations.map(invitation => (
                    <div key={invitation.id} className="bg-gray-50 rounded p-3 border">
                      <div className="font-medium text-gray-900">{invitation.employee_data?.name}</div>
                      <div className="text-sm text-gray-600">{invitation.email}</div>
                      <div className="text-xs text-gray-500">ID: {invitation.id}</div>
                      <div className="text-xs text-gray-500">Token: {invitation.token}</div>
                      <div className="text-xs text-gray-500">Statut: {invitation.status}</div>
                      <div className="text-xs text-gray-500">Expire: {new Date(invitation.expires_at).toLocaleString('fr-FR')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucune invitation trouvée</p>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                🔍 Comment utiliser cette page de diagnostic
              </h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>1. Charger les données</strong> pour voir l'état actuel des tables</p>
                <p><strong>2. Sélectionner un utilisateur</strong> dans la liste</p>
                <p><strong>3. Tester l'activation</strong> pour voir si l'Edge Function fonctionne</p>
                <p><strong>4. Test insertion directe</strong> pour vérifier les permissions sur les tables</p>
                <p><strong>5. Vérifier les résultats</strong> dans les tables après chaque test</p>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic automatique */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            🎯 Diagnostic automatique
          </h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• <strong>Table users :</strong> {tableData.users.length} utilisateur(s) trouvé(s)</p>
            <p>• <strong>Table user_agreements :</strong> {tableData.user_agreements.length} accord(s) trouvé(s) 
              {tableData.user_agreements.length === 0 && <span className="text-red-600 font-bold"> ❌ PROBLÈME ICI</span>}
            </p>
            <p>• <strong>Table activation_log :</strong> {tableData.activation_log.length} log(s) trouvé(s)
              {tableData.activation_log.length === 0 && <span className="text-red-600 font-bold"> ❌ PROBLÈME ICI</span>}
            </p>
            <p>• <strong>Table user_invitations :</strong> {tableData.user_invitations.length} invitation(s) trouvée(s)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivationDebug;