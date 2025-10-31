import React, { useState } from 'react';
import { User } from '../types';
import { X, Mail, Send, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface AddEmployeeModalProps {
  onClose: () => void;
  onSave: (employee: Omit<User, 'id'>) => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ onClose, onSave }) => {
  const { companies, currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'Employé',
    companyId: '',
    birthDate: '',
    hireDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Empêcher la fermeture du modal lors du changement de fenêtre
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Empêcher la fermeture de la fenêtre si le modal est ouvert
      e.preventDefault();
      e.returnValue = 'Vous avez un formulaire en cours. Êtes-vous sûr de vouloir quitter ?';
      return e.returnValue;
    };

    const handleVisibilityChange = () => {
      // Ne rien faire quand la visibilité change (changement d'onglet)
      // Le modal reste ouvert
    };

    const handleBlur = () => {
      // Ne rien faire quand la fenêtre perd le focus
      // Le modal reste ouvert
    };

    // Ajouter les écouteurs d'événements
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Nettoyer les écouteurs lors du démontage
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  // Fonction pour formater le prénom (première lettre en majuscule, reste en minuscule)
  const formatFirstName = (name: string) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Fonction pour formater le nom (tout en majuscules)
  const formatLastName = (name: string) => {
    return name.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const fullName = `${formatFirstName(formData.firstName)} ${formatLastName(formData.lastName)}`.trim();
    
    try {
      // Créer l'employé SANS envoyer d'invitation
      onSave({
        name: fullName,
        email: formData.email,
        role: 'employee',
        department: formData.role,
        companyId: formData.companyId,
        birthDate: formData.birthDate,
        hireDate: formData.hireDate,
        archived: false
      });
      
      onClose();

    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Ajouter un employé
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Prénom"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Première lettre en majuscule, reste en minuscule</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de famille
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="NOM DE FAMILLE"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Automatiquement converti en majuscules</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email personnelle
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="exemple@gmail.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-2" />
                Date de naissance
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                max={new Date().toISOString().split('T')[0]}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-2" />
                Date d'embauche
              </label>
              <input
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData(prev => ({ ...prev, hireDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                max={new Date().toISOString().split('T')[0]}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              >
                <option value="Employé">Employé</option>
                <option value="Conducteur de travaux">Conducteur de travaux</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entreprise
              </label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              >
                <option value="">Sélectionner une entreprise</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Ajout...
                </>
              ) : (
                'Ajouter l\'employé'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;