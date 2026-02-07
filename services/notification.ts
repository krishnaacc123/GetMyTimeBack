
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error("Error requesting notification permission", e);
      return false;
    }
  }

  return false;
};

interface NotificationAction {
  action: string;
  title: string;
}

export const sendNotification = async (title: string, body: string, actions?: NotificationAction[]): Promise<boolean> => {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') {
    try {
        const n = new Notification(title, { 
            body,
            icon: 'https://picsum.photos/192/192', // Random icon for visual flair
            silent: false,
        });
        
        // Auto close after a few seconds
        setTimeout(() => n.close(), 5000);
        return true;
    } catch (e) {
        console.error("Notification failed", e);
        return false;
    }
  } else if (Notification.permission !== 'denied') {
      // Try to request if not explicitly denied, then send
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            return sendNotification(title, body, actions);
        }
      } catch (e) {
        console.error("Error requesting permission inside send", e);
      }
  }
  return false;
};
