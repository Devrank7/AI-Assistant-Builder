/**
 * OAuth2 Engine Tests — Client Credentials + Auth Code refresh
 * Tests do NOT call external APIs — all deterministic with mocked fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the exported functions directly
// Mock fetch globally for token exchange tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Must import AFTER stubbing fetch
const engineModule = await import('@/lib/integrations/engine');
const { buildAuthHeader, validateConfig } = engineModule;

describe('oauth2_client_credentials in buildAuthHeader', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should fetch token and return Bearer header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'cc_token_123', expires_in: 3600, token_type: 'Bearer' }),
    });

    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read', 'write'],
    };
    const decrypted = { client_id: 'my_id', client_secret: 'my_secret' };

    const result = await buildAuthHeader(auth, decrypted);
    expect(result).toEqual({ Authorization: 'Bearer cc_token_123' });

    // Verify fetch was called with correct params
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://auth.example.com/token');
    expect(opts.method).toBe('POST');
    expect(opts.body).toContain('grant_type=client_credentials');
    expect(opts.body).toContain('scope=read+write');
  });

  it('should use cached token on second call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'cached_token', expires_in: 3600, token_type: 'Bearer' }),
    });

    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read'],
    };
    const decrypted = { client_id: 'cache_test_id', client_secret: 'cache_test_secret' };

    await buildAuthHeader(auth, decrypted);
    const result = await buildAuthHeader(auth, decrypted);

    expect(result).toEqual({ Authorization: 'Bearer cached_token' });
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only one fetch, second used cache
  });

  it('should throw on missing client_id', async () => {
    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read'],
    };
    const decrypted = { client_secret: 'only_secret' };

    await expect(buildAuthHeader(auth, decrypted)).rejects.toThrow('client_id');
  });

  it('should throw on missing tokenUrl', async () => {
    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      scopes: ['read'],
    };
    const decrypted = { client_id: 'id', client_secret: 'secret' };

    await expect(buildAuthHeader(auth, decrypted)).rejects.toThrow('tokenUrl');
  });

  it('should throw on token exchange failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'invalid_client',
    });

    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read'],
    };
    const decrypted = { client_id: 'bad_id', client_secret: 'bad_secret' };

    await expect(buildAuthHeader(auth, decrypted)).rejects.toThrow('token exchange failed');
  });
});

describe('validateConfig with new auth types', () => {
  it('should accept oauth2_client_credentials with valid fields', () => {
    const result = validateConfig({
      authType: 'oauth2_client_credentials',
      credentials: { client_id: 'id', client_secret: 'secret' },
      baseUrl: 'https://api.example.com',
      actions: [],
      config: {},
      tokenUrl: 'https://auth.example.com/token',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject oauth2_client_credentials without client_id', () => {
    const result = validateConfig({
      authType: 'oauth2_client_credentials',
      credentials: { client_secret: 'secret' },
      baseUrl: 'https://api.example.com',
      actions: [],
      config: {},
      tokenUrl: 'https://auth.example.com/token',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('client_id'))).toBe(true);
  });

  it('should reject oauth2_auth_code without tokenUrl', () => {
    const result = validateConfig({
      authType: 'oauth2_auth_code',
      credentials: { client_id: 'id', client_secret: 'secret' },
      baseUrl: 'https://api.example.com',
      actions: [],
      config: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('tokenUrl'))).toBe(true);
  });

  it('should reject non-HTTPS tokenUrl in production', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const result = validateConfig({
      authType: 'oauth2_auth_code',
      credentials: { client_id: 'id', client_secret: 'secret' },
      baseUrl: 'https://api.example.com',
      actions: [],
      config: {},
      tokenUrl: 'http://insecure.example.com/token',
    });
    process.env.NODE_ENV = origEnv;
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('HTTPS'))).toBe(true);
  });
});

describe('oauth2_auth_code in buildAuthHeader', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return existing token when not expired', async () => {
    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
      access_token: 'valid_token',
      refresh_token: 'refresh_123',
      token_expiry: Date.now() + 600_000, // 10 min from now
    };

    const result = await buildAuthHeader(auth, decrypted);
    expect(result).toEqual({ Authorization: 'Bearer valid_token' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should refresh expired token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new_token_456',
        expires_in: 3600,
        token_type: 'bearer',
        refresh_token: 'new_refresh_789',
      }),
    });

    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
      access_token: 'expired_token',
      refresh_token: 'refresh_123',
      token_expiry: Date.now() - 1000,
    };

    const result = await buildAuthHeader(auth, decrypted, 'test_config_id');
    expect(result).toEqual({ Authorization: 'Bearer new_token_456' });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://auth.example.com/token');
    expect(opts.body).toContain('grant_type=refresh_token');
    expect(opts.body).toContain('refresh_token=refresh_123');
  });

  it('should throw when refresh fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'invalid_grant',
    });

    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
      access_token: 'expired',
      refresh_token: 'bad_refresh',
      token_expiry: Date.now() - 1000,
    };

    await expect(buildAuthHeader(auth, decrypted, 'test_id')).rejects.toThrow('refresh failed');
  });

  it('should throw without access_token in credentials', async () => {
    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
    };

    await expect(buildAuthHeader(auth, decrypted)).rejects.toThrow('not yet authorized');
  });

  it('should only call fetch once for concurrent refresh requests', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  access_token: 'concurrent_token',
                  expires_in: 3600,
                  token_type: 'bearer',
                  refresh_token: 'new_refresh',
                }),
              }),
            50
          )
        )
    );

    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
      access_token: 'expired',
      refresh_token: 'refresh_concurrent',
      token_expiry: Date.now() - 1000,
    };

    const [r1, r2] = await Promise.all([
      buildAuthHeader(auth, decrypted, 'concurrent_config'),
      buildAuthHeader(auth, decrypted, 'concurrent_config'),
    ]);

    expect(r1).toEqual({ Authorization: 'Bearer concurrent_token' });
    expect(r2).toEqual({ Authorization: 'Bearer concurrent_token' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
