import React, { useState } from 'react';
import { X, Building2, Mail, AlertTriangle, Upload, Image as ImageIcon } from 'lucide-react';
import { Company } from '../types';
import { uploadCompanyLogo } from '../lib/storage';

interface AddCompanyModalProps {
  onClose: () => void;
  onSave: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    adminEmail: '',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      setError('Veuillez sélectionner un fichier JPEG, PNG ou WebP');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Le fichier est trop volumineux. Taille maximum : 2MB');
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);

      const logoUrl = await uploadCompanyLogo(file, formData.name || 'entreprise');

      if (!logoUrl) {
        throw new Error('Échec de l\'upload du logo');
      }

      setFormData(prev => ({ ...prev, logoUrl }));
    } catch (err) {
      setError('Erreur lors de l\'upload du logo');
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Le nom de l\'entreprise est requis');
      return;
    }

    if (!formData.email.trim()) {
      setError('L\'adresse email est requise');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        name: formData.name.trim(),
        email: formData.email.trim(),
        adminEmail: formData.adminEmail.trim(),
        logoUrl: formData.logoUrl.trim()
      });
      onClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la création de l\'entreprise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Nouvelle entreprise</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="h-4 w-4 inline mr-2" />
                Nom de l'entreprise <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-2" />
                Adresse email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
                placeholder="contact@entreprise.fr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-2" />
                Email administrateur
              </label>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                placeholder="admin@entreprise.fr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo de l'entreprise
              </label>
              <div className="space-y-2">
                {logoPreview || formData.logoUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={logoPreview || formData.logoUrl}
                      alt="Logo"
                      className="h-20 w-20 object-contain border border-gray-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(null);
                        setFormData(prev => ({ ...prev, logoUrl: '' }));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      disabled={loading || uploadingLogo}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploadingLogo ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Cliquez pour uploader un logo</p>
                          <p className="text-xs text-gray-400">PNG, JPG ou WebP (max 2MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleLogoUpload}
                      disabled={loading || uploadingLogo}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer l\'entreprise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompanyModal;