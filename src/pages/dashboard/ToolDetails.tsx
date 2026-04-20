import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Code,
  Webhook,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Tool {
  tool_id: string;
  name: string;
  description: string;
  api_schema: {
    url: string;
  };
  created_at?: number;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const ToolDetails = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const { user } = useAuth();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTool = async () => {
      if (!user || !toolId) return;

      try {
        setLoading(true);
        const response = await fetch(
          `${BACKEND_URL}/tools/${user.uid}/${toolId}`,
          {
            headers: {
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch tool details');
        }

        const data = await response.json();
        setTool(data);
      } catch (error) {
        console.error('Error fetching tool:', error);
        setError('Failed to load tool details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTool();
  }, [user, toolId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-primary-400" />
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-2">
              {error || 'Tool not found'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The tool you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link
              to="/dashboard/tools"
              className="inline-flex items-center text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tools
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          to="/dashboard/tools"
          className="inline-flex items-center text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Tools
        </Link>
      </div>

      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-dark-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
                <Code className="w-6 h-6 text-primary dark:text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
                  {tool.name}
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  {tool.created_at && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Created {new Date(tool.created_at * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <a
              href={tool.api_schema.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50/50 dark:bg-primary-400/10 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Visit Webhook URL</span>
            </a>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
                Description
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {tool.description}
              </p>
            </div>

            <div>
              <h2 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
                Webhook Configuration
              </h2>
              <div className="bg-gray-50 dark:bg-dark-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Webhook className="w-5 h-5 text-primary dark:text-primary-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Webhook URL
                    </span>
                  </div>
                  <code className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {tool.api_schema.url}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolDetails;