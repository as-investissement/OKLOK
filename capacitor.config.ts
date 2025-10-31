import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ahlem.feuillesdetemps',
  appName: 'Feuilles de Temps',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    App: {
      appUrlOpen: {
        enabled: true
      }
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    backgroundColor: '#ffffff'
  }
};

export default config;