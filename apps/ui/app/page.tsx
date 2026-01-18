'use client';

import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import CardSection from '@/components/CardSection';
import { Button, buttonStyles } from '@/components/Button';
import { Input, Textarea } from '@/components/Input';
import { Drawer } from '@/components/Overlay';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/Table';
import {
  chat,
  type ApiConfig,
  type ChatResponse,
  type Citation,
} from '@/lib/api';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  requestId?: string;
};

const QUICK_QUERIES = [
  'What are your opening hours?',
  'How do I make a reservation?',
  'What allergens are in your menu?',
  'What is your address?',
];

export default function Home() {
  const [tenantId, setTenantId] = useState('demo');
  const [message, setMessage] = useState('');
  const [topK, setTopK] = useState(6);
  const [minScore, setMinScore] = useState(0.2);
  const [maxCitations, setMaxCitations] = useState(6);
  const [loading, setLoading] = useState(false);
  const [latestResponse, setLatestResponse] = useState<ChatResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const config: ApiConfig = {
    tenantId,
  };

  const citations = latestResponse?.citations || [];

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const trimmed = text.trim();

    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);

    try {
      const result = await chat(
        trimmed,
        {
          topK,
          minScore,
          maxCitations,
        },
        config
      );
      setLatestResponse(result);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          requestId: result.request_id,
        },
      ]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(message);
  };

  const conversationSummary = useMemo(() => {
    if (!latestResponse) return 'No requests yet';
    return `${citations.length} citations returned • Request ID ${
      latestResponse.request_id || 'N/A'
    }`;
  }, [citations.length, latestResponse]);

  return (
    <AppShell>
      <PageHeader
        title="VICKY"
        subtitle="Helion City assistant for enterprise RAG workflows."
        breadcrumbs={['Home', 'AI', 'Chat']}
        actions={
          <button
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            onClick={() => {
              setMessages([]);
              setLatestResponse(null);
              setError(null);
            }}
            type="button"
          >
            Clear conversation
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <CardSection
            title="Conversation"
            subtitle={conversationSummary}
            actions={
              <div className="text-xs text-[color:var(--erp-text-muted)]">
                {loading ? 'Assistant typing...' : 'Ready'}
              </div>
            }
          >
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="rounded-md border border-dashed border-[color:var(--erp-border)] bg-[color:var(--erp-surface-muted)] px-4 py-6 text-sm text-[color:var(--erp-text-muted)]">
                  Start a conversation to see responses and citations. ERP-style
                  activity appears here.
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={`${msg.role}-${index}`} className="flex gap-3">
                  <div
                    className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      msg.role === 'assistant'
                        ? 'bg-[color:var(--erp-primary-soft)] text-[color:var(--erp-primary)]'
                        : 'bg-[color:var(--erp-surface-muted)] text-[color:var(--erp-text)]'
                    }`}
                  >
                    {msg.role === 'assistant' ? 'AI' : 'You'}
                  </div>
                  <div className="flex-1 space-y-1 rounded-md border border-[color:var(--erp-border)] bg-[color:var(--erp-surface)] px-4 py-3">
                    <div className="text-xs font-semibold text-[color:var(--erp-text-muted)]">
                      {msg.role === 'assistant' ? 'Assistant' : 'User'}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === 'assistant' && msg.requestId && (
                      <p className="text-xs text-[color:var(--erp-text-muted)]">
                        Request ID: {msg.requestId}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <div>
                <label className="text-xs font-semibold text-[color:var(--erp-text-muted)]">
                  Message
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Ask a question about the restaurant..."
                  disabled={loading}
                  className="mt-2"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {QUICK_QUERIES.map((query) => (
                    <button
                      key={query}
                      type="button"
                      disabled={loading}
                      className={buttonStyles({
                        variant: 'ghost',
                        size: 'sm',
                      })}
                      onClick={() => sendMessage(query)}
                    >
                      {query}
                    </button>
                  ))}
                </div>
                <Button type="submit" disabled={loading || !message.trim()}>
                  {loading ? 'Sending...' : 'Send message'}
                </Button>
              </div>
            </form>
          </CardSection>

          {error && (
            <CardSection title="Error" className="border-[color:var(--erp-danger)]">
              <p className="text-sm text-[color:var(--erp-danger)]">{error}</p>
            </CardSection>
          )}
        </div>

        <div className="space-y-6">
          <CardSection
            title="Filters"
            subtitle="Tenant and RAG tuning parameters."
            actions={
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className={buttonStyles({ variant: 'ghost', size: 'sm' })}
              >
                {filtersOpen ? 'Collapse' : 'Expand'}
              </button>
            }
          >
            {filtersOpen && (
              <div className="grid gap-4">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[color:var(--erp-text-muted)]">
                      Top K
                    </label>
                    <Input
                      type="number"
                      value={topK}
                      min={1}
                      max={20}
                      onChange={(e) => setTopK(Number(e.target.value) || 1)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[color:var(--erp-text-muted)]">
                      Max Citations
                    </label>
                    <Input
                      type="number"
                      value={maxCitations}
                      min={1}
                      max={20}
                      onChange={(e) =>
                        setMaxCitations(Number(e.target.value) || 1)
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[color:var(--erp-text-muted)]">
                    Min Score
                  </label>
                  <Input
                    type="number"
                    step="0.05"
                    value={minScore}
                    min={0}
                    max={1}
                    onChange={(e) => setMinScore(Number(e.target.value) || 0)}
                    className="mt-2"
                  />
                  <p className="mt-2 text-xs text-[color:var(--erp-text-muted)]">
                    Higher values show fewer but more confident matches.
                  </p>
                </div>
              </div>
            )}
          </CardSection>

          <CardSection
            title="Sources & Citations"
            subtitle="Latest sources referenced by the assistant."
          >
            {citations.length === 0 ? (
              <div className="rounded-md border border-dashed border-[color:var(--erp-border)] bg-[color:var(--erp-surface-muted)] px-4 py-6 text-sm text-[color:var(--erp-text-muted)]">
                No citations yet. Ask a question to populate sources.
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Title</TableHeaderCell>
                    <TableHeaderCell>Source</TableHeaderCell>
                    <TableHeaderCell>Score</TableHeaderCell>
                    <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {citations.map((citation) => (
                    <TableRow key={citation.chunk_id}>
                      <TableCell className="font-medium">
                        {citation.title}
                      </TableCell>
                      <TableCell className="text-xs text-[color:var(--erp-text-muted)]">
                        {citation.source}
                      </TableCell>
                      <TableCell className="text-xs">
                        {citation.score.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className={buttonStyles({
                            variant: 'ghost',
                            size: 'sm',
                          })}
                          onClick={() => setActiveCitation(citation)}
                        >
                          Preview
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardSection>
        </div>
      </div>

      <Drawer
        open={!!activeCitation}
        onClose={() => setActiveCitation(null)}
        title={activeCitation?.title || 'Citation Preview'}
        footer={
          <div className="text-xs text-[color:var(--erp-text-muted)]">
            Source: {activeCitation?.source} • Score:{' '}
            {activeCitation?.score.toFixed(3)}
          </div>
        }
      >
        <div className="space-y-2">
          <div className="text-xs text-[color:var(--erp-text-muted)]">
            Document ID: {activeCitation?.document_id} • Chunk #
            {activeCitation?.chunk_index}
          </div>
          <p className="whitespace-pre-wrap text-sm">
            {activeCitation?.content}
          </p>
        </div>
      </Drawer>
    </AppShell>
  );
}
