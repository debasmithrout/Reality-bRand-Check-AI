/**
 * Reality bRand Check AI - Authentication Service
 * Communicates with FastAPI backend /api/v1/auth endpoints.
 */

import { httpClient } from './httpClient';
import { LoginPayload, RegisterPayload, TokenResponse, UserProfile } from '../types';

export const authService = {
  /**
   * Register a new user profile and acquire JWT token.
   * Default assigned role is safe EDITOR.
   */
  async register(payload: RegisterPayload): Promise<TokenResponse> {
    return httpClient.post<TokenResponse>('/auth/register', {
      email: payload.email,
      password: payload.password,
      full_name: payload.full_name,
      role: payload.role || 'EDITOR',
      workspace_id: payload.workspace_id || 'default-workspace',
    }, { skipAuth: true });
  },

  /**
   * Authenticate user with email and password and acquire JWT token.
   */
  async login(payload: LoginPayload): Promise<TokenResponse> {
    return httpClient.post<TokenResponse>('/auth/login', {
      email: payload.email,
      password: payload.password,
    }, { skipAuth: true });
  },

  /**
   * Retrieve current authenticated user profile using active JWT Bearer token.
   */
  async getMe(): Promise<UserProfile> {
    return httpClient.get<UserProfile>('/auth/me');
  },
};

