import React, { useState, useMemo } from 'react';
import { X, Eye, EyeOff, Lock, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordValidation = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpperCase: /[A-Z]/.test(newPassword),
      hasLowerCase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
  }, [newPassword]);

  const isPasswordValid = useMemo(() => {
    return Object.values(passwordValidation).every(Boolean);
  }, [passwordValidation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas tous les critères de sécurité');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !user.email) {
        setError('Utilisateur non connecté');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setError('Le mot de passe actuel est incorrect');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess('Mot de passe mis à jour avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du mot de passe:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full transition-colors duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Changer le mot de passe
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="current-password-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                id="current-password-modal"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="block w-full px-3 py-2 pr-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors duration-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="new-password-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                id="new-password-modal"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full px-3 py-2 pr-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors duration-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {newPassword && (
              <div className="mt-3 space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Critères de sécurité :
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                      passwordValidation.minLength
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.minLength && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs transition-colors duration-200 ${
                      passwordValidation.minLength
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Au moins 8 caractères
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                      passwordValidation.hasUpperCase
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.hasUpperCase && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs transition-colors duration-200 ${
                      passwordValidation.hasUpperCase
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Une lettre majuscule (A-Z)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                      passwordValidation.hasLowerCase
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.hasLowerCase && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs transition-colors duration-200 ${
                      passwordValidation.hasLowerCase
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Une lettre minuscule (a-z)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                      passwordValidation.hasNumber
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.hasNumber && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs transition-colors duration-200 ${
                      passwordValidation.hasNumber
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Un chiffre (0-9)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                      passwordValidation.hasSpecialChar
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.hasSpecialChar && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs transition-colors duration-200 ${
                      passwordValidation.hasSpecialChar
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Un caractère spécial (!@#$%^&*...)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirm-password-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-password-modal"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-3 py-2 pr-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors duration-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-blue-900 rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
