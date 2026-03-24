import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export function useNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Request permission on Android 13+
    const requestPermission = async () => {
      try {
        const { display } = await LocalNotifications.requestPermissions();
        if (display !== 'granted') {
          console.warn('Notification permission not granted');
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    };

    requestPermission();
  }, []);

  const sendNotification = async (title: string, body: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) }, // near-instant
            sound: undefined,
            actionTypeId: '',
            extra: null,
          },
        ],
      });
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  return { sendNotification };
}
