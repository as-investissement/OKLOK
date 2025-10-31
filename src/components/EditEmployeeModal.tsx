import React, { useState } from 'react';
import { User } from '../types';
import { X, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EditEmployeeModalProps {
  employee: User;
  onClose: () => void;
  onSave: (employee: User) => void;
}

const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({ employee, onClose, onSave }) => {
  const { companies } = useAuth();
  
  // Séparer le nom complet en prénom et nom
  const nameParts = employee.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  const [formData, setFormData] = useState({
    firstName: firstName,
    lastName: lastName,
    email: employee.email,
    role: employee.role,
    companyId: employee.companyId || '',
    birthDate: employee.birthDate || '',
    hireDate: employee.hireDate || ''
  });

  // Fonction pour formater le prénom (première lettre en majuscule, reste en minuscule)
  const formatFirstName = (name: string) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Fonction pour formater le nom (tout en majuscules)
  const formatLastName = (name: string) => {
    return name.toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reconstituer le nom complet avec le bon formatage
    const fullName = `${formatFirstName(formData.firstName)} ${formatLastName(formData.lastName)}`.trim();
    
    onSave({
      ...employee,
      name: fullName,
      email: formData.email,
      role: formData.role,
      companyId: formData.companyId,
      birthDate: formData.birthDate,
      department: employee.department,
      hireDate: formData.hireDate
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Modifier l'employé</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entreprise
              </label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner une entreprise</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

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
              />
              <p className="text-xs text-gray-500 mt-1">Automatiquement converti en majuscules</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
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
                max={new Date().toISOString().split('T')[0]} // Empêche de sélectionner une date future
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
                max={new Date().toISOString().split('T')[0]} // Empêche de sélectionner une date future
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'employee' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="employee">Employé</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployeeModal;