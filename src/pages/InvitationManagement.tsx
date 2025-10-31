import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Clock, CheckCircle, XCircle, RefreshCw, AlertTriangle, Send, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserInvitation } from '../types';

const InvitationManagement: React.FC = () => {
  const { companies, currentUser } = useAuth();
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadInvitations();
    
    // Écouter les nouvelles invitations envoyées
    const handleInvitationSent = () => {
      console.log('🔄 Nouvelle invitation détectée, rechargement...');
      loadInvitations();
    };
    
    window.addEventListener('invitationSent', handleInvitationSent);
    
    return () => {
      window.removeEventListener('invitationSent', handleInvitationSent);
    };
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      console.log('📊 Chargement des invitations depuis Supabase...');
      
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement invitations:', error);
        setError('Erreur lors du chargement des invitations');
        return;
      }

      console.log('📋 Invitations trouvées:', data?.length || 0);
      
      const formattedInvitations: UserInvitation[] = data.map(inv => ({
        id: inv.id,
        email: inv.email,
        token: inv.token,
        invitedBy: inv.invited_by,
        companyId: inv.company_id,
        employeeData: inv.employee_data,
        status: inv.status,
        expiresAt: inv.expires_at,
        acceptedAt: inv.accepted_at,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at
      }));

      setInvitations(formattedInvitations);
      console.log('✅ Invitations chargées et formatées:', formattedInvitations.length);
    } catch (err) {
      console.error('❌ Exception chargement invitations:', err);
      setError('Erreur lors du chargement des invitations');
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) return;

      // Générer un nouveau token
      const newToken = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
      
      // Mettre à jour l'invitation
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          token: newToken,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // +7 jours
        })
        .eq('id', invitationId);

      if (updateError) {
        setError('Erreur lors de la mise à jour de l\'invitation');
        return;
      }

      // Renvoyer l'email
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitation.email,
          employeeName: invitation.employeeData.name,
          companyName: companies.find(c => c.id === invitation.companyId)?.name || 'Votre entreprise',
          invitedBy: currentUser?.name || 'Votre administrateur',
          inviteId: invitationId,
          token: newToken
        })
      });

      if (response.ok) {
        await loadInvitations(); // Recharger la liste
        alert('Invitation renvoyée avec succès !');
      } else {
        setError('Erreur lors du renvoi de l\'invitation');
      }
    } catch (err) {
      setError('Erreur lors du renvoi de l\'invitation');
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette invitation ?')) return;

    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) {
        setError('Erreur lors de l\'annulation de l\'invitation');
        return;
      }

      await loadInvitations();
    } catch (err) {
      setError('Erreur lors de l\'annulation de l\'invitation');
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'pending' && isExpired) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle size={12} className="mr-1" />
          Expiré
        </span>
      );
    }

    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            En attente
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            Accepté
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle size={12} className="mr-1" />
            Annulé
          </span>
        );
      default:
        return null;
    }
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || 'Entreprise inconnue';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des invitations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête */}
      <div className="bg-white shadow-sm border-b border-gray-100 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/employees')}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des invitations</h1>
                <p className="text-gray-600">
                  Suivre le statut des invitations d'employés
                </p>
              </div>
            </div>
            
            <button
              onClick={loadInvitations}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw size={16} className="mr-2" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total invitations</p>
                <p className="text-2xl font-semibold text-gray-900">{invitations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invitations.filter(inv => inv.status === 'pending' && new Date(inv.expiresAt) > new Date()).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Acceptées</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invitations.filter(inv => inv.status === 'accepted').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expirées</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invitations.filter(inv => inv.status === 'pending' && new Date(inv.expiresAt) < new Date()).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des invitations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900">
              Invitations d'employés
            </h2>
          </div>

          {invitations.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {invitations.map((invitation) => {
                const isExpired = new Date(invitation.expiresAt) < new Date();
                const canResend = invitation.status === 'pending' || isExpired;
                
                return (
                  <div key={invitation.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-4">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Mail className="h-5 w-5 text-blue-600" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {invitation.employeeData.name}
                              </h3>
                              {getStatusBadge(invitation.status, invitation.expiresAt)}
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-500">{invitation.email}</span>
                              <span className="text-sm text-gray-500">
                                {getCompanyName(invitation.companyId)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {invitation.employeeData.department}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                              <span>
                                Invité le {new Date(invitation.createdAt).toLocaleDateString('fr-FR')}
                              </span>
                              <span>
                                Expire le {new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}
                              </span>
                              {invitation.acceptedAt && (
                                <span className="text-green-600">
                                  Accepté le {new Date(invitation.acceptedAt).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        {canResend && (
                          <button
                            onClick={() => resendInvitation(invitation.id)}
                            className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                            title="Renvoyer l'invitation"
                          >
                            <Send size={12} className="mr-1" />
                            Renvoyer
                          </button>
                        )}
                        
                        {invitation.status === 'pending' && (
                          <button
                            onClick={() => cancelInvitation(invitation.id)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                            title="Annuler l'invitation"
                          >
                            <Trash2 size={12} className="mr-1" />
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune invitation</h3>
              <p className="text-gray-500">
                Aucune invitation d'employé n'a encore été envoyée.
              </p>
            </div>
          )}
        </div>

        {/* Message d'information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Processus d'invitation
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  1. L'employé reçoit un email avec un lien d'activation (valide 7 jours)<br/>
                  2. Il crée son mot de passe<br/>
                  3. Il accepte les conditions générales d'utilisation<br/>
                  4. Son compte est activé et il peut se connecter
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationManagement;