'use client';

import { useState } from 'react';
import Link from 'next/link';
import { chat, type ChatResponse, type Citation, type ApiConfig } from '@/lib/api';

export default function Home() {
  const [tenantId, setTenantId] = useState('demo');
  const [message, setMessage] = useState('');
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config: ApiConfig = {
    tenantId,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await chat(message, topK, config);
      setResponse(result);
      setMessage('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestQuery = async (testMessage: string) => {
    setMessage(testMessage);
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await chat(testMessage, topK, config);
      setResponse(result);
      setMessage('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI ERP Platform - Restaurant Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Chat with your AI assistant powered by RAG
          </p>
        </header>

        {/* Tenant Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
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

        {/* Test Query Buttons */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Example Queries
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTestQuery('What are your opening hours?')}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md text-sm transition-colors"
            >
              Opening Hours
            </button>
            <button
              onClick={() => handleTestQuery('How do I make a reservation?')}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md text-sm transition-colors"
            >
              Reservations
            </button>
            <button
              onClick={() => handleTestQuery('What allergens are in your menu?')}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md text-sm transition-colors"
            >
              Allergens
            </button>
            <button
              onClick={() => handleTestQuery('What is your address?')}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md text-sm transition-colors"
            >
              Address
            </button>
          </div>
        </div>

        {/* Chat Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ask a question about the restaurant..."
                disabled={loading}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Top K:
                </label>
                <input
                  type="number"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                  min={1}
                  max={20}
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="space-y-6">
            {/* Answer */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Assistant Answer
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {response.answer}
              </p>
            </div>

            {/* Citations */}
            {response.citations && response.citations.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Citations ({response.citations.length})
                </h2>
                <div className="space-y-4">
                  {response.citations.map((citation: Citation) => (
                    <div
                      key={citation.chunk_id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {citation.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Source: {citation.source} • Chunk #{citation.chunk_index}
                          </p>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                          Score: {citation.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                        {citation.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
          <Link
            href="/documents"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Documents →
          </Link>
          <Link
            href="/admin"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Admin Panel →
          </Link>
        </div>
      </div>
    </div>
  );
}
