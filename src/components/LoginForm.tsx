import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SupabaseConnectionHelper from './SupabaseConnectionHelper';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { deepLinkHandler } from '../lib/deepLinkHandler';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const { login, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkActivationParams = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');

        if (Capacitor.isNativePlatform()) {
          const params = deepLinkHandler.getActivationParams();

          if (params) {
            console.log('🔗 Paramètres d\'activation détectés, redirection...');
            navigate(`/activate-account?token=${params.token}&inviteId=${params.inviteId}&platform=mobile`);
            return;
          }
        }
      } catch (error) {
        console.warn('⚠️ Vérification activation non disponible (mode web)');
      }

      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
    };

    checkActivationParams();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      // Délai pour voir l'animation
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
      console.error(err);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordMessage('');
    
    try {
      console.log('🔐 === DÉBUT FORGOT PASSWORD ===');
      console.log('📧 Email:', forgotPasswordEmail);
      console.log('🌐 URL Edge Function:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forgot-password`);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forgot-password`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotPasswordEmail.toLowerCase()
        })
      });

      console.log('📡 Réponse Edge Function - Status:', response.status);
      console.log('📡 Réponse Edge Function - OK:', response.ok);

      const result = await response.json();
      console.log('📋 Résultat:', result);

      if (!response.ok) {
        console.error('❌ Erreur Edge Function:', result);
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
      }

      console.log('✅ === FORGOT PASSWORD RÉUSSI ===');
      setForgotPasswordMessage('Un email de réinitialisation a été envoyé à votre adresse.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
        setForgotPasswordMessage('');
      }, 3000);
      
    } catch (err) {
      console.error('❌ Exception reset password:', err);
      setForgotPasswordMessage((err as Error).message);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Helper de connexion Supabase */}
      {!isSupabaseConfigured && <SupabaseConnectionHelper />}
      
      {/* Animation de chargement en plein écran */}
      {loading && (
        <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
          <div className="text-center">
            <div className="loading-logo-container">
              <img
                src="/logos/logoas.png"
                alt="AS Investissement"
                className="loading-logo"
              />
            </div>
            <p className="mt-8 text-lg font-medium text-white animate-pulse">
              Connexion en cours...
            </p>
          </div>
        </div>
      )}

      <div className={`max-w-md w-full space-y-2 transition-all duration-500 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="text-center">
          {/* Logo AS INVESTISSEMENT */}
          <div className="mb-6">
            <img
             src="/logos/logoas.png"
              alt="AS INVESTISSEMENT"
             className="mx-auto h-64 sm:h-72 md:h-80 lg:h-96 w-auto object-contain relative z-20 opacity-100"
              style={{
                maxWidth: '90vw',
                display: 'block',
                position: 'relative',
                zIndex: 20
              }}
             onError={(e) => {
               console.error('Erreur chargement logo:', e);
               e.currentTarget.style.display = 'none';
             }}
            />
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-white">Feuilles de Temps</h2>
          <p className="mt-1 text-sm text-gray-300">Connectez-vous pour accéder à vos feuilles de temps</p>
        </div>
        <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Adresse email</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">Mot de passe</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={loading}
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={() => setShowPassword(true)}
                onTouchEnd={() => setShowPassword(false)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm mt-2">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-gray-800 bg-gradient-radial from-white via-gray-200 to-gray-600 hover:from-gray-50 hover:via-gray-300 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
              style={{
                background: 'radial-gradient(ellipse at center, white 0%, #e5e7eb 40%, #374151 100%)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'radial-gradient(ellipse at center, #f9fafb 0%, #d1d5db 40%, #1f2937 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'radial-gradient(ellipse at center, white 0%, #e5e7eb 40%, #374151 100%)';
              }}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <LogIn className={`h-5 w-5 text-gray-800 group-hover:text-gray-900 transition-transform duration-300 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </span>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <p className="text-gray-300">
              Accès réservé aux utilisateurs invités
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-300 hover:text-blue-100 text-sm underline transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-400">
                Seuls les employés invités par un administrateur peuvent créer un compte
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Mot de passe oublié */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Mot de passe oublié</h3>
              
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="votre.email@exemple.com"
                    required
                    disabled={forgotPasswordLoading}
                  />
                </div>

                {forgotPasswordMessage && (
                  <div className={`p-3 rounded-md ${
                    forgotPasswordMessage.includes('envoyé') 
                      ? 'bg-green-50 border border-green-200 text-green-700' 
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    <p className="text-sm">{forgotPasswordMessage}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail('');
                      setForgotPasswordMessage('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={forgotPasswordLoading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? 'Envoi...' : 'Envoyer le lien'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Styles CSS pour l'animation */}
      <style>{`
        .loading-logo-container {
          position: relative;
          display: inline-block;
        }

        .loading-logo {
          width: min(350px, 85vw);
          height: min(350px, 85vw);
          object-fit: contain;
          animation: logoRotate 2s linear infinite;
          transform-origin: center;
        }

        @keyframes logoRotate {
          0% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(90deg) scale(1.1);
          }
          50% {
            transform: rotate(180deg) scale(1.2);
          }
          75% {
            transform: rotate(270deg) scale(1.1);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        /* Animation d'entrée pour le conteneur de chargement */
        .loading-logo-container::before {
          content: '';
          position: absolute;
          top: -20px;
          left: -20px;
          right: -20px;
          bottom: -20px;
          border: 2px solid transparent;
          border-radius: 50%;
          animation: borderRotate 4s linear infinite;
        }

        @keyframes borderRotate {
          0% {
            border-color: transparent transparent rgba(255, 255, 255, 0.3) transparent;
            transform: rotate(0deg);
          }
          25% {
            border-color: transparent rgba(255, 255, 255, 0.3) transparent transparent;
          }
          50% {
            border-color: rgba(255, 255, 255, 0.3) transparent transparent transparent;
          }
          75% {
            border-color: transparent transparent transparent rgba(255, 255, 255, 0.3);
          }
          100% {
            border-color: transparent transparent rgba(255, 255, 255, 0.3) transparent;
            transform: rotate(360deg);
          }
        }

        /* Effet de particules autour du logo */
        .loading-logo-container::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 400px;
          height: 400px;
          margin: -200px 0 0 -200px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          animation: ripple 3s ease-out infinite;
        }

        @keyframes ripple {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginForm;