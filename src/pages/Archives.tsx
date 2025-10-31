import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Search, Building2, MapPin, ChevronDown, ChevronRight, RefreshCcw, Users, Archive, FileSpreadsheet, TrendingUp, Calendar, User, Building, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';

const Archives: React.FC = () => {
  const { companies, projects, employees, restoreEmployee, restoreProject, deleteEmployee } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'projects'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const navigate = useNavigate();

  // Filtrer les employés archivés
  const archivedEmployees = employees.filter(employee => employee.archived && employee.role !== 'admin');

  // Filtrer les projets archivés
  const archivedProjects = projects.filter(project => project.archived);

  // Statistiques des archives
  const archiveStats = {
    totalEmployees: archivedEmployees.length,
    totalProjects: archivedProjects.length,
    totalArchives: archivedEmployees.length + archivedProjects.length,
    companiesWithArchives: new Set([
      ...archivedEmployees.map(emp => emp.companyId),
      ...archivedProjects.map(proj => proj.companyId)
    ].filter(Boolean)).size
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || '';
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleRestore = (itemId: string, type: 'employee' | 'project') => {
    if (type === 'employee') {
      restoreEmployee(itemId);
    } else {
      restoreProject(itemId);
    }
  };

  const handleDeleteEmployeeClick = (employee: any) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteEmployee = async () => {
    if (employeeToDelete) {
      await deleteEmployee(employeeToDelete.id);
      setEmployeeToDelete(null);
    }
  };

  // Fonction pour formater l'adresse complète
  const formatAddress = (address?: any) => {
    if (!address) return '';
    if (typeof address === 'string') return address;
    
    const { number, street, streetName, postalCode, city } = address;
    const parts = [number, street, streetName].filter(Boolean);
    const addressLine = parts.join(' ');
    const cityLine = [postalCode, city].filter(Boolean).join(' ');
    return [addressLine, cityLine].filter(Boolean).join(', ');
  };

  const filteredEmployees = archivedEmployees.filter(employee =>
    searchTerm === '' || 
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCompanyName(employee.companyId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = archivedProjects.filter(project =>
    searchTerm === '' || 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.reference && project.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
    getCompanyName(project.companyId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderEmployees = () => (
    <div className="space-y-4">
      {filteredEmployees.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredEmployees.map((employee) => {
            const nameParts = employee.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            const isExpanded = expandedItems.includes(employee.id);

            return (
              <div key={employee.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleItemExpansion(employee.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* Flèche de dépliage */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="bg-blue-100 p-3 rounded-full">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>

                      {/* Informations principales */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {firstName} <span className="uppercase">{lastName}</span>
                          </h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {employee.department}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-600">{employee.email}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <Building className="h-4 w-4 mr-1" />
                            {getCompanyName(employee.companyId || '')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bouton de restauration */}
                    <button 
                      className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(employee.id, 'employee');
                      }}
                    >
                      <RefreshCcw size={16} className="mr-1" />
                      Restaurer
                    </button>
                    
                    {/* Bouton de suppression définitive */}
                    <button 
                      className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEmployeeClick(employee);
                      }}
                    >
                      <Trash2 size={16} className="mr-1" />
                      Supprimer
                    </button>
                  </div>
                </div>
                
                {/* Contenu déplié */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Informations personnelles</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Email:</span>
                            <span className="ml-2 text-gray-900">{employee.email}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Département:</span>
                            <span className="ml-2 text-gray-900">{employee.department}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Rôle:</span>
                            <span className="ml-2 text-gray-900">
                              {employee.role === 'admin' ? 'Administrateur' : 'Employé'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Entreprise</h4>
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-900">
                            {getCompanyName(employee.companyId || '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun employé archivé</h3>
          <p className="text-gray-500">Tous vos employés sont actuellement actifs</p>
        </div>
      )}
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-4">
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((project) => {
            const isExpanded = expandedItems.includes(project.id);

            return (
              <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleItemExpansion(project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* Flèche de dépliage */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>

                      {/* Icône du projet */}
                      <div className="bg-green-100 p-3 rounded-full">
                        <Building2 className="h-6 w-6 text-green-600" />
                      </div>

                      {/* Informations principales */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-4">
                          <h3 className="text-lg font-semibold text-gray-900 uppercase">
                            {project.name}
                          </h3>
                          {project.reference && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Réf: {project.reference}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-sm text-gray-500">
                            <Building className="h-4 w-4 mr-1" />
                            {getCompanyName(project.companyId || '')}
                          </div>
                          {formatAddress(project.address) && (
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span className="truncate max-w-xs">
                                {formatAddress(project.address)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bouton de restauration */}
                    <button 
                      className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(project.id, 'project');
                      }}
                    >
                      <RefreshCcw size={16} className="mr-1" />
                      Restaurer
                    </button>
                  </div>
                </div>
                
                {/* Contenu déplié */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Informations du chantier</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Nom:</span>
                            <span className="ml-2 text-gray-900 uppercase">{project.name}</span>
                          </div>
                          {project.reference && (
                            <div>
                              <span className="font-medium text-gray-600">Référence:</span>
                              <span className="ml-2 text-gray-900 font-mono">{project.reference}</span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-600">Statut:</span>
                            <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              project.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {project.active ? 'Était actif' : 'Était inactif'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Localisation</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-900">
                              {getCompanyName(project.companyId || '')}
                            </span>
                          </div>
                          {formatAddress(project.address) && (
                            <div className="flex items-start space-x-2">
                              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                              <span className="text-sm text-gray-900">
                                {formatAddress(project.address)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun chantier archivé</h3>
          <p className="text-gray-500">Tous vos chantiers sont actuellement actifs</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête moderne */}
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Archives</h1>
                <p className="text-gray-600">
                  Gérer les éléments archivés de votre système
                </p>
              </div>
            </div>
            
            {/* Icône d'archive */}
            <div className="bg-purple-100 p-3 rounded-full">
              <Archive className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Statistiques des archives - Style tableau de bord */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Employés archivés</p>
                <p className="text-2xl font-semibold text-gray-900">{archiveStats.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chantiers archivés</p>
                <p className="text-2xl font-semibold text-gray-900">{archiveStats.totalProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <FileSpreadsheet className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total archives</p>
                <p className="text-2xl font-semibold text-gray-900">{archiveStats.totalArchives}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full">
                <Building className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Entreprises concernées</p>
                <p className="text-2xl font-semibold text-gray-900">{archiveStats.companiesWithArchives}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets et recherche */}
        <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('employees')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'employees'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Employés archivés ({archiveStats.totalEmployees})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'projects'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Chantiers archivés ({archiveStats.totalProjects})</span>
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={`Rechercher ${activeTab === 'employees' ? 'un employé' : 'un chantier'} archivé...`}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'employees' ? renderEmployees() : renderProjects()}

        {/* Message d'information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Gestion des archives
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Les éléments archivés sont conservés dans le système mais ne sont plus visibles dans les listes principales. 
                  Vous pouvez les restaurer à tout moment en cliquant sur le bouton "Restaurer".
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={handleConfirmDeleteEmployee}
        title="Supprimer définitivement l'employé"
        message={`Êtes-vous sûr de vouloir supprimer définitivement ${employeeToDelete?.name} ?\n\nCette action est irréversible et supprimera :\n- Le compte utilisateur\n- Toutes ses feuilles de temps\n- Toutes ses données personnelles\n\nL'employé ne pourra plus se connecter à l'application.`}
        type="delete"
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
      />
    </div>
  );
};

export default Archives;