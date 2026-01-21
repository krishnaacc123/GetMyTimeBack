export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

interface NotificationAction {
  action: string;
  title: string;
}

export const sendNotification = (title: string, body: string, actions?: NotificationAction[]) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    // Check if we are in a service worker context (PWA) or standard
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
         navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body,
                icon: 'https://picsum.photos/192/192', // Placeholder icon
                vibrate: [200, 100, 200],
                actions: actions,
                tag: 'focus-timer', // Replaces previous notification with same tag
                renotify: true,
                requireInteraction: true // Keeps it on screen
            } as any);
         });
      } else {
        new Notification(title, { body });
      }
    } catch (e) {
        new Notification(title, { body });
    }
  }
};