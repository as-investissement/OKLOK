import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ExternalLink, Copy, Check } from 'lucide-react';

const EmailRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  
  const token = searchParams.get('token');
  const inviteId = searchParams.get('inviteId');
  
  // Construire l'URL locale qui fonctionne
  const localUrl = `${window.location.origin}/activate-account?token=${token}&inviteId=${inviteId}`;
  
  const copyUrl = () => {
    navigator.clipboard.writeText(localUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInNewTab = () => {
    window.open(localUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-center">
          <h1 className="text-white text-2xl font-bold mb-2">🔗 Redirection sécurisée</h1>
          <h2 className="text-blue-100 text-lg">AS INVESTISSEMENT</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Accès depuis un email détecté
            </h3>
            <p className="text-gray-600">
              Pour des raisons de sécurité, veuillez utiliser l'une des options ci-dessous pour accéder à votre invitation.
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Option 1: Ouvrir dans un nouvel onglet */}
            <button
              onClick={openInNewTab}
              className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-3"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="font-semibold">Ouvrir dans un nouvel onglet</span>
            </button>

            {/* Option 2: Copier le lien */}
            <button
              onClick={copyUrl}
              className="w-full bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-3"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span className="font-semibold">
                {copied ? 'Lien copié !' : 'Copier le lien'}
              </span>
            </button>
          </div>

          {/* URL à copier */}
          <div className="mt-6 p-3 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">Lien d'activation :</p>
            <code className="text-xs text-gray-800 break-all">
              {localUrl}
            </code>
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-yellow-800 font-semibold text-sm mb-2">📋 Instructions</h4>
            <div className="text-yellow-700 text-sm space-y-1">
              <p>1. Cliquez sur "Ouvrir dans un nouvel onglet"</p>
              <p>2. Ou copiez le lien et collez-le dans votre navigateur</p>
              <p>3. Vous accéderez alors aux options de téléchargement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailRedirect;