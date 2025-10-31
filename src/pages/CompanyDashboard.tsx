import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTimesheets } from '../context/TimesheetContext';
import { ArrowLeft, Building2, Users, FileSpreadsheet, Clock, Plus, ChevronRight, User, MapPin, Edit2, Archive, Trash2 } from 'lucide-react';
import AddProjectModal from '../components/AddProjectModal';
import EditProjectModal from '../components/EditProjectModal';
import { Project } from '../types';

const CompanyDashboard: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, employees, projects, addProject, updateProject, archiveProject, deleteProject, getProjectsForCompany } = useAuth();
  const { timesheets } = useTimesheets();
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // Écouter les mises à jour globales des données
  useEffect(() => {
    const handleGlobalUpdate = () => {
      setDataVersion(prev => prev + 1);
      console.log('📊 CompanyDashboard: Données mises à jour globalement');
    };

    window.addEventListener('globalTimesheetUpdate', handleGlobalUpdate);
    window.addEventListener('timesheetDataUpdated', handleGlobalUpdate);

    return () => {
      window.removeEventListener('globalTimesheetUpdate', handleGlobalUpdate);
      window.removeEventListener('timesheetDataUpdated', handleGlobalUpdate);
    };
  }, []);

  const company = companies.find(c => c.id === companyId);
  
  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Entreprise non trouvée</h1>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // Filtrer les données pour cette entreprise
  const companyEmployees = employees.filter(emp => emp.companyId === companyId && !emp.archived);
  const companyProjects = getProjectsForCompany(companyId);
  const companyTimesheets = timesheets.filter(ts => 
    companyEmployees.some(emp => emp.id === ts.userId)
  );

  // Statistiques
  const stats = {
    activeEmployees: companyEmployees.length,
    activeProjects: companyProjects.length,
    pendingApprovals: companyTimesheets.filter(ts => ts.status === 'submitted').length,
    totalHoursThisMonth: companyTimesheets
      .filter(ts => {
        const tsDate = new Date(ts.weekStarting);
        const now = new Date();
        return tsDate.getMonth() === now.getMonth() && tsDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, ts) => sum + ts.totalHours, 0)
  };

  const handleAddProject = async (project: Omit<Project, 'id'>) => {
    try {
      await addProject(project);
      setShowAddProjectModal(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du projet:', error);
    }
  };

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    // Si c'est un projet secondaire, on ne peut pas le modifier depuis cette vue
    if (project.isSecondaryProject) {
      alert('Ce chantier appartient à une autre entreprise. Vous ne pouvez pas le modifier depuis cette vue.');
      return;
    }
    setEditingProject(project);
  };

  const handleSaveEdit = async (updatedProject: Project) => {
    try {
      await updateProject(updatedProject);
      setEditingProject(null);
    } catch (error) {
      console.error('Erreur lors de la modification du projet:', error);
    }
  };

  const handleArchiveProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = companyProjects.find(p => p.id === projectId);
    if (project?.isSecondaryProject) {
      alert('Ce chantier appartient à une autre entreprise. Vous ne pouvez pas l\'archiver depuis cette vue.');
      return;
    }
    if (window.confirm('Êtes-vous sûr de vouloir archiver ce chantier ?')) {
      try {
        // Utiliser l'ID original pour les projets secondaires
        const originalId = project?.primaryCompanyId ? project.id.split('-secondary-')[0] : projectId;
        await archiveProject(originalId);
      } catch (error) {
        console.error('Erreur lors de l\'archivage du projet:', error);
      }
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = companyProjects.find(p => p.id === projectId);
    if (project?.isSecondaryProject) {
      alert('Ce chantier appartient à une autre entreprise. Vous ne pouvez pas le supprimer depuis cette vue.');
      return;
    }
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce chantier ?')) {
      try {
        // Utiliser l'ID original pour les projets secondaires
        const originalId = project?.primaryCompanyId ? project.id.split('-secondary-')[0] : projectId;
        await deleteProject(originalId);
      } catch (error) {
        console.error('Erreur lors de la suppression du projet:', error);
      }
    }
  };

  // Fonction pour formater l'adresse complète
  const formatAddress = (address?: Project['address']) => {
    if (!address) return '';
    if (typeof address === 'string') return address;
    
    const { number, street, streetName, postalCode, city } = address;
    const parts = [number, street, streetName].filter(Boolean);
    const addressLine = parts.join(' ');
    const cityLine = [postalCode, city].filter(Boolean).join(' ');
    return [addressLine, cityLine].filter(Boolean).join(', ');
  };

  return (
    <div key={`company-dashboard-${dataVersion}`} className="min-h-screen bg-white">
      {/* En-tête */}
      <div className="bg-white shadow-sm border-b border-gray-100 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                  <p className="text-gray-600">Gestion de l'entreprise</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Statistiques */}

        {/* Navigation rapide */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => navigate(`/employees?company=${companyId}`)}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Gérer les employés</h3>
                  <p className="text-sm text-gray-500">{stats.activeEmployees} employé{stats.activeEmployees > 1 ? 's' : ''} actif{stats.activeEmployees > 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </button>

          <button
            onClick={() => navigate(`/projects?company=${companyId}`)}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Gérer les chantiers</h3>
                  <p className="text-sm text-gray-500">{stats.activeProjects} chantier{stats.activeProjects > 1 ? 's' : ''} actif{stats.activeProjects > 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </button>
          <button
            onClick={() => navigate('/approvals')}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <FileSpreadsheet className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Approbations</h3>
                    <p className="text-sm text-gray-500">Valider les feuilles de temps</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              
              {/* Statistiques intégrées */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-4 w-4 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-xs text-yellow-600 font-medium">En attente</p>
                      <p className="text-lg font-bold text-yellow-700">{stats.pendingApprovals}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-purple-600 mr-2" />
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Heures ce mois</p>
                      <p className="text-lg font-bold text-purple-700">{stats.totalHoursThisMonth.toFixed(1)}h</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/archives')}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Archive className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Archives</h3>
                  <p className="text-sm text-gray-500">Consulter les archives</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </button>
        </div>

        {/* Liste des chantiers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Chantiers de {company.name}
              </h2>
              <span className="text-sm text-gray-500">
                {companyProjects.length} chantier{companyProjects.length > 1 ? 's' : ''} actif{companyProjects.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {companyProjects.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {companyProjects.map((project) => (
                <div key={project.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Building2 className="h-5 w-5 text-green-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900 uppercase truncate">
                            {project.isSecondaryProject ? project.name : project.name}
                          </h3>
                          {project.reference && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Réf: {project.reference}
                            </span>
                          )}
                          {project.isSecondaryProject && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Chantier secondaire
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            project.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {project.active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        
                        {formatAddress(project.address) && (
                          <div className="flex items-center mt-1">
                            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-500 truncate">
                              {formatAddress(project.address)}
                            </span>
                          </div>
                        )}

                        {/* Entreprises secondaires */}
                        {project.secondaryCompanies && project.secondaryCompanies.length > 0 && (
                          <div className="flex items-center mt-1">
                            <User className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-500">
                              Avec: {project.secondaryCompanies.map(id => 
                                companies.find(c => c.id === id)?.name
                              ).filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {!project.isSecondaryProject ? (
                        <>
                          <button 
                            className="p-1 sm:p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                            onClick={(e) => handleEditProject(project, e)}
                            title="Modifier"
                          >
                            <Edit2 size={12} className="sm:w-4 sm:h-4" />
                          </button>
                          <button 
                            className="p-1 sm:p-2 text-gray-400 hover:text-yellow-600 rounded-full hover:bg-gray-100"
                            onClick={(e) => handleArchiveProject(project.id, e)}
                            title="Archiver"
                          >
                            <Archive size={12} className="sm:w-4 sm:h-4" />
                          </button>
                          <button 
                            className="p-1 sm:p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                            onClick={(e) => handleDeleteProject(project.id, e)}
                            title="Supprimer"
                          >
                            <Trash2 size={12} className="sm:w-4 sm:h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 italic">
                          Géré par {companies.find(c => c.id === project.primaryCompanyId)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun chantier</h3>
              <p className="text-gray-500 mb-4">
                Cette entreprise n'a pas encore de chantiers actifs
              </p>
              <button
                onClick={() => setShowAddProjectModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                <Plus size={16} className="mr-2" />
                Créer le premier chantier
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddProjectModal && (
        <AddProjectModal
          onClose={() => setShowAddProjectModal(false)}
          onSave={handleAddProject}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default CompanyDashboard;