import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Project } from '../types';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onSave: (project: Project) => Promise<void>;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose, onSave }) => {
  const { companies } = useAuth();
  const [formData, setFormData] = useState({
    name: project.name,
    reference: project.reference || '',
    companyId: project.companyId || '',
    secondaryCompanies: project.secondaryCompanies || [],
    address: {
      number: (typeof project.address === 'object' && project.address?.number) || '',
      street: (typeof project.address === 'object' && project.address?.street) || '',
      streetName: (typeof project.address === 'object' && project.address?.streetName) || '',
      postalCode: (typeof project.address === 'object' && project.address?.postalCode) || '',
      city: (typeof project.address === 'object' && project.address?.city) || ''
    },
    active: project.active
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.companyId) {
      setError('Veuillez sélectionner une entreprise principale');
      return;
    }

    if (!formData.name.trim()) {
      setError('Le nom du chantier est requis');
      return;
    }

    try {
      setLoading(true);
      const updatedProject: Project = {
        ...project,
        name: formData.name.trim().toUpperCase(),
        reference: formData.reference.trim(),
        companyId: formData.companyId,
        secondaryCompanies: formData.secondaryCompanies.filter(id => id !== ''),
        address: formData.address.number || formData.address.street || formData.address.streetName || formData.address.postalCode || formData.address.city ? {
          number: formData.address.number.trim(),
          street: formData.address.street.trim(),
          streetName: formData.address.streetName.trim(),
          postalCode: formData.address.postalCode.trim(),
          city: formData.address.city.trim()
        } : undefined,
        active: formData.active
      };
      
      await onSave(updatedProject);
      onClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la modification du chantier');
    } finally {
      setLoading(false);
    }
  };

  const handleSecondaryCompanyChange = (index: number, value: string) => {
    const newSecondaryCompanies = [...formData.secondaryCompanies];
    newSecondaryCompanies[index] = value;
    setFormData(prev => ({ ...prev, secondaryCompanies: newSecondaryCompanies }));
  };

  const addSecondaryCompany = () => {
    if (formData.secondaryCompanies.length < 3) {
      setFormData(prev => ({
        ...prev,
        secondaryCompanies: [...prev.secondaryCompanies, '']
      }));
    }
  };

  const removeSecondaryCompany = (index: number) => {
    const newSecondaryCompanies = formData.secondaryCompanies.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, secondaryCompanies: newSecondaryCompanies }));
  };

  const availableSecondaryCompanies = companies.filter(company => 
    company.id !== formData.companyId && 
    !formData.secondaryCompanies.includes(company.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Modifier le chantier</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Informations de base */}
            <div className="space-y-4">
              {/* Nom et référence sur la même ligne */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du chantier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    required
                    disabled={loading}
                    placeholder="ENTREZ LE NOM DU CHANTIER"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Le nom sera automatiquement converti en majuscules</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                    placeholder="Référence du chantier"
                  />
                </div>
              </div>

              {/* Checkbox chantier actif */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Chantier actif
                </label>
              </div>
            </div>

            {/* Attribution des entreprises */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Attribution des entreprises</h3>
              
              {/* Entreprise principale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entreprise principale <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.companyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                >
                  <option value="">Sélectionner l'entreprise principale</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entreprises secondaires */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Entreprises secondaires (optionnel)
                  </label>
                  {formData.secondaryCompanies.length < 3 && (
                    <button
                      type="button"
                      onClick={addSecondaryCompany}
                      className="text-sm text-blue-600 hover:text-blue-800"
                      disabled={loading || availableSecondaryCompanies.length === 0}
                    >
                      + Ajouter une entreprise
                    </button>
                  )}
                </div>
                
                {formData.secondaryCompanies.map((companyId, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <select
                      value={companyId}
                      onChange={(e) => handleSecondaryCompanyChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">Sélectionner une entreprise</option>
                      {companies
                        .filter(company => 
                          company.id !== formData.companyId && 
                          (!formData.secondaryCompanies.includes(company.id) || company.id === companyId)
                        )
                        .map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeSecondaryCompany(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      disabled={loading}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                
                <p className="text-xs text-gray-500">
                  Vous pouvez ajouter jusqu'à 3 entreprises secondaires
                </p>
              </div>
            </div>

            {/* Adresse détaillée */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Adresse du chantier</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <input
                    type="text"
                    value={formData.address.number}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, number: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                    placeholder="N°"
                  />
                </div>

                <div>
                  <select
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Type de rue</option>
                    <option value="Rue">Rue</option>
                    <option value="Avenue">Avenue</option>
                    <option value="Boulevard">Boulevard</option>
                    <option value="Place">Place</option>
                    <option value="Impasse">Impasse</option>
                    <option value="Allée">Allée</option>
                    <option value="Chemin">Chemin</option>
                    <option value="Route">Route</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={formData.address.streetName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, streetName: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                    placeholder="Nom de la rue"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={formData.address.postalCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, postalCode: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                    placeholder="Code postal"
                    maxLength={5}
                  />
                </div>

                <div className="md:col-span-3">
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                    placeholder="Ville"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Modification...' : 'Modifier le chantier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;