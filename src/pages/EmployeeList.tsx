import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Search, Building2, Edit2, Archive, Trash2, PlusCircle, Mail, Send } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import EditEmployeeModal from '../components/EditEmployeeModal';
import AddEmployeeModal from '../components/AddEmployeeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { User } from '../types';
import { useEffect } from 'react';
import { sendInvitationAlt } from '../lib/invitations';

interface UserInvitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

const EmployeeList: React.FC = () => {
  const { companies, employees, archiveEmployee, updateEmployee, addEmployee, deleteEmployee, currentUser, user, isAdmin } = useAuth();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const companyParam = urlParams.get('company');
  const [selectedCompany, setSelectedCompany] = useState<string | 'all'>(companyParam || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [existingInvitations, setExistingInvitations] = useState<UserInvitation[]>([]);
  const navigate = useNavigate();

  // Fetch existing invitations
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!user || !isAdmin) return;
      
      try {
        const { data, error } = await supabase
          .from('user_invitations')
          .select('id, email, status')
          .in('status', ['pending', 'accepted']);
        
        if (error) throw error;
        setExistingInvitations(data || []);
      } catch (error) {
        console.error('Error fetching invitations:', error);
      }
    };

    fetchInvitations();
  }, [user, isAdmin]);

  // Toast notification
  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fonction d'envoi d'invitation selon les spécifications exactes
  const onSendInvite = async (email: string) => {
    const disabled = !user || !isAdmin;
    if (disabled) { 
      showToast('error', 'Veuillez vous connecter en admin.'); 
      return; 
    }
    
    try {
      // Trouver l'employé
      const employee = employees.find(emp => emp.email === email);
      if (!employee) {
        showToast('error', 'Employé non trouvé');
        return;
      }

      // Trouver l'entreprise
      const company = companies.find(c => c.id === employee.companyId);
      if (!company) {
        showToast('error', 'Entreprise non trouvée');
        return;
      }

      // Envoyer l'invitation
      await sendInvitationAlt(
        email, // Utiliser l'email réel de l'employé
        employee.companyId || '',
        {
          name: employee.name,
          department: employee.department,
          role: employee.role,
          birthDate: employee.birthDate,
          hireDate: employee.hireDate
        },
        company.name,
        currentUser?.name || 'Administrateur'
      );

      showToast('success', `Invitation envoyée à ${email} (${employee.name})`);
      
      // Refresh invitations list after successful send
      const { data, error: refreshError } = await supabase
        .from('user_invitations')
        .select('id, email, status')
        .in('status', ['pending', 'accepted']);
      
      if (!refreshError && data) {
        setExistingInvitations(data);
        console.log('✅ Liste des invitations mise à jour:', data.length);
      } else {
        console.error('❌ Erreur refresh invitations:', refreshError);
      }
      
      // Déclencher un événement pour notifier la page des invitations
      window.dispatchEvent(new CustomEvent('invitationSent', {
        detail: { email, employeeName: employee.name }
      }));
      
      console.log('🔗 === VÉRIFICATION TOKEN COHÉRENCE ===');
      console.log('📧 Email envoyé à:', email);
      console.log('👤 Nom employé:', employee.name);
      console.log('🏢 Entreprise:', company.name);
      console.log('📋 Vérifiez dans Supabase que le token correspond au lien reçu');
    } catch (error: any) {
      console.error('Erreur envoi invitation:', error);
      showToast('error', error.message || 'Une erreur inattendue est survenue lors de l\'envoi de l\'invitation.');
    }
  };

  // Initialiser le filtre d'entreprise selon le paramètre URL
  useEffect(() => {
    if (companyParam) {
      setSelectedCompany(companyParam);
    }
  }, [companyParam]);

  const filteredEmployees = employees.filter(employee => {
    const matchesCompany = selectedCompany === 'all' || employee.companyId === selectedCompany;
    const matchesSearch = 
      searchTerm === '' || 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCompany && !employee.archived && employee.role !== 'admin';
  });

  // Check if employee has existing invitation
  const hasExistingInvitation = (email: string) => {
    return existingInvitations.some(inv => inv.email === email && ['pending', 'accepted'].includes(inv.status));
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || '';
  };

  // Déterminer le titre et la description selon le contexte
  const getPageInfo = () => {
    if (companyParam) {
      const company = companies.find(c => c.id === companyParam);
      return {
        title: `Employés de ${company?.name || 'l\'entreprise'}`,
        description: `Gérer les employés de ${company?.name || 'cette entreprise'}`,
        showCompanyFilter: false
      };
    }
    return {
      title: 'Liste des employés',
      description: 'Gérer les employés de toutes les entreprises',
      showCompanyFilter: true
    };
  };

  const pageInfo = getPageInfo();

  const handleEdit = (employee: User) => {
    setEditingEmployee(employee);
  };

  const handleSaveEdit = (updatedEmployee: User) => {
    updateEmployee(updatedEmployee);
    setEditingEmployee(null);
  };

  const handleAddEmployee = (newEmployee: Omit<User, 'id'>) => {
    addEmployee(newEmployee);
    setShowAddModal(false);
  };

  const handleArchive = (employeeId: string) => {
    archiveEmployee(employeeId);
  };

  const handleDeleteClick = (employee: User) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (employeeToDelete) {
      await deleteEmployee(employeeToDelete.id);
      setEmployeeToDelete(null);
    }
  };

  return (
    <>
      {/* Toast notifications */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toastMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {toastMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertTriangle className="h-5 w-5 mr-2" />
            )}
            <span className="text-sm font-medium">{toastMessage.message}</span>
          </div>
        </div>
      )}

      {/* Bandeau d'information si pas connecté à Supabase */}
      {!user && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Connexion Supabase requise
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Connexion Supabase requise — connectez-vous pour envoyer des invitations.
                </p>
                <p className="mt-1 text-xs">
                  Astuce : si l'aperçu perd la session, ouvrez dans un nouvel onglet.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/')}
            className="mr-4 p-1 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pageInfo.title}</h1>
            <p className="text-gray-600">
              {pageInfo.description}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/invitations')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Mail size={16} className="mr-2" />
            Invitations
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircle size={20} className="mr-2" />
            Ajouter un employé
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher un employé..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {pageInfo.showCompanyFilter && (
            <div className="sm:w-64">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">Toutes les entreprises</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="min-w-full divide-y divide-gray-200">
          <div className="bg-gray-50 px-6 py-3">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom
              </div>
              <div className="col-span-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </div>
              <div className="col-span-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entreprise
              </div>
              <div className="col-span-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </div>
            </div>
          </div>
          <div className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((employee) => {
              const nameParts = employee.name.split(' ');
              const firstName = nameParts[0];
              const lastName = nameParts.slice(1).join(' ');

              return (
                <div key={employee.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3 flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {firstName} <span className="uppercase">{lastName}</span>
                      </div>
                    </div>
                    <div className="col-span-4 flex items-center">
                      <div className="text-sm text-gray-500">
                        {employee.email}
                      </div>
                    </div>
                    <div className="col-span-3 flex items-center">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {getCompanyName(employee.companyId || '')}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onSendInvite(employee.email)}
                        disabled={!user || !isAdmin || hasExistingInvitation(employee.email)}
                        className={`p-1 sm:p-2 rounded-full hover:bg-gray-100 ${
                          user && isAdmin && !hasExistingInvitation(employee.email)
                            ? 'text-gray-400 hover:text-green-600' 
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={
                          !user || !isAdmin 
                            ? 'Connexion admin requise' 
                            : hasExistingInvitation(employee.email)
                            ? 'Invitation déjà envoyée'
                            : 'Envoyer invitation'
                        }
                      >
                        <Send size={14} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-1 sm:p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                        title="Modifier"
                      >
                        <Edit2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                      <button
                        onClick={() => handleArchive(employee.id)}
                        className="p-1 sm:p-2 text-gray-400 hover:text-yellow-600 rounded-full hover:bg-gray-100"
                        title="Archiver"
                      >
                        <Archive size={14} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(employee)}
                        className="p-1 sm:p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {filteredEmployees.length === 0 && (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">Aucun employé trouvé</p>
          </div>
        )}
      </div>

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AddEmployeeModal
            onClose={() => setShowAddModal(false)}
            onSave={handleAddEmployee}
          />
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Supprimer définitivement l'employé"
        message={`Êtes-vous sûr de vouloir supprimer définitivement ${employeeToDelete?.name} ?\n\nCette action est irréversible et supprimera :\n- Le compte utilisateur\n- Toutes ses feuilles de temps\n- Toutes ses données personnelles`}
        type="delete"
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
      />
    </>
  );
};

export default EmployeeList;