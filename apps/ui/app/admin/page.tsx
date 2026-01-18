'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import CardSection from '@/components/CardSection';
import { Button, buttonStyles } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Overlay';
import {
  adminReset,
  adminSeed,
  adminResetSeed,
  type AdminResetResponse,
  type AdminSeedResponse,
  type AdminResetSeedResponse,
  type ApiConfig,
  chat,
  type ChatResponse,
} from '@/lib/api';

const DEMO_QUESTIONS = [
  'What are your opening hours?',
  'How do I make a reservation?',
  'What allergens are in your menu?',
  'What is your address?',
  'Do you offer delivery?',
  'What payment methods do you accept?',
  'What is your refund policy?',
  'What is your closing checklist?',
];

export default function AdminPage() {
  const [tenantId, setTenantId] = useState('demo');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<
    AdminResetResponse | AdminSeedResponse | AdminResetSeedResponse | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

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
      setShowConfirmModal(null);
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
      setShowConfirmModal(null);
    }
  };

  const handleDemoQuestion = async (question: string) => {
    setChatLoading(true);
    setChatError(null);
    setChatResponse(null);

    try {
      const result = await chat(question, 5, { tenantId });
      setChatResponse(result);
    } catch (err: any) {
      setChatError(err.message || 'Failed to send chat message');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Admin Settings"
        subtitle="Maintenance, seed data, and demo workflows."
        breadcrumbs={['Home', 'AI', 'Admin']}
        actions={
          <button
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            onClick={() => {
              setApiKey('');
              setError(null);
            }}
            type="button"
          >
            Clear API Key
          </button>
        }
      />

      {apiKey && (
        <CardSection
          title="Security Notice"
          className="border-[color:var(--erp-warning)] bg-[color:var(--erp-surface-muted)]"
        >
          <p className="text-sm text-[color:var(--erp-warning)]">
            Your API key is entered in this session only. Clear it once you are
            done.
          </p>
        </CardSection>
      )}

      <CardSection title="Access" subtitle="Tenant and credentials.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-[color:var(--erp-text-muted)]">
              Tenant ID
            </label>
            <Input
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="demo"
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[color:var(--erp-text-muted)]">
              API Key
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your X-API-Key"
              className="mt-2"
            />
          </div>
        </div>
      </CardSection>

      <CardSection
        title="Maintenance Actions"
        subtitle="Destructive actions require confirmation."
        actions={
          <div className="text-xs text-[color:var(--erp-text-muted)]">
            {loading ? 'Processing…' : 'Idle'}
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button
            variant="danger"
            onClick={() => setShowConfirmModal('reset')}
            disabled={loading || !apiKey.trim()}
          >
            Reset Tenant
          </Button>
          <Button
            variant="secondary"
            onClick={handleSeed}
            disabled={loading || !apiKey.trim()}
          >
            Seed Tenant
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowConfirmModal('reset-seed')}
            disabled={loading || !apiKey.trim()}
          >
            Reset + Seed
          </Button>
        </div>
        <p className="mt-3 text-xs text-[color:var(--erp-text-muted)]">
          Reset operations delete all documents, chunks, and vectors for the
          tenant.
        </p>
      </CardSection>

      <Modal
        open={!!showConfirmModal}
        onClose={() => setShowConfirmModal(null)}
        title="Confirm action"
        footer={
          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={() => {
                if (showConfirmModal === 'reset') {
                  handleReset();
                } else {
                  handleResetSeed();
                }
              }}
            >
              Confirm
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(null)}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-sm">
          {showConfirmModal === 'reset'
            ? 'Are you sure you want to reset the tenant? This removes documents, chunks, and vectors.'
            : 'Are you sure you want to reset and seed the tenant? This replaces all existing data.'}
        </p>
      </Modal>

      <CardSection title="Demo Script" subtitle="Run preset chat checks.">
        <div className="grid gap-2 md:grid-cols-2">
          {DEMO_QUESTIONS.map((question) => (
            <button
              key={question}
              onClick={() => handleDemoQuestion(question)}
              disabled={chatLoading}
              className={buttonStyles({ variant: 'ghost', size: 'sm' })}
            >
              {question}
            </button>
          ))}
        </div>
        {chatLoading && (
          <p className="mt-3 text-xs text-[color:var(--erp-text-muted)]">
            Sending question...
          </p>
        )}
        {chatError && (
          <p className="mt-3 text-xs text-[color:var(--erp-danger)]">
            {chatError}
          </p>
        )}
        {chatResponse && (
          <div className="mt-3 rounded-md border border-[color:var(--erp-border)] bg-[color:var(--erp-surface-muted)] p-4 text-sm">
            <div className="font-semibold text-[color:var(--erp-text)]">
              Answer
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[color:var(--erp-text-muted)]">
              {chatResponse.answer}
            </p>
            {chatResponse.request_id && (
              <p className="mt-2 text-xs text-[color:var(--erp-text-muted)]">
                Request ID: {chatResponse.request_id}
              </p>
            )}
          </div>
        )}
      </CardSection>

      {loading && (
        <CardSection title="Processing">
          <p className="text-sm text-[color:var(--erp-text-muted)]">
            Working on the requested admin action.
          </p>
        </CardSection>
      )}

      {error && (
        <CardSection title="Error" className="border-[color:var(--erp-danger)]">
          <p className="text-sm text-[color:var(--erp-danger)]">{error}</p>
        </CardSection>
      )}

      {response && (
        <CardSection title="Response Payload">
          <pre className="max-h-80 overflow-auto rounded-md border border-[color:var(--erp-border)] bg-[color:var(--erp-surface-muted)] p-4 text-xs text-[color:var(--erp-text-muted)]">
            {JSON.stringify(response, null, 2)}
          </pre>
        </CardSection>
      )}

      <CardSection
        title="System Warning"
        className="border-[color:var(--erp-warning)] bg-[color:var(--erp-surface-muted)]"
      >
        <p className="text-sm text-[color:var(--erp-warning)]">
          Reset operations are destructive and cannot be undone.
        </p>
      </CardSection>
    </AppShell>
  );
}
