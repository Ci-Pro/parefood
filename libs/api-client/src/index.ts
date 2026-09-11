/**
 * PareFood API Client
 * HTTP client for the Total.js backend server.
 */
import { ApiConfig } from '@parefood/config';
import { ApiResponse, ApiError } from '@parefood/types';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  authToken?: string;
}

export type RequestInterceptor = (options: RequestOptions) => Promise<RequestOptions> | RequestOptions;
export type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

class ApiClient {
  private baseUrl: string;
  private timeout = 30000;
  private authToken?: string;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(config: ApiConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, '');
  }

  setAuthToken(token: string | undefined) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = undefined;
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
    const url = `${this.baseUrl}${path}`;
    if (!query) return url;

    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }

  private cloneHeaders(headers?: Record<string, string>) {
    const h = new Headers(headers || {});
    h.set('Accept', 'application/json');
    h.set('Content-Type', 'application/json');
    if (this.authToken) {
      h.set('Authorization', `Bearer ${this.authToken}`);
    }
    return h;
  }

  private async runInterceptors(options: RequestOptions): Promise<RequestOptions> {
    let current = options;
    for (const interceptor of this.requestInterceptors) {
      current = await interceptor(current);
    }
    return current;
  }

  private async runResponseInterceptors(response: Response): Promise<Response> {
    let current = response;
    for (const interceptor of this.responseInterceptors) {
      current = await interceptor(current);
    }
    return current;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    let opts = await this.runInterceptors(options);
    const { method = 'GET', body, timeout } = opts;
    opts.timeout = timeout ?? this.timeout;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeout);

    try {
      const response = await fetch(this.buildUrl(path, opts.query), {
        method,
        headers: this.cloneHeaders(opts.headers),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const intercepted = await this.runResponseInterceptors(response);

      const data = await intercepted.json().catch(() => null);

      if (!intercepted.ok) {
        const error: ApiError = {
          code: intercepted.status,
          message: (data as ApiResponse)?.error?.message || 'Request failed',
          details: (data as ApiResponse)?.error?.details,
        };
        throw new ApiRequestError(error);
      }

      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  get<T = unknown>(path: string, query?: RequestOptions['query']) {
    return this.request<T>(path, { method: 'GET', query });
  }

  post<T = unknown>(path: string, body?: unknown, query?: RequestOptions['query']) {
    return this.request<T>(path, { method: 'POST', body, query });
  }

  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body });
  }

  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body });
  }

  delete<T = unknown>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export class ApiRequestError extends Error {
  code: number;
  details?: Record<string, unknown>;

  constructor(error: ApiError) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
    this.name = 'ApiRequestError';
  }
}

let instance: ApiClient | null = null;

export function createApiClient(config: ApiConfig): ApiClient {
  instance = new ApiClient(config);
  return instance;
}

export function getApiClient(): ApiClient {
  if (!instance) {
    throw new Error('API client not initialized. Call createApiClient() first.');
  }
  return instance;
}

export default ApiClient;