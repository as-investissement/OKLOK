const ACTIVATION_PARAMS_KEY = 'pending_activation_params';

export interface ActivationParams {
  token: string;
  inviteId: string;
  timestamp: number;
}

export const deepLinkHandler = {
  saveActivationParams(token: string, inviteId: string): void {
    try {
      const params: ActivationParams = {
        token,
        inviteId,
        timestamp: Date.now()
      };
      localStorage.setItem(ACTIVATION_PARAMS_KEY, JSON.stringify(params));
      console.log('✅ Paramètres d\'activation sauvegardés:', { token, inviteId });
    } catch (error) {
      console.error('❌ Erreur sauvegarde paramètres:', error);
    }
  },

  getActivationParams(): ActivationParams | null {
    try {
      const stored = localStorage.getItem(ACTIVATION_PARAMS_KEY);
      if (!stored) return null;

      const params: ActivationParams = JSON.parse(stored);

      const ONE_HOUR = 60 * 60 * 1000;
      if (Date.now() - params.timestamp > ONE_HOUR) {
        console.log('⚠️ Paramètres d\'activation expirés');
        this.clearActivationParams();
        return null;
      }

      return params;
    } catch (error) {
      console.error('❌ Erreur lecture paramètres:', error);
      return null;
    }
  },

  clearActivationParams(): void {
    try {
      localStorage.removeItem(ACTIVATION_PARAMS_KEY);
      console.log('✅ Paramètres d\'activation nettoyés');
    } catch (error) {
      console.error('❌ Erreur nettoyage paramètres:', error);
    }
  },

  parseDeepLink(url: string): { token: string; inviteId: string } | null {
    try {
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      const inviteId = urlObj.searchParams.get('inviteId');

      if (token && inviteId) {
        console.log('✅ Deep link parsé:', { token, inviteId });
        return { token, inviteId };
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur parsing deep link:', error);
      return null;
    }
  }
};
