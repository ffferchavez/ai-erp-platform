'use client';

import { useMemo, useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import CardSection from '@/components/CardSection';
import { Button, buttonStyles } from '@/components/Button';
import { Input } from '@/components/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/Table';
import {
  listDocuments,
  deleteDocument,
  type Document,
  type ApiConfig,
  ApiError,
} from '@/lib/api';

export default function DocumentsPage() {
  const [tenantId, setTenantId] = useState('demo');
  const [apiKey, setApiKey] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.source.toLowerCase().includes(query) ||
        doc.id.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  return (
    <AppShell>
      <PageHeader
        title="Documents"
        subtitle="ERP-style document registry with secure actions."
        breadcrumbs={['Home', 'AI', 'Documents']}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchDocuments}
            disabled={loading || !apiKey.trim()}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <CardSection title="Connection" subtitle="Tenant scope and API access.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-(--erp-text-muted)">
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
            <label className="text-xs font-semibold text-(--erp-text-muted)">
              X-API-Key
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="mt-2"
            />
            <p className="mt-2 text-xs text-(--erp-text-muted)">
              Required for viewing and deleting documents.
            </p>
          </div>
        </div>
      </CardSection>

      {error && (
        <CardSection title="Error" className="border-(--erp-danger)">
          <p className="text-sm text-(--erp-danger)">{error}</p>
        </CardSection>
      )}

      <CardSection
        title={`Documents (${filteredDocuments.length})`}
        subtitle="Search, review, and manage document sources."
        actions={
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-56"
          />
        }
      >
        {loading && documents.length === 0 ? (
          <div className="rounded-md border border-dashed border-(--erp-border) bg-(--erp-surface-muted) px-4 py-6 text-sm text-(--erp-text-muted)">
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-md border border-dashed border-(--erp-border) bg-(--erp-surface-muted) px-4 py-6 text-sm text-(--erp-text-muted)">
            {apiKey.trim()
              ? 'No documents found. Add documents via the API to see them here.'
              : 'Enter your API key and click Refresh to load documents.'}
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Source</TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-xs text-(--erp-text-muted)">
                      ID: {doc.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-(--erp-text-muted)">
                    {doc.source}
                  </TableCell>
                  <TableCell className="text-xs text-(--erp-text-muted)">
                    {doc.created_at
                      ? new Date(doc.created_at).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id || !apiKey.trim()}
                      className={buttonStyles({
                        variant: 'danger',
                        size: 'sm',
                      })}
                    >
                      {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardSection>
    </AppShell>
  );
}
