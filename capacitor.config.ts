import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cashbook.app',
  appName: 'CashBook',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#F59E0B',
      sound: 'beep.wav',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '320311380154-bubfj7h1kmah78gd57m820efq8oj5bq4.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
