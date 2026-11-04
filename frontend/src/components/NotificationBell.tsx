// components/NotificationBell.tsx
import { useState } from 'react';
import { Notification } from '../types';

interface NotificationBellProps {
  notifications?: Notification[];
}

const NotificationBell = ({ notifications = [] }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Group notifications by class group
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const groupKey = notification.classGroupName || 'General';
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 relative"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
          <div className="py-1">
            {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => (
              <div key={groupName} className="border-b border-gray-200 last:border-b-0">
                <div className="px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700">
                  {groupName}
                </div>
                {groupNotifications.map((notification) => (
                  <div key={notification.id} className={`px-4 py-3 text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-900 bg-blue-50'}`}>
                    <div className="font-medium">{notification.title}</div>
                    <div className="mt-1">{notification.message}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleString()}
                      {notification.date && ` • ${notification.date} ${notification.startTime}-${notification.endTime}`}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-600">No new notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;