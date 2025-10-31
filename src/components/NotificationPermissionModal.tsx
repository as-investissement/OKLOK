import React from 'react';
import { Bell, BellOff } from 'lucide-react';

interface NotificationPermissionModalProps {
  onAccept: () => void;
  onRefuse: () => void;
}

export default function NotificationPermissionModal({ onAccept, onRefuse }: NotificationPermissionModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 mx-4">
        {/* Icône et titre compacts */}
        <div className="flex items-center justify-center mb-3">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-full shadow-lg">
            <Bell className="w-6 h-6 text-white" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
          Notifications
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
          Restez informé des événements importants :
        </p>

        {/* Liste compacte avec puces */}
        <ul className="mb-4 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2 font-bold">•</span>
            <span>Rappels de soumission</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2 font-bold">•</span>
            <span>Validation de vos heures</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2 font-bold">•</span>
            <span>Messages importants</span>
          </li>
        </ul>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
          Modifiable dans les paramètres
        </p>

        {/* Boutons compacts */}
        <div className="flex gap-2">
          <button
            onClick={onRefuse}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-blue-900 transition-all duration-200 font-medium text-sm shadow-sm active:scale-95"
          >
            <BellOff className="w-4 h-4" />
            Refuser
          </button>
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl active:scale-95"
          >
            <Bell className="w-4 h-4" />
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
