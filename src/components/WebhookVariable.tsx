
import React, { useState } from 'react';
import { Link, Check, X, Edit } from 'lucide-react';

interface Props {
  url: string;
  onChange: (url: string) => void;
}

export const WebhookVariable: React.FC<Props> = ({
  url,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUrl, setEditedUrl] = useState(url);

  const handleSave = () => {
    onChange(editedUrl);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedUrl(url);
    setIsEditing(false);
  };

  return (
    <div className="p-4 bg-white dark:bg-dark-200 rounded-lg shadow-sm border border-gray-200 dark:border-dark-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
            <Link className="w-5 h-5 text-primary dark:text-primary-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Webhook URL
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Conversation Initiation Data
            </span>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-400 rounded-lg hover:bg-primary-50/50 dark:hover:bg-primary-400/10 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-100">
        <div className="space-y-2">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="url"
                value={editedUrl}
                onChange={(e) => setEditedUrl(e.target.value)}
                className="input text-sm flex-1"
                placeholder="https://example.com/webhook"
              />
              <button
                onClick={handleSave}
                className="p-1 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-700 dark:text-gray-300 break-all">
              {url || 'No webhook URL configured'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
