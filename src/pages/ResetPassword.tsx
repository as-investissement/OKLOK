import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const resetId = searchParams.get('resetId');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetData, setResetData] = useState<any>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const validateResetLink = async () => {
      if (!token || !resetId) {
        setError('Lien de réinitialisation invalide. Paramètres manquants.');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Validation du lien de réinitialisation:', { token, resetId });
        
        // Vérifier le token de réinitialisation
        const { data, error } = await supabase
          .from('user_invitations')
          .select(`
            id,
            email,
            token,
            employee_data,
            company_id,
            status,
            expires_at,
            companies(name)
          `)
          .eq('id', resetId)
          .eq('token', token)
          .eq('status', 'pending')
          .maybeSingle();

        if (error) {
          console.error('❌ Erreur Supabase:', error);
          throw new Error('Lien de réinitialisation invalide.');
        }
        
        if (!data) {
          setError('Lien de réinitialisation invalide ou expiré.');
          setLoading(false);
          return;
        }

        // Vérifier si le lien a expiré
        if (new Date(data.expires_at) < new Date()) {
          setError('Ce lien de réinitialisation a expiré.');
          setLoading(false);
          return;
        }

        // Vérifier que c'est bien un token de réinitialisation
        if (data.employee_data?.type !== 'password_reset') {
          setError('Ce lien n\'est pas valide pour la réinitialisation de mot de passe.');
          setLoading(false);
          return;
        }

        console.log('✅ Lien de réinitialisation valide:', data);
        setResetData(data);
        setLoading(false);
      } catch (err) {
        console.error('❌ Erreur:', err);
        setError(err.message || 'Erreur lors de la validation du lien.');
        setLoading(false);
      }
    };

    validateResetLink();
  }, [token, resetId]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Au moins 8 caractères');
    if (!/[A-Z]/.test(pwd)) errors.push('Une majuscule');
    if (!/[a-z]/.test(pwd)) errors.push('Une minuscule');
    if (!/[0-9]/.test(pwd)) errors.push('Un chiffre');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetData) return;

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(`Mot de passe invalide: ${passwordErrors.join(', ')}`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log('🔐 === DÉBUT RÉINITIALISATION MOT DE PASSE ===');
      console.log('📧 Email:', resetData.email);
      console.log('👤 Nom:', resetData.employee_data.name);

      // Appeler l'Edge Function pour mettre à jour le mot de passe de manière sécurisée
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-password`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          resetId: resetId,
          newPassword: password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Erreur Edge Function:', result);
        throw new Error(result.error || 'Erreur lors de la mise à jour du mot de passe');
      }

      console.log('✅ === MOT DE PASSE RÉINITIALISÉ AVEC SUCCÈS ===');
      
      // Afficher un message de succès et rediriger
      alert(`✅ MOT DE PASSE RÉINITIALISÉ !\n\n` +
            `👤 Utilisateur: ${resetData.employee_data.name}\n` +
            `📧 Email: ${resetData.email}\n` +
            `🔐 Nouveau mot de passe: Configuré avec succès\n\n` +
            `➡️ Redirection vers la page de connexion...`);

      // Rediriger vers la page de connexion avec l'email pré-rempli
      navigate(`/login?email=${encodeURIComponent(resetData.email)}`);
      
    } catch (err) {
      console.error('❌ Exception réinitialisation:', err);
      setError('Erreur lors de la réinitialisation du mot de passe.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validation du lien...</p>
        </div>
      </div>
    );
  }

  if (error && !resetData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lien invalide</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  if (!resetData) return null;

  const passwordErrors = validatePassword(password);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 text-center">
          <h1 className="text-white text-2xl font-bold mb-2">🔐 Nouveau mot de passe</h1>
          <h2 className="text-red-100 text-lg">{resetData.companies?.name || 'AS INVESTISSEMENT'}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Bonjour <strong>{resetData.employee_data.name}</strong>,
          </p>
          
          <p className="text-gray-600 mb-6">
            Créez votre nouveau mot de passe pour accéder à votre espace de feuilles de temps.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent pr-10"
                  placeholder="Choisissez un mot de passe sécurisé"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && passwordErrors.length > 0 && (
                <div className="mt-1 text-xs text-red-600">
                  Requis: {passwordErrors.join(', ')}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent pr-10"
                  placeholder="Confirmez votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <div className="mt-1 text-xs text-red-600">
                  Les mots de passe ne correspondent pas
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || passwordErrors.length > 0 || password !== confirmPassword}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-red-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Mise à jour en cours...
                </div>
              ) : (
                '🔑 Mettre à jour mon mot de passe'
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <h4 className="text-blue-800 font-semibold text-sm mb-1">🛡️ Sécurité</h4>
            <p className="text-blue-700 text-sm">
              Après la mise à jour, vous pourrez vous connecter immédiatement avec votre nouveau mot de passe.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            Lien de réinitialisation envoyé par la plateforme Feuilles de Temps
            <br />Ce lien expire dans 1 heure pour votre sécurité.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;