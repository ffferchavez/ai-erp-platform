'use client';

import { useState, useEffect } from 'react';
import { listDocuments, deleteDocument, type Document, type ApiConfig, ApiError } from '@/lib/api';

export default function DocumentsPage() {
  const [tenantId, setTenantId] = useState('demo');
  const [apiKey, setApiKey] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const config: ApiConfig = {
    tenantId,
    apiKey: apiKey.trim() || undefined,
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listDocuments(config);
      setDocuments(result);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('API key is required. Please enter your X-API-Key.');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only auto-fetch if API key is provided
    if (apiKey.trim()) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, apiKey]);

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setDeletingId(documentId);
    setError(null);

    try {
      await deleteDocument(documentId, config);
      // Refresh the list after deletion
      await fetchDocuments();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(`Failed to delete: ${err.message}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Document Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage documents for your tenant
          </p>
        </header>

        {/* Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tenant ID
              </label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="demo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                X-API-Key (Required)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your API key"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Required for viewing and deleting documents
              </p>
            </div>
            <button
              onClick={fetchDocuments}
              disabled={loading || !apiKey.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Documents List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Documents ({documents.length})
            </h2>
          </div>
          {loading && documents.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {apiKey.trim()
                ? 'No documents found. Add documents via the API to see them here.'
                : 'Enter your API key and click Refresh to load documents.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Source: {doc.source}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                        <span>ID: {doc.id}</span>
                        {doc.created_at && (
                          <span>
                            Created: {new Date(doc.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id || !apiKey.trim()}
                      className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <a
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Chat
          </a>
        </div>
      </div>
    </div>
  );
}
