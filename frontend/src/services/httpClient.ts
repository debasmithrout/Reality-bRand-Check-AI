/**
 * Reality bRand Check AI - Centralized HTTP Client
 * Connects React frontend to FastAPI backend (/api/v1).
 */

import { ApiErrorDetail } from '../types';

export const AUTH_TOKEN_KEY = 'rbc_auth_token';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: ApiErrorDetail[];

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Resolves the backend API base URL with fallback to local development standard.
 */
export const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:8000/api/v1';
};

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

export const httpClient = {
  /**
   * Core request dispatcher with authentication injection and error parsing.
   */
  async request<T>(endpoint: string, options: RequestOptions & { body?: any } = {}): Promise<T> {
    const baseUrl = getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    let url = `${baseUrl}${cleanEndpoint}`;
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Attach Authorization header if token exists and skipAuth is not true
    if (!options.skipAuth) {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const { params, skipAuth, body, ...fetchOptions } = options;

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        body: body !== undefined && typeof body !== 'string' ? JSON.stringify(body) : body,
      });
    } catch (networkErr: any) {
      throw new ApiError(
        networkErr?.message || 'Unable to connect to the backend server. Please verify the API is running.',
        'NETWORK_ERROR',
        0
      );
    }

    // Parse response body
    let jsonBody: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        jsonBody = await response.json();
      } catch {
        throw new ApiError(
          'Received malformed JSON from the backend.',
          'INVALID_JSON',
          response.status
        );
      }
    } else {
      const rawText = await response.text();
      if (!response.ok) {
        throw new ApiError(
          rawText || `HTTP request failed with status ${response.status}`,
          'HTTP_ERROR',
          response.status
        );
      }
      return rawText as unknown as T;
    }

    // Handle HTTP error responses
    if (!response.ok) {
      // Backend error response envelope: { success: false, error: { code, message, details } }
      if (jsonBody && jsonBody.error) {
        const errObj = jsonBody.error;
        throw new ApiError(
          errObj.message || 'An error occurred during the request.',
          errObj.code || 'API_ERROR',
          response.status,
          errObj.details
        );
      }

      // Fallback for standard HTTPException or validation error
      const errorMsg = jsonBody?.detail || jsonBody?.message || `HTTP ${response.status}`;
      throw new ApiError(
        typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
        'HTTP_ERROR',
        response.status
      );
    }

    // Backend success response envelope: { success: true, data: T, message?: string }
    if (jsonBody && typeof jsonBody === 'object' && 'data' in jsonBody) {
      return jsonBody.data as T;
    }

    return jsonBody as T;
  },

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  },

  post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, ...options });
  },

  patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, ...options });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  },
};

