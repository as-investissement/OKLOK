import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, Mail, Building2, UserCircle, Calendar, Edit2, Save, X, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { currentUser, companies, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(false);
  const [isCompanyInfoOpen, setIsCompanyInfoOpen] = useState(false);
  const [editedData, setEditedData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    department: currentUser?.department || ''
  });
  const navigate = useNavigate();

  if (!currentUser) {
    return null;
  }

  const company = companies.find(c => c.id === currentUser.companyId);

  const handleSave = () => {
    // Ici on pourrait ajouter la logique pour sauvegarder les modifications
    console.log('Sauvegarde des modifications:', editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData({
      name: currentUser.name,
      email: currentUser.email,
      department: currentUser.department
    });
    setIsEditing(false);
  };

  // Seuls les administrateurs peuvent modifier les informations
  const canEdit = isAdmin;

  if (!currentUser) {
    return null;
  }

  return (
    <div className="h-full bg-white dark:bg-gray-900 transition-colors duration-200 overflow-hidden flex flex-col">
      <div className="flex-shrink-0 flex items-center p-4 sm:p-6">
        <button
          onClick={() => navigate('/')}
          className="mr-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-blue-600 transition-colors duration-200 group"
          disabled={!currentUser}
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mes informations</h1>
        </div>
        
        {canEdit && !isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            disabled={!currentUser}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit2 size={16} className="mr-1" />
            Modifier
          </button>
        ) : canEdit && isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!currentUser}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} className="mr-1" />
              Enregistrer
            </button>
            <button
              onClick={handleCancel}
              disabled={!currentUser}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={16} className="mr-1" />
              Annuler
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          {/* En-tête du profil */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-2.5 rounded-full transition-colors duration-200">
                <UserCircle className="h-9 w-9 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {currentUser.name}
                </h2>
                {company && (
                  <div className="flex items-center gap-2.5 mt-0.5">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {company.name}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                        : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    }`}>
                      {currentUser.role === 'admin' ? 'Administrateur' : 'Employé'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Informations personnelles */}
          <div className="px-6 py-6">
            <button
              onClick={() => setIsPersonalInfoOpen(!isPersonalInfoOpen)}
              className="w-full flex items-center justify-between mb-6 hover:opacity-75 transition-opacity"
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Informations personnelles
              </h3>
              {isPersonalInfoOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {isPersonalInfoOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nom complet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Nom complet
                </label>
                {canEdit && isEditing ? (
                  <input
                    type="text"
                    value={editedData.name}
                    onChange={(e) => setEditedData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                  />
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md transition-colors duration-200">
                    <span className="text-gray-900 dark:text-gray-100">{currentUser.name}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Adresse email
                </label>
                {canEdit && isEditing ? (
                  <input
                    type="email"
                    value={editedData.email}
                    onChange={(e) => setEditedData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                  />
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md transition-colors duration-200">
                    <span className="text-gray-900 dark:text-gray-100">{currentUser.email}</span>
                  </div>
                )}
              </div>

              {/* Entreprise */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Entreprise
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md transition-colors duration-200">
                  <span className="text-gray-900 dark:text-gray-100">{company?.name || 'Non assigné'}</span>
                </div>
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <UserCircle className="h-4 w-4 inline mr-2" />
                  Rôle
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md transition-colors duration-200">
                  <span className="text-gray-900 dark:text-gray-100">
                    {currentUser.role === 'admin' ? 'Administrateur' : 'Employé'}
                  </span>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Informations de l'entreprise */}
          {company && (
            <div className="px-6 py-6 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsCompanyInfoOpen(!isCompanyInfoOpen)}
                className="w-full flex items-center justify-between mb-6 hover:opacity-75 transition-opacity"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Informations de l'entreprise
                </h3>
                {isCompanyInfoOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {isCompanyInfoOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Building2 className="h-4 w-4 inline mr-2" />
                    Nom de l'entreprise
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md transition-colors duration-200">
                    <span className="text-gray-900 dark:text-gray-100">{company.name}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email de l'entreprise
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md transition-colors duration-200">
                    <span className="text-gray-900 dark:text-gray-100">{company.email || 'Non renseigné'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email administrateur
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md transition-colors duration-200">
                    <span className="text-gray-900 dark:text-gray-100">{company.adminEmail || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </div>

        {/* Note d'information - Différente selon le rôle */}
        <div className={`mt-6 border rounded-lg p-4 ${
          canEdit ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' : 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {canEdit ? (
                <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                canEdit ? 'text-blue-800 dark:text-blue-200' : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {canEdit ? 'Modification des informations' : 'Informations en lecture seule'}
              </h3>
              <div className={`mt-2 text-sm font-semibold ${
                canEdit ? 'text-blue-700 dark:text-blue-300' : 'text-yellow-700 dark:text-white'
              }`}>
                <p>
                  {canEdit 
                    ? 'En tant qu\'administrateur, vous pouvez modifier certaines informations. Pour modifier l\'entreprise ou le rôle, utilisez la section employés.'
                    : 'Vos informations sont en lecture seule. Pour toute modification, veuillez contacter votre administrateur.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;