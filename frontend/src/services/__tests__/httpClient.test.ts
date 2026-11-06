import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide mock localStorage for Node test runner
const memoryStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, val: string) => { memoryStore[key] = String(val); },
  removeItem: (key: string) => { delete memoryStore[key]; },
  clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
  key: (i: number) => Object.keys(memoryStore)[i] ?? null,
  length: 0,
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

import { httpClient, ApiError, AUTH_TOKEN_KEY } from '../httpClient';
import { authService } from '../authService';

describe('Centralized httpClient', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('unwraps backend { success: true, data: ... } envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { id: 'usr-123', email: 'test@realitybrand.ai' },
          message: 'Success',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await httpClient.get<{ id: string; email: string }>('/test');
    expect(result.id).toBe('usr-123');
    expect(result.email).toBe('test@realitybrand.ai');
  });

  it('injects Bearer token from localStorage on authenticated requests', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'test-jwt-token-xyz');
    let capturedAuth = '';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, opts: any) => {
      capturedAuth = opts.headers?.Authorization || '';
      return new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await httpClient.get('/protected');
    expect(capturedAuth).toBe('Bearer test-jwt-token-xyz');
  });

  it('skips Authorization header when skipAuth is true', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'test-jwt-token-xyz');
    let capturedAuth = '';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, opts: any) => {
      capturedAuth = opts.headers?.Authorization || '';
      return new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await httpClient.post('/auth/login', { email: 'a@b.com', password: 'pwd' }, { skipAuth: true });
    expect(capturedAuth).toBe('');
  });

  it('parses structured backend errors into ApiError instance', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password.',
            details: [],
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    await expect(httpClient.post('/auth/login', {})).rejects.toThrow(ApiError);
    try {
      await httpClient.post('/auth/login', {});
    } catch (err: any) {
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.status).toBe(401);
      expect(err.message).toBe('Invalid email or password.');
    }
  });

  it('handles network connection failure gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(httpClient.get('/any-endpoint')).rejects.toThrow(ApiError);
    try {
      await httpClient.get('/any-endpoint');
    } catch (err: any) {
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.status).toBe(0);
    }
  });

  it('handles backend 422 validation errors with details array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The submitted data is invalid.',
            details: [
              { field: 'body -> email', message: 'value is not a valid email address' },
            ],
          },
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    try {
      await httpClient.post('/auth/register', {});
      expect.unreachable('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.status).toBe(422);
      expect(err.details).toHaveLength(1);
      expect(err.details[0].field).toBe('body -> email');
    }
  });

  it('handles backend 403 Forbidden error with message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'User account is inactive.',
            details: [],
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    try {
      await httpClient.get('/protected-action');
      expect.unreachable('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.status).toBe(403);
      expect(err.message).toBe('User account is inactive.');
    }
  });
});

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('login sends payload and returns TokenResponse', async () => {
    let capturedBody: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, opts: any) => {
      capturedBody = JSON.parse(opts.body);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            access_token: 'fake-jwt-token-123',
            token_type: 'bearer',
            expires_in: 604800,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const res = await authService.login({ email: 'user@test.com', password: 'securePassword' });
    expect(res.access_token).toBe('fake-jwt-token-123');
    expect(capturedBody.email).toBe('user@test.com');
    expect(capturedBody.password).toBe('securePassword');
  });

  it('register defaults role to EDITOR and workspace to default-workspace', async () => {
    let capturedBody: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, opts: any) => {
      capturedBody = JSON.parse(opts.body);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            access_token: 'new-reg-jwt-token',
            token_type: 'bearer',
            expires_in: 604800,
          },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const res = await authService.register({
      email: 'new@test.com',
      password: 'password123',
      full_name: 'New User',
    });
    expect(res.access_token).toBe('new-reg-jwt-token');
    expect(capturedBody.role).toBe('EDITOR');
    expect(capturedBody.workspace_id).toBe('default-workspace');
    expect(capturedBody.full_name).toBe('New User');
  });

  it('getMe retrieves profile with Bearer token', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'active-session-jwt');
    let capturedAuth = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, opts: any) => {
      capturedAuth = opts.headers?.Authorization || '';
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'user-uuid-1',
            email: 'me@test.com',
            full_name: 'Me User',
            role: 'EDITOR',
            workspace_id: 'default-workspace',
            is_active: true,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const profile = await authService.getMe();
    expect(profile.id).toBe('user-uuid-1');
    expect(profile.email).toBe('me@test.com');
    expect(capturedAuth).toBe('Bearer active-session-jwt');
  });
});
