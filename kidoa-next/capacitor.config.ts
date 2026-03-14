import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kidoa.app',
  appName: 'Kidoa',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
