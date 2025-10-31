import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Search, Building2, PlusCircle, MapPin, ChevronDown, ChevronRight, Edit2, Archive, Trash2, Building, Star } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import EditProjectModal from '../components/EditProjectModal';
import AddProjectModal from '../components/AddProjectModal';
import { Project } from '../types';
import { useEffect } from 'react';

const ProjectList: React.FC = () => {
  const { companies, projects, archiveProject, updateProject, deleteProject, addProject, getProjectsForCompany } = useAuth();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const companyParam = urlParams.get('company');
  const [selectedCompany, setSelectedCompany] = useState<string | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const navigate = useNavigate();

  // Initialiser le filtre d'entreprise selon le paramètre URL
  useEffect(() => {
    if (companyParam) {
      setSelectedCompany(companyParam);
    }
  }, [companyParam]);

  // Obtenir tous les projets selon le filtre de l'entreprise
  const allProjectsForFilter = selectedCompany === 'all' 
    ? projects.filter(p => !p.archived) // Tous les projets non archivés
    : getProjectsForCompany(selectedCompany); // Projets de l'entreprise sélectionnée (principaux + secondaires)

  const filteredProjects = allProjectsForFilter.filter(project => {
    const matchesSearch = 
      searchTerm === '' || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.reference && project.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof project.address === 'string' ? project.address.toLowerCase().includes(searchTerm.toLowerCase()) :
       project.address?.city && project.address.city.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || '';
  };

  // Déterminer le titre et la description selon le contexte
  const getPageInfo = () => {
    if (companyParam) {
      const company = companies.find(c => c.id === companyParam);
      return {
        title: `Chantiers de ${company?.name || 'l\'entreprise'}`,
        description: `Gérer les chantiers de ${company?.name || 'cette entreprise'}`,
        showCompanyFilter: false
      };
    }
    return {
      title: 'Liste des chantiers',
      description: 'Gérer les chantiers de toutes les entreprises',
      showCompanyFilter: true
    };
  };

  const pageInfo = getPageInfo();

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    // Si c'est un projet secondaire, on ne peut pas le modifier
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
      console.error('Error updating project:', error);
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = filteredProjects.find(p => p.id === projectId);
    if (project?.isSecondaryProject) {
      alert('Ce chantier appartient à une autre entreprise. Vous ne pouvez pas le supprimer depuis cette vue.');
      return;
    }
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce chantier ?')) {
      try {
        // Utiliser l'ID original pour les projets secondaires
        const originalId = project?.primaryCompanyId ? project.id.split('-secondary-')[0] : projectId;
        await deleteProject(originalId);
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleArchiveProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = filteredProjects.find(p => p.id === projectId);
    if (project?.isSecondaryProject) {
      alert('Ce chantier appartient à une autre entreprise. Vous ne pouvez pas l\'archiver depuis cette vue.');
      return;
    }
    try {
      // Utiliser l'ID original pour les projets secondaires
      const originalId = project?.primaryCompanyId ? project.id.split('-secondary-')[0] : projectId;
      await archiveProject(originalId);
    } catch (error) {
      console.error('Error archiving project:', error);
    }
  };

  // Fonction pour déterminer si c'est un projet NUMELEC principal
  const isNumelecPrimaryProject = (project: Project) => {
    const primaryCompany = companies.find(c => c.id === project.companyId);
    return primaryCompany?.name === 'NUMELEC';
  };

  // Fonction pour rendre l'icône du projet
  const renderProjectIcon = (project: Project) => {
    if (isNumelecPrimaryProject(project)) {
      return (
        <div className="bg-green-100 p-2 rounded-full">
          <img 
            src="/logos/LOGO-NUMELEC.png" 
            alt="NUMELEC" 
            className="h-4 w-4 object-contain"
            onError={(e) => {
              // Fallback vers l'icône par défaut si l'image ne charge pas
              console.warn('Logo NUMELEC non trouvé, utilisation de l\'icône par défaut');
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.classList.remove('hidden');
              }
            }}
          />
          <div className="hidden">
            <Building2 className="h-4 w-4 text-green-600" />
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-green-100 p-2 rounded-full">
          <Building2 className="h-4 w-4 text-green-600" />
        </div>
      );
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
    <div>
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
        <button
          onClick={() => setShowAddProjectModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusCircle size={20} className="mr-2" />
          Nouveau chantier
        </button>
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
                placeholder="Rechercher un chantier..."
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

      <div className="space-y-2">
        {filteredProjects.map((project) => {
          const isExpanded = expandedProjects.includes(project.id);
          
          return (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              {/* En-tête compact - Nom et référence seulement */}
              <div 
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleProjectExpansion(project.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Flèche de dépliage */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Icône du chantier - LOGO NUMELEC pour les projets NUMELEC */}
                    {renderProjectIcon(project)}
                    
                    {/* Nom et référence */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4">
                        <h3 className="text-lg font-bold text-gray-900 uppercase truncate">
                          {project.name}
                        </h3>
                        {project.reference && (
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            Réf: {project.reference}
                          </span>
                        )}
                        {project.isSecondaryProject && (
                          <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Chantier secondaire
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {project.isSecondaryProject 
                          ? `Géré par ${getCompanyName(project.primaryCompanyId || '')}` 
                          : getCompanyName(project.companyId || '')
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      project.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {project.active ? 'Actif' : 'Inactif'}
                    </span>
                    
                    {!project.isSecondaryProject ? (
                      <>
                        <button 
                          className="p-1 sm:p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                          onClick={(e) => handleEdit(project, e)}
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
                          onClick={(e) => handleDelete(project.id, e)}
                          title="Supprimer"
                        >
                          <Trash2 size={12} className="sm:w-4 sm:h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 italic px-2">
                        Lecture seule
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Contenu déplié - Toutes les autres informations */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
                  <div className="space-y-4">
                    {/* Attribution des entreprises */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Attribution des entreprises</h4>
                      
                      {/* Entreprise principale */}
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">
                          Entreprise principale:
                        </span>
                        <span className="text-sm text-gray-900">
                          {getCompanyName(project.companyId || '')}
                        </span>
                      </div>

                      {/* Entreprises secondaires */}
                      {project.secondaryCompanies && project.secondaryCompanies.length > 0 && (
                        <div className="flex items-start space-x-2">
                          <Star className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium text-gray-600">
                              Entreprises secondaires:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {project.secondaryCompanies.map((companyId) => (
                                <span
                                  key={companyId}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"
                                >
                                  {getCompanyName(companyId)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Adresse détaillée */}
                    {project.address && formatAddress(project.address) && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900">Adresse du chantier</h4>
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div className="text-sm text-gray-700">
                            {project.address.number && project.address.street && project.address.streetName && (
                              <div className="font-medium">
                                {project.address.number} {project.address.street} {project.address.streetName}
                              </div>
                            )}
                            {project.address.postalCode && project.address.city && (
                              <div className="text-gray-600">
                                {project.address.postalCode} {project.address.city}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Informations supplémentaires */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Statut:</span>
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          project.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.active ? 'Chantier actif' : 'Chantier inactif'}
                        </span>
                      </div>
                      
                      {project.reference && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Référence complète:</span>
                          <span className="ml-2 text-sm text-gray-900 font-mono">
                            {project.reference}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun chantier trouvé</h3>
            <p className="text-gray-500 text-sm mb-4">
              Aucun chantier ne correspond à vos critères de recherche
            </p>
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <PlusCircle size={16} className="mr-2" />
              Créer un nouveau chantier
            </button>
          </div>
        )}
      </div>

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showAddProjectModal && (
        <AddProjectModal
          onClose={() => setShowAddProjectModal(false)}
          onSave={addProject}
        />
      )}
    </div>
  );
};

export default ProjectList;