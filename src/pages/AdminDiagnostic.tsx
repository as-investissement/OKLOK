import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, CheckCircle, XCircle, AlertTriangle, User, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getUsersWithoutAuthId } from '../lib/getUsersWithoutAuthId';

interface DiagnosticResult {
  test: string;
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
}

const AdminDiagnostic: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, user, session, isAdmin } = useAuth();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, success: boolean, data?: any, error?: string, details?: string) => {
    setResults(prev => [...prev, { test, success, data, error, details }]);
  };

  const runDiagnostic = async () => {
    setResults([]);
    setLoading(true);

    try {
      // Test 0: Vérifier les utilisateurs sans auth_id
      try {
        const usersWithoutAuthId = await getUsersWithoutAuthId();

        addResult('0. Utilisateurs sans auth_id', true, {
          count: usersWithoutAuthId?.length || 0,
          users: usersWithoutAuthId || []
        }, undefined, `${usersWithoutAuthId?.length || 0} utilisateur(s) sans auth_id trouvé(s)`);
      } catch (err) {
        addResult('0. Utilisateurs sans auth_id', false, null, err.message);
      }

      // Test 1: Vérifier la session utilisateur
      addResult('1. Session utilisateur', !!session, {
        hasSession: !!session,
        userEmail: session?.user?.email,
        userId: session?.user?.id
      });

      // Test 2: Vérifier le statut admin local
      addResult('2. Statut admin local', isAdmin, {
        isAdmin,
        currentUserRole: currentUser?.role,
        currentUserName: currentUser?.name
      });

      // Test 3: Tester la fonction is_admin() Supabase
      try {
        const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
        addResult('3. Fonction is_admin() Supabase', !adminError && isAdminData, {
          result: isAdminData,
          error: adminError?.message
        }, adminError?.message);
      } catch (err) {
        addResult('3. Fonction is_admin() Supabase', false, null, err.message);
      }

      // Test 4: Lire les timesheets (toutes)
      try {
        const { data: timesheetsData, error: timesheetsError } = await supabase
          .from('timesheets')
          .select('*')
          .limit(5);

        addResult('4. Lecture table timesheets', !timesheetsError, {
          count: timesheetsData?.length || 0,
          sample: timesheetsData?.slice(0, 2)
        }, timesheetsError?.message);
      } catch (err) {
        addResult('4. Lecture table timesheets', false, null, err.message);
      }

      // Test 5: Lire les timesheet_entries (toutes)
      try {
        const { data: entriesData, error: entriesError } = await supabase
          .from('timesheet_entries')
          .select('*')
          .limit(10);

        addResult('5. Lecture table timesheet_entries', !entriesError, {
          count: entriesData?.length || 0,
          statusBreakdown: entriesData?.reduce((acc, entry) => {
            acc[entry.status] = (acc[entry.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          sample: entriesData?.slice(0, 3)
        }, entriesError?.message);
      } catch (err) {
        addResult('5. Lecture table timesheet_entries', false, null, err.message);
      }

      // Test 6: Chercher spécifiquement les entrées 'pending'
      try {
        const { data: pendingEntries, error: pendingError } = await supabase
          .from('timesheet_entries')
          .select('*')
          .eq('status', 'pending');

        addResult('6. Entrées avec status = pending', !pendingError, {
          count: pendingEntries?.length || 0,
          entries: pendingEntries
        }, pendingError?.message, `Nombre d'entrées pending trouvées: ${pendingEntries?.length || 0}`);
      } catch (err) {
        addResult('6. Entrées avec status = pending', false, null, err.message);
      }

      // Test 7: Vérifier les policies RLS
      try {
        const { data: policies, error: policiesError } = await supabase.rpc('get_table_policies', {
          table_names: ['timesheets', 'timesheet_entries']
        });

        addResult('7. Policies RLS actives', !policiesError, {
          count: policies?.length || 0,
          policies: policies
        }, policiesError?.message);
      } catch (err) {
        addResult('7. Policies RLS actives', false, null, err.message);
      }

      // Test 8: Test direct de la logique AdminApprovals
      try {
        const { data: timesheetsData } = await supabase.from('timesheets').select('*');
        const { data: entriesData } = await supabase.from('timesheet_entries').select('*');

        if (timesheetsData && entriesData) {
          // Reproduire la logique exacte d'AdminApprovals
          const assembledTimesheets = timesheetsData.map(ts => ({
            ...ts,
            entries: entriesData.filter(entry => entry.timesheet_id === ts.id)
          }));

          const pendingTimesheets = assembledTimesheets.filter(ts => {
            return ts.entries && ts.entries.length > 0 && 
                   ts.entries.some(entry => entry.status === 'pending');
          });

          addResult('8. Test logique AdminApprovals', true, {
            totalTimesheets: assembledTimesheets.length,
            timesheetsWithEntries: assembledTimesheets.filter(ts => ts.entries.length > 0).length,
            pendingTimesheets: pendingTimesheets.length,
            pendingDetails: pendingTimesheets.map(ts => ({
              id: ts.id,
              user_id: ts.user_id,
              pendingEntriesCount: ts.entries.filter(e => e.status === 'pending').length
            }))
          }, null, `${pendingTimesheets.length} feuilles avec entrées pending trouvées`);
        }
      } catch (err) {
        addResult('8. Test logique AdminApprovals', false, null, err.message);
      }

    } catch (error) {
      addResult('Diagnostic général', false, null, error.message);
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
            <h1 className="text-2xl font-bold text-gray-900">🔧 Diagnostic Admin Approbations</h1>
            <p className="text-gray-600">Identifier pourquoi l'admin ne voit pas les demandes</p>
          </div>
        </div>

        {/* Informations utilisateur */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-800 mb-2">👤 Utilisateur connecté</h3>
          <div className="space-y-1 text-sm text-blue-700">
            <p><strong>Nom:</strong> {currentUser?.name || 'Non défini'}</p>
            <p><strong>Email:</strong> {currentUser?.email || 'Non défini'}</p>
            <p><strong>Rôle local:</strong> {currentUser?.role || 'Non défini'}</p>
            <p><strong>Est admin (local):</strong> {isAdmin ? 'OUI' : 'NON'}</p>
            <p><strong>Session Supabase:</strong> {session ? 'Connecté' : 'Non connecté'}</p>
          </div>
        </div>

        {/* Bouton de diagnostic */}
        <div className="mb-6">
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Database size={16} className="mr-2" />
            {loading ? 'Diagnostic en cours...' : 'Lancer le diagnostic complet'}
          </button>
        </div>

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
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                🎯 Ce diagnostic va vérifier
              </h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>1.</strong> Si vous êtes bien connecté à Supabase</p>
                <p><strong>2.</strong> Si vous êtes reconnu comme admin</p>
                <p><strong>3.</strong> Si vous pouvez lire les tables timesheets et timesheet_entries</p>
                <p><strong>4.</strong> Si des entrées avec status='pending' existent</p>
                <p><strong>5.</strong> Si les policies RLS bloquent la lecture</p>
                <p><strong>6.</strong> Si la logique de filtrage fonctionne</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDiagnostic;