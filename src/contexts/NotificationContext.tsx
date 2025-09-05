import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Achievement } from '../types'; // Assuming Achievement type is defined in types/index.ts

interface Notification {
  id: string;
  type: 'achievement';
  achievement: Achievement;
}

interface NotificationContextType {
  showNotification: (type: 'achievement', achievement: Achievement) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((type: 'achievement', achievement: Achievement) => {
    const id = Math.random().toString(36).substring(2, 9); // Simple unique ID
    const newNotification: Notification = { id, type, achievement };
    setNotifications((prev) => [...prev, newNotification]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <AchievementNotification
            key={notification.id}
            notification={notification}
            onDismiss={() => dismissNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

// Inline AchievementNotification component for simplicity within this file
// In a real app, this would be a separate file like src/components/common/AchievementNotification.tsx
interface AchievementNotificationProps {
  notification: Notification;
  onDismiss: () => void;
}

function AchievementNotification({ notification, onDismiss }: AchievementNotificationProps) {
  const { achievement } = notification;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 flex items-center space-x-4 animate-fade-in-up">
      <div className="flex-shrink-0">
        {/* Replace with actual badge icon if available */}
        <img src={achievement.badge_icon_url || '/vite.svg'} alt="Achievement Badge" className="h-10 w-10 rounded-full" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Achievement Unlocked!</p>
        <p className="text-md text-indigo-600 font-bold">{achievement.name}</p>
        <p className="text-xs text-gray-500">{achievement.description}</p>
      </div>
      <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
        &times;
      </button>
    </div>
  );
}