import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ActivationStep1Debug: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const inviteId = searchParams.get('inviteId');
  
  const [step, setStep] = useState(1);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (stepNum: number, success: boolean, message: string, data?: any) => {
    setResults(prev => [...prev, { step: stepNum, success, message, data, timestamp: new Date().toISOString() }]);
  };

  const step1_CheckInvitation = async () => {
    setLoading(true);
    addResult(1, true, 'Début vérification invitation...', { token, inviteId });
    
    try {
      // Vérifier l'invitation directement dans Supabase
      const { data: invitation, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', inviteId)
        .eq('token', token)
        .single();

      if (error) {
        addResult(1, false, `Erreur Supabase: ${error.message}`, error);
        return;
      }

      if (!invitation) {
        addResult(1, false, 'Invitation non trouvée');
        return;
      }

      addResult(1, true, 'Invitation trouvée avec succès', {
        email: invitation.email,
        status: invitation.status,
        expires_at: invitation.expires_at,
        employee_data: invitation.employee_data
      });

      // Vérifier si expirée
      if (new Date(invitation.expires_at) < new Date()) {
        addResult(1, false, 'Invitation expirée');
        return;
      }

      addResult(1, true, 'Invitation valide et non expirée');
      setStep(2);
      
    } catch (err: any) {
      addResult(1, false, `Exception: ${err.message}`, err);
    } finally {
      setLoading(false);
    }
  };

  const step2_CheckTables = async () => {
    setLoading(true);
    addResult(2, true, 'Début vérification structure des tables...');
    
    try {
      // Vérifier la structure de la table users
      const { data: usersColumns, error: usersError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'users')
        .eq('table_schema', 'public');

      if (usersError) {
        addResult(2, false, `Erreur vérification table users: ${usersError.message}`);
        return;
      }

      addResult(2, true, 'Structure table users récupérée', usersColumns);

      // Vérifier la structure de la table employees
      const { data: employeesColumns, error: employeesError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'employees')
        .eq('table_schema', 'public');

      if (employeesError) {
        addResult(2, false, `Erreur vérification table employees: ${employeesError.message}`);
        return;
      }

      addResult(2, true, 'Structure table employees récupérée', employeesColumns);

      // Vérifier la structure de la table user_agreements
      const { data: agreementsColumns, error: agreementsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'user_agreements')
        .eq('table_schema', 'public');

      if (agreementsError) {
        addResult(2, false, `Erreur vérification table user_agreements: ${agreementsError.message}`);
        return;
      }

      addResult(2, true, 'Structure table user_agreements récupérée', agreementsColumns);

      setStep(3);
      
    } catch (err: any) {
      addResult(2, false, `Exception: ${err.message}`, err);
    } finally {
      setLoading(false);
    }
  };

  const step3_TestDirectInsert = async () => {
    setLoading(true);
    addResult(3, true, 'Test insertion directe dans les tables...');
    
    try {
      const testUserId = '1139048a-1a50-4b14-bd5f-1881d79db808';
      const testEmail = 'as.investissement.app@gmail.com';
      
      // Test 1: Insertion dans users
      addResult(3, true, 'Test insertion table users...');
      const { data: userInsert, error: userError } = await supabase
        .from('users')
        .upsert({
          id: testUserId,
          email: testEmail,
          name: 'Test User',
          role: 'employee',
          department: 'Ouvrier',
          company_id: '550e8400-e29b-41d4-a716-446655440012',
          birth_date: '1987-10-09',
          hire_date: '2025-09-06',
          status: 'active',
          archived: false
        }, { onConflict: 'id' })
        .select()
        .single();

      if (userError) {
        addResult(3, false, `Erreur insertion users: ${userError.message}`, userError);
        return;
      }

      addResult(3, true, 'Insertion users réussie', userInsert);

      // Test 2: Insertion dans employees
      addResult(3, true, 'Test insertion table employees...');
      const { data: employeeInsert, error: employeeError } = await supabase
        .from('employees')
        .upsert({
          user_id: testUserId,
          first_name: 'Test',
          last_name: 'User',
          birth_date: '1987-10-09',
          hire_date: '2025-09-06',
          position: 'Ouvrier',
          status: 'active'
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (employeeError) {
        addResult(3, false, `Erreur insertion employees: ${employeeError.message}`, employeeError);
        return;
      }

      addResult(3, true, 'Insertion employees réussie', employeeInsert);

      setStep(4);
      
    } catch (err: any) {
      addResult(3, false, `Exception: ${err.message}`, err);
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
            <h1 className="text-2xl font-bold text-gray-900">🔧 Diagnostic activation - Étape par étape</h1>
            <p className="text-gray-600">Diagnostiquer pourquoi l'activation ne fonctionne pas</p>
          </div>
        </div>

        {/* Paramètres reçus */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-800 mb-2">Paramètres reçus</h3>
          <div className="space-y-1 text-sm">
            <p><strong>Token:</strong> {token || 'MANQUANT'}</p>
            <p><strong>Invite ID:</strong> {inviteId || 'MANQUANT'}</p>
            <p><strong>Platform:</strong> web</p>
          </div>
        </div>

        {/* Étapes */}
        <div className="space-y-4">
          {/* Étape 1 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">
                Étape 1: Vérifier l'invitation
              </h3>
              <button
                onClick={step1_CheckInvitation}
                disabled={loading || step > 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {step === 1 && loading ? 'En cours...' : 'Tester'}
              </button>
            </div>
            {step >= 1 && (
              <div className="text-sm text-gray-600">
                Vérifier que l'invitation existe et est valide dans Supabase
              </div>
            )}
          </div>

          {/* Étape 2 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">
                Étape 2: Vérifier la structure des tables
              </h3>
              <button
                onClick={step2_CheckTables}
                disabled={loading || step !== 2}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {step === 2 && loading ? 'En cours...' : 'Tester'}
              </button>
            </div>
            {step >= 2 && (
              <div className="text-sm text-gray-600">
                Vérifier que toutes les colonnes et contraintes existent
              </div>
            )}
          </div>

          {/* Étape 3 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">
                Étape 3: Test insertion directe
              </h3>
              <button
                onClick={step3_TestDirectInsert}
                disabled={loading || step !== 3}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {step === 3 && loading ? 'En cours...' : 'Tester'}
              </button>
            </div>
            {step >= 3 && (
              <div className="text-sm text-gray-600">
                Tester l'insertion directe dans chaque table
              </div>
            )}
          </div>
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Résultats des tests</h3>
            
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="flex items-start space-x-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      Étape {result.step}: {result.message}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString('fr-FR')}
                    </div>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer">Voir les données</summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
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

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                🎯 Diagnostic étape par étape
              </h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>Étape 1:</strong> Vérifier que l'invitation existe et est valide</p>
                <p><strong>Étape 2:</strong> Vérifier la structure des tables (colonnes, contraintes)</p>
                <p><strong>Étape 3:</strong> Tester l'insertion directe dans chaque table</p>
                <p className="mt-2 text-xs">
                  ⚠️ Cliquez sur chaque étape dans l'ordre pour identifier le problème exact
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivationStep1Debug;