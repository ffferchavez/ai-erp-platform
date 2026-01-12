/**
 * API client wrapper for AI ERP Platform
 * Supports tenant_id and optional X-API-Key header
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.demo.helioncity.com';

export interface ApiConfig {
  tenantId?: string;
  apiKey?: string;
}

export interface ChatRequest {
  message: string;
  top_k?: number;
  tenant_id?: string;
}

export interface Citation {
  chunk_id: string;
  document_id: string;
  source: string;
  title: string;
  chunk_index: number;
  content: string;
  score: number;
}

export interface ChatResponse {
  message: string;
  answer: string;
  citations: Citation[];
}

export interface Document {
  id: string;
  tenant_id: string;
  source: string;
  title: string;
  created_at: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  config: ApiConfig = {}
): Promise<T> {
  const { tenantId = 'demo', apiKey } = config;
  
  const url = new URL(endpoint, API_BASE);
  
  // Add tenant_id as query parameter if provided
  if (tenantId) {
    url.searchParams.set('tenant_id', tenantId);
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  // Add X-API-Key header if provided
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  
  const response = await fetch(url.toString(), {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    let errorMessage = `API request failed: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // If response is not JSON, use status text
    }
    throw new ApiError(errorMessage, response.status, response.statusText);
  }
  
  return response.json();
}

/**
 * Send a chat message to the AI assistant
 */
export async function chat(
  message: string,
  topK: number = 5,
  config: ApiConfig = {}
): Promise<ChatResponse> {
  const { tenantId = 'demo' } = config;
  
  return apiRequest<ChatResponse>(
    '/chat',
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        top_k: topK,
        tenant_id: tenantId,
      }),
    },
    config
  );
}

/**
 * List documents for a tenant (requires API key)
 */
export async function listDocuments(config: ApiConfig = {}): Promise<Document[]> {
  if (!config.apiKey) {
    throw new ApiError('API key is required to list documents', 401);
  }
  
  return apiRequest<Document[]>('/documents', {
    method: 'GET',
  }, config);
}

/**
 * Delete a document (requires API key)
 */
export async function deleteDocument(
  documentId: string,
  config: ApiConfig = {}
): Promise<{ message: string; document_id: string; tenant_id: string }> {
  if (!config.apiKey) {
    throw new ApiError('API key is required to delete documents', 401);
  }
  
  return apiRequest<{ message: string; document_id: string; tenant_id: string }>(
    `/documents/${documentId}`,
    {
      method: 'DELETE',
    },
    config
  );
}
