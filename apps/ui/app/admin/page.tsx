'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminReset, adminSeed, adminResetSeed, type AdminResetResponse, type AdminSeedResponse, type AdminResetSeedResponse, type ApiConfig } from '@/lib/api';

export default function AdminPage() {
  const [tenantId, setTenantId] = useState('demo');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AdminResetResponse | AdminSeedResponse | AdminResetSeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config: ApiConfig = {
    tenantId,
    apiKey,
  };

  const handleReset = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await adminReset(tenantId, config);
      setResponse(result);
    } catch (err: any) {
      setError(err.message || 'Failed to reset tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await adminSeed(tenantId, config);
      setResponse(result);
    } catch (err: any) {
      setError(err.message || 'Failed to seed tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSeed = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await adminResetSeed(tenantId, config);
      setResponse(result);
    } catch (err: any) {
      setError(err.message || 'Failed to reset-seed tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Reset and seed demo tenant data
          </p>
          <div className="mt-4 flex gap-4">
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Chat
            </Link>
            <Link
              href="/documents"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Documents →
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your X-API-Key"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleReset}
                disabled={loading || !apiKey.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Tenant
              </button>
              <button
                onClick={handleSeed}
                disabled={loading || !apiKey.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Seed Tenant
              </button>
              <button
                onClick={handleResetSeed}
                disabled={loading || !apiKey.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset + Seed
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200">Processing...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200 font-medium">Error:</p>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {response && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-800 dark:text-green-200 font-medium mb-2">Success:</p>
            <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-auto bg-white dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            <strong>Warning:</strong> Reset operations are destructive and cannot be undone. 
            All documents, chunks, and vectors for the tenant will be permanently deleted.
          </p>
        </div>
      </div>
    </div>
  );
}
