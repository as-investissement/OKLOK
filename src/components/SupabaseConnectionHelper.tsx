import React, { useState } from 'react';
import { Database, ExternalLink, Copy, Check } from 'lucide-react';

const SupabaseConnectionHelper: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const projectUrl = 'https://aaayxughfmacudasrwqp.supabase.co';
  const dashboardUrl = 'https://supabase.com/dashboard/project/aaayxughfmacudasrwqp/settings/api';

  const copyProjectUrl = () => {
    navigator.clipboard.writeText(projectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Configuration Supabase requise
            </h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>Votre projet Supabase :</p>
              <div className="flex items-center space-x-2">
                <code className="bg-white px-2 py-1 rounded text-xs font-mono">
                  aaayxughfmacudasrwqp
                </code>
                <button
                  onClick={copyProjectUrl}
                  className="p-1 hover:bg-blue-100 rounded"
                  title="Copier l'URL"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
              
              <div className="mt-3">
                <a
                  href={dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Ouvrir Supabase Dashboard
                </a>
              </div>
              
              <div className="mt-2 text-xs text-blue-600">
                1. Cliquez sur le lien ci-dessus<br/>
                2. Copiez vos clés API<br/>
                3. Cliquez sur "Connect to Supabase" en haut à droite
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseConnectionHelper;