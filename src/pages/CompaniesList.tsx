import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Building2, Mail, Phone, MapPin, FileText, Hash, Search, CreditCard as Edit2, ChevronDown, ChevronRight, Upload, Image, BookOpen, X, Camera, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddCompanyModal from '../components/AddCompanyModal';
import { supabase } from '../lib/supabaseClient';
import { uploadCompanyLogo, deleteCompanyLogo } from '../lib/storage';

const CompaniesList: React.FC = () => {
  const { companies, updateCompany, addCompany, syncData } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    logoUrl: '',
    conventionCollective: '',
    name: '',
    email: '',
    adminEmail: '',
    siret: '',
    apeCode: '',
    phone: '',
    address: {
      street: '',
      postalCode: '',
      city: '',
      country: 'France'
    }
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreviews, setLogoPreviews] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // Données d'exemple pour les informations manquantes (SIRET, APE, téléphone, adresse)
  const getCompanyDetails = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return {
      siret: company?.siret || 'Non renseigné',
      ape: company?.apeCode || 'Non renseigné',
      phone: company?.phone || 'Non renseigné',
      address: {
        street: company?.address?.street || 'Non renseignée',
        postalCode: company?.address?.postalCode || '',
        city: company?.address?.city || '',
        country: 'France'
      }
    };
  };

  // Filtrer les entreprises selon la recherche
  const filteredCompanies = companies.filter(company =>
    searchTerm === '' || 
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const expandAll = () => {
    setExpandedCompanies(companies.map(c => c.id));
  };

  const collapseAll = () => {
    setExpandedCompanies([]);
  };

  const formatAddress = (address: any) => {
    if (!address.street) return 'Non renseignée';
    return `${address.street}, ${address.postalCode} ${address.city}, ${address.country}`;
  };

  const handleEditCompany = (company: any) => {
    const details = getCompanyDetails(company.id);
    setEditingCompany(company.id);
    setEditFormData({
      logoUrl: company.logoUrl || '',
      conventionCollective: company.conventionCollective || '',
      name: company.name || '',
      email: company.email || '',
      adminEmail: company.adminEmail || '',
      siret: details.siret || '',
      apeCode: details.ape || '',
      phone: details.phone || '',
      address: {
        street: details.address?.street || '',
        postalCode: details.address?.postalCode || '',
        city: details.address?.city || '',
        country: details.address?.country || 'France'
      }
    });
    // Initialiser la prévisualisation pour cette entreprise spécifique
    if (company.logoUrl) {
      setLogoPreviews(prev => ({ ...prev, [company.id]: company.logoUrl }));
    }
  };

  const handleSaveCompany = async () => {
    if (editingCompany) {
      try {
        console.log('🚀 === DÉBUT SAUVEGARDE ===');
        console.log('🆔 ID entreprise:', editingCompany);
        console.log('📋 Données formulaire:', editFormData);
        
        // Préparer les données à sauvegarder
        const updates = {
          name: editFormData.name,
          email: editFormData.email,
          adminEmail: editFormData.adminEmail,
          logoUrl: editFormData.logoUrl,
          conventionCollective: editFormData.conventionCollective,
          siret: editFormData.siret,
          apeCode: editFormData.apeCode,
          phone: editFormData.phone,
          address: editFormData.address
        };
        
        console.log('💾 Données à sauvegarder:', updates);
        
        // Appeler updateCompany qui retourne maintenant une Promise
        await updateCompany(editingCompany, updates);
        
        // Recharger les données depuis Supabase pour s'assurer d'avoir les dernières valeurs
        console.log('🔄 Rechargement des données depuis Supabase...');
        await syncData();
        
        // Conserver la prévisualisation du logo après sauvegarde
        const savedLogoUrl = editFormData.logoUrl;
        if (savedLogoUrl) {
          setLogoPreviews(prev => ({ ...prev, [editingCompany]: savedLogoUrl }));
        }
        
        // Fermer le mode édition seulement après succès
        setEditingCompany(null);
        
        console.log('✅ === SAUVEGARDE TERMINÉE AVEC SUCCÈS ===');
        alert('✅ Informations sauvegardées avec succès !');
        
      } catch (error) {
        console.error('❌ === ERREUR SAUVEGARDE ===', error);
        alert(`❌ Erreur: ${error.message}`);
      }
    }
  };

  const handleCancelEdit = () => {
    const companyId = editingCompany;
    setEditingCompany(null);
    setEditFormData({
      logoUrl: '',
      conventionCollective: '',
      name: '',
      email: '',
      adminEmail: '',
      siret: '',
      apeCode: '',
      phone: '',
      address: {
        street: '',
        postalCode: '',
        city: '',
        country: 'France'
      }
    });
    // Supprimer seulement la prévisualisation de cette entreprise
    if (companyId) {
      setLogoPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[companyId];
        return newPreviews;
      });
    }
  };


  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, companyId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      alert('Veuillez sélectionner un fichier JPEG, PNG ou WebP');
      return;
    }

    // Vérifier la taille du fichier (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Taille maximum : 2MB');
      return;
    }

    setUploadingLogo(true);

    try {
      // Créer une URL de prévisualisation temporaire
      const previewUrl = URL.createObjectURL(file);
      setLogoPreviews(prev => ({ ...prev, [companyId]: previewUrl }));

      // Obtenir le nom de l'entreprise
      const company = companies.find(c => c.id === companyId);
      const companyName = company?.name || 'entreprise';

      // Upload vers Supabase Storage
      const logoUrl = await uploadCompanyLogo(file, companyName);

      if (!logoUrl) {
        throw new Error('Échec de l\'upload du logo');
      }

      // Mettre à jour le formulaire avec l'URL du logo
      setEditFormData(prev => ({ ...prev, logoUrl }));

      console.log('✅ Logo uploadé avec succès:', logoUrl);

    } catch (error) {
      console.error('❌ Erreur lors de l\'upload:', error);
      alert('Erreur lors de l\'upload du logo');
      setLogoPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[companyId];
        return newPreviews;
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    const companyId = editingCompany;
    setEditFormData(prev => ({ ...prev, logoUrl: '' }));
    if (companyId) {
      setLogoPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[companyId];
        return newPreviews;
      });
    }
  };

  // Fonction pour afficher le logo comme une photo d'identité
  const renderCompanyLogo = (company: any, size: 'small' | 'large' = 'small') => {
    const sizeClasses = size === 'large' ? 'h-24 w-24' : 'h-12 w-12';
    
    // Déterminer quelle URL utiliser pour le logo
    let logoUrl = null;
    
    // Priorité : logoPreview > company.logoUrl (données Supabase) > editFormData (si en édition)
    logoUrl = logoPreviews[company.id] || company.logoUrl || (editingCompany === company.id ? editFormData.logoUrl : null);
    
    console.log('📸 renderCompanyLogo pour', company.name, ':', {
      companyId: company.id,
      editingCompany,
      isEditing: editingCompany === company.id,
      companyLogoUrl: company.logoUrl,
      editFormLogoUrl: editFormData.logoUrl,
      previewUrl: logoPreviews[company.id],
      finalLogoUrl: logoUrl
    });

    if (logoUrl) {
      return (
        <div className={`${sizeClasses} rounded-lg overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center shadow-sm`}>
          <img 
            src={logoUrl} 
            alt={`Logo ${company.name}`}
            className="h-full w-full object-contain p-1"
            onError={(e) => {
              console.error('❌ Erreur chargement logo pour', company.name, ':', logoUrl);
              console.error('❌ URL du logo invalide ou inaccessible:', logoUrl);
              // Masquer l'image et afficher le fallback
              const imgElement = e.currentTarget;
              const fallbackElement = imgElement.parentElement?.querySelector('.logo-fallback') as HTMLElement;
              if (fallbackElement) {
                imgElement.style.display = 'none';
                fallbackElement.classList.remove('hidden');
              }
            }}
            onLoad={() => {
              console.log('✅ Logo chargé avec succès pour', company.name, ':', logoUrl);
            }}
          />
          <div className="logo-fallback hidden h-full w-full flex items-center justify-center bg-gray-100 flex-col">
            <Building2 className={`${size === 'large' ? 'h-8 w-8' : 'h-6 w-6'} text-gray-400`} />
            <span className="text-xs text-gray-500 mt-1 text-center">Logo introuvable</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`${sizeClasses} rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center flex-col`}>
        <Camera className={`${size === 'large' ? 'h-8 w-8' : 'h-6 w-6'} text-gray-400`} />
        <span className="text-xs text-gray-500 mt-1 text-center">Aucun logo</span>
      </div>
    );
  };

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
                <h1 className="text-2xl font-bold text-gray-900">Mes entreprises</h1>
                <p className="text-gray-600">
                  Informations détaillées de toutes vos entreprises
                </p>
              </div>
            </div>
            
            {/* Bouton ajouter entreprise */}
            <div className="flex items-center space-x-3">
              {/* Icône d'entreprises */}
              <div className="bg-blue-100 p-3 rounded-full">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total entreprises</p>
                <p className="text-2xl font-semibold text-gray-900">{companies.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Entreprises actives</p>
                <p className="text-2xl font-semibold text-gray-900">{companies.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <Hash className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Secteurs d'activité</p>
                <p className="text-2xl font-semibold text-gray-900">4</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et contrôles */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher une entreprise..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Contrôles pour déplier/replier */}
            {companies.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={expandAll}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ChevronDown size={16} className="mr-1" />
                  Tout déplier
                </button>
                <button
                  onClick={collapseAll}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ChevronRight size={16} className="mr-1" />
                  Tout replier
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Liste des entreprises */}
        <div className="space-y-4">
          {filteredCompanies.map(company => {
            const details = getCompanyDetails(company.id);
            const isExpanded = expandedCompanies.includes(company.id);
            
            return (
              <div key={company.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {/* En-tête de l'entreprise avec logo comme photo d'identité */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                  onClick={() => toggleCompany(company.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* Flèche de dépliage */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-6 w-6 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-6 w-6 text-gray-400" />
                        )}
                      </div>

                      {/* Logo comme photo d'identité */}
                      {renderCompanyLogo(company, 'small')}
                      
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900">
                          {company.name}
                        </h2>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-1" />
                            {company.email || 'Email non renseigné'}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 mr-1" />
                            {details.phone}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Badge de statut */}
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contenu déplié - Informations détaillées */}
                {isExpanded && (
                  <div className="bg-gray-50">
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Informations légales */}
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                                Informations légales
                              </h3>
                              {editingCompany !== company.id && (
                                <button
                                  onClick={() => handleEditCompany(company)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <Edit2 size={14} className="mr-1" />
                                  Modifier
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-4">
                              {/* Logo de l'entreprise - Style photo d'identité */}
                              <div className="bg-white rounded-lg p-6 border border-gray-200">
                                <div className="flex items-start space-x-6">
                                  {/* Photo d'identité du logo */}
                                  <div className="flex-shrink-0">
                                    {editingCompany === company.id ? (
                                      <div className="space-y-3">
                                        {/* Prévisualisation grande taille */}
                                        <div className="relative">
                                          {(logoPreviews[company.id] || editFormData.logoUrl || company.logoUrl) ? (
                                            <div className="relative">
                                              <div className="h-32 w-32 rounded-lg overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center shadow-md">
                                                <img 
                                                  src={logoPreviews[company.id] || editFormData.logoUrl || company.logoUrl} 
                                                  alt="Prévisualisation du logo"
                                                  className="h-full w-full object-contain p-2"
                                                  onError={(e) => {
                                                    console.error('Erreur de chargement de la prévisualisation');
                                                    const imgElement = e.currentTarget;
                                                    const fallbackElement = imgElement.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                                                    if (fallbackElement) {
                                                      imgElement.style.display = 'none';
                                                      fallbackElement.classList.remove('hidden');
                                                    }
                                                  }}
                                                />
                                              </div>
                                              <button
                                                onClick={handleRemoveLogo}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md"
                                                title="Supprimer le logo"
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="h-32 w-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                                              <Camera className="h-8 w-8 text-gray-400" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      renderCompanyLogo(company, 'large')
                                    )}
                                  </div>

                                  {/* Informations et contrôles du logo */}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 mb-2">Logo de l'entreprise</p>
                                    
                                    {editingCompany === company.id ? (
                                      <div className="space-y-4">
                                        {/* Zone d'upload */}
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                                          <div className="text-center">
                                            <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                                            <div className="text-sm text-gray-600 mb-2">
                                              <label htmlFor={`logo-upload-${company.id}`} className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                                                Télécharger un logo
                                              </label>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                              JPEG, PNG jusqu'à 5MB
                                            </p>
                                            <input
                                              id={`logo-upload-${company.id}`}
                                              type="file"
                                              accept="image/jpeg,image/jpg,image/png"
                                              onChange={(e) => handleLogoUpload(e, company.id)}
                                              className="hidden"
                                              disabled={uploadingLogo}
                                            />
                                          </div>
                                        </div>

                                        {/* Champ URL manuel */}
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Ou saisir une URL :
                                          </label>
                                          <input
                                            type="text"
                                            value={editFormData.logoUrl}
                                            onChange={(e) => {
                                              setEditFormData(prev => ({ ...prev, logoUrl: e.target.value }));
                                              if (e.target.value) {
                                                // Mettre à jour la prévisualisation pour cette entreprise spécifique
                                                setLogoPreviews(prev => ({ ...prev, [company.id]: e.target.value }));
                                              }
                                            }}
                                            placeholder="/logos/mon-logo.png"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                          />
                                        </div>

                                        {uploadingLogo && (
                                          <div className="flex items-center text-sm text-blue-600">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                            Sauvegarde en cours...
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {company.logoUrl ? (
                                          <div>
                                            <p className="text-sm text-green-600 font-medium">✓ Logo configuré et affiché</p>
                                            <p className="text-xs text-gray-500 font-mono">{company.logoUrl}</p>
                                          </div>
                                        ) : (
                                          <p className="text-sm text-gray-500">Aucun logo configuré</p>
                                        )}
                                        <p className="text-xs text-gray-400">
                                          Le logo s'affiche comme photo d'identité dans toute l'application
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-600">Nom de l'entreprise</p>
                                    {editingCompany === company.id ? (
                                      <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                                      />
                                    ) : (
                                      <p className="text-lg font-bold text-gray-900">{company.name}</p>
                                    )}
                                  </div>
                                  <Building2 className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-600">N° SIRET</p>
                                    {editingCompany === company.id ? (
                                      <input
                                        type="text"
                                        value={editFormData.siret}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, siret: e.target.value }))}
                                        placeholder="12345678901234"
                                        maxLength={14}
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                                      />
                                    ) : (
                                      <p className="text-lg font-mono text-gray-900">{details.siret}</p>
                                    )}
                                  </div>
                                  <Hash className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-600">Code APE</p>
                                    {editingCompany === company.id ? (
                                      <input
                                        type="text"
                                        value={editFormData.apeCode}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, apeCode: e.target.value }))}
                                        placeholder="1234Z"
                                        maxLength={5}
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                                      />
                                    ) : (
                                      <p className="text-lg font-mono text-gray-900">{details.ape}</p>
                                    )}
                                  </div>
                                  <FileText className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>

                              {/* Convention collective */}
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Convention collective</p>
                                    {editingCompany === company.id ? (
                                      <textarea
                                        value={editFormData.conventionCollective}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, conventionCollective: e.target.value }))}
                                        placeholder="Nom complet de la convention collective applicable"
                                        rows={3}
                                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                      />
                                    ) : (
                                      <p className="text-sm text-gray-900 mt-1 leading-relaxed">
                                        {company.conventionCollective || 'Non renseignée'}
                                      </p>
                                    )}
                                  </div>
                                  <BookOpen className="h-5 w-5 text-gray-400 mt-1" />
                                </div>
                              </div>
                            </div>

                            {/* Boutons de sauvegarde/annulation */}
                            {editingCompany === company.id && (
                              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={handleSaveCompany}
                                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                  Enregistrer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Coordonnées */}
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <Mail className="h-5 w-5 mr-2 text-green-600" />
                              Coordonnées
                            </h3>
                            
                            <div className="space-y-4">
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Adresse</p>
                                    {editingCompany === company.id ? (
                                      <div className="mt-2 space-y-2">
                                        <input
                                          type="text"
                                          value={editFormData.address.street}
                                          onChange={(e) => setEditFormData(prev => ({ 
                                            ...prev, 
                                            address: { ...prev.address, street: e.target.value }
                                          }))}
                                          placeholder="Rue, avenue, boulevard..."
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                          <input
                                            type="text"
                                            value={editFormData.address.postalCode}
                                            onChange={(e) => setEditFormData(prev => ({ 
                                              ...prev, 
                                              address: { ...prev.address, postalCode: e.target.value }
                                            }))}
                                            placeholder="Code postal"
                                            maxLength={5}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                          />
                                          <input
                                            type="text"
                                            value={editFormData.address.city}
                                            onChange={(e) => setEditFormData(prev => ({ 
                                              ...prev, 
                                              address: { ...prev.address, city: e.target.value }
                                            }))}
                                            placeholder="Ville"
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-base text-gray-900 mt-1 leading-relaxed">
                                        {formatAddress(details.address)}
                                      </p>
                                    )}
                                  </div>
                                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-600">N° téléphone</p>
                                    {editingCompany === company.id ? (
                                      <input
                                        type="tel"
                                        value={editFormData.phone}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="01 23 45 67 89"
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                                      />
                                    ) : (
                                      <p className="text-lg font-mono text-gray-900">{details.phone}</p>
                                    )}
                                  </div>
                                  <Phone className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Adresse mail</p>
                                    {editingCompany === company.id ? (
                                      <input
                                        type="email"
                                        value={editFormData.email}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="contact@entreprise.fr"
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                                      />
                                    ) : (
                                      <p className="text-base text-gray-900 truncate">{company.email || 'Non renseignée'}</p>
                                    )}
                                  </div>
                                  <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Email administrateur</p>
                                    {editingCompany === company.id ? (
                                      <input
                                        type="email"
                                        value={editFormData.adminEmail}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                                        placeholder="admin@entreprise.fr"
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                                      />
                                    ) : (
                                      <p className="text-base text-gray-900 truncate">{company.adminEmail || 'Non renseigné'}</p>
                                    )}
                                  </div>
                                  <Mail className="h-5 w-5 text-blue-400" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex justify-end space-x-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/company/${company.id}`);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Gérer l'entreprise
                            <ChevronRight size={16} className="ml-2" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Message si aucune entreprise trouvée */}
        {filteredCompanies.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune entreprise trouvée</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Aucune entreprise ne correspond à votre recherche' : 'Aucune entreprise configurée'}
            </p>
          </div>
        )}

        {/* Message d'information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Gestion des logos d'entreprise
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  <strong>📸 Photo d'identité :</strong> Le logo s'affiche comme une photo d'identité de l'entreprise dans toute l'application.
                </p>
                <p className="mt-1">
                  <strong>💾 Sauvegarde automatique :</strong> Les logos uploadés sont automatiquement sauvegardés dans le dossier public/logos/ 
                  et restent associés à l'entreprise de façon permanente.
                </p>
                <p className="mt-1">
                  <strong>🔧 Formats supportés :</strong> JPEG et PNG jusqu'à 5MB. Vous pouvez aussi saisir une URL directement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CompaniesList;