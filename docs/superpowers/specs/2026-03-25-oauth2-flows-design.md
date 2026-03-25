# OAuth2 Authorization Code + Client Credentials Flows

## Goal

Add `oauth2_auth_code` and `oauth2_client_credentials` auth types to the integration engine, enabling the AI builder agent to connect to any OAuth2-based API (Facebook, Shopify, Salesforce, Zoom, HubSpot, Google user-consent APIs, Twilio, etc.).

## Context

The integration engine currently supports 5 auth types: `bearer`, `api_key`, `basic`, `none`, `oauth2_service_account`. This covers ~70-75% of APIs. The two biggest gaps are:

- **OAuth2 Authorization Code** — the most common OAuth2 flow for user-facing apps. Requires browser redirect, user consent, callback URL, and code-to-token exchange. Used by Facebook, Shopify, Salesforce, Zoom, HubSpot, Google (user-scoped), and thousands of others.
- **OAuth2 Client Credentials** — simpler B2B flow. No browser needed — just POST client_id + client_secret to get access_token. Used by Twilio, some HubSpot configs, Zoom Server-to-Server, Auth0 M2M.

Adding these two types covers the remaining ~25% of APIs.

## Approach

**Phase 1 (this spec):** Agent-guided flow where the user provides their own `client_id` + `client_secret` from the provider's Developer Console. The agent researches the API, creates the integration config, and walks the user through authorization.

**Phase 2 (future):** WinBix registers its own OAuth apps for popular providers (Google, Facebook, HubSpot), so users don't need their own credentials — just click "Authorize" and go.

---

## Architecture

### New Auth Type: `oauth2_client_credentials`

Analogous to `oauth2_service_account` but simpler — no JWT signing.

**Flow:**

1. POST to `tokenUrl` with `client_id` + `client_secret` (as Basic auth header or body params, depending on provider)
2. Receive `{ access_token, expires_in, token_type }`
3. Validate `token_type` is "bearer" (case-insensitive) — log warning and proceed if different
4. Cache token in-memory (same Map as service_account, 5-min safety margin before expiry)
5. Use as `Authorization: Bearer {access_token}`

**Credentials stored:** `{ client_id, client_secret }`

**Auth config:** `{ type: "oauth2_client_credentials", tokenUrl: "...", scopes?: [] }`

**Token caching:** Same in-memory `TOKEN_CACHE` Map used by `oauth2_service_account`. Cache key: `cc:${SHA256(client_id + client_secret)}`. No MongoDB writes needed — tokens are short-lived and re-fetchable.

**tokenUrl validation:** Must pass `validateUrl()` (HTTPS required in production) — enforced at `create_integration` time and before any token exchange.

---

### New Auth Type: `oauth2_auth_code`

Full OAuth2 Authorization Code flow with PKCE (RFC 7636) and server-side callback.

#### Step 1: Agent creates draft integration

User says "connect my HubSpot". Agent:

1. Calls `research_api` — discovers HubSpot uses OAuth2 Auth Code
2. Asks user for `client_id` + `client_secret` (from HubSpot Developer Console)
3. Calls `create_integration` with:
   - `authType: "oauth2_auth_code"`
   - `credentials: { client_id, client_secret }` (no tokens yet)
   - `tokenUrl: "https://api.hubapi.com/oauth/v1/token"` (validated HTTPS)
   - Status = `draft`

**`tokenUrl` is stored only in `create_integration`.** The `start_oauth_flow` tool reads it from the existing IntegrationConfig — no duplicate input.

#### Step 2: `start_oauth_flow` tool

Agent calls this new tool with:

- `configId` — ID of the draft IntegrationConfig
- `authorizationUrl` — provider's authorization endpoint (e.g., `https://app.hubspot.com/oauth/authorize`). Must pass `validateUrl()`.
- `scopes` — array of OAuth2 scopes
- `extraParams` — optional key-value pairs for provider-specific params (e.g., `{ "access_type": "offline" }` for Google)

Tool does:

1. Loads IntegrationConfig by `configId`, reads `tokenUrl` from `auth.tokenUrl`
2. Validates `authorizationUrl` via `validateUrl()` (HTTPS required in prod)
3. Generates cryptographic `state` (32 bytes, hex via `crypto.randomBytes`)
4. Generates PKCE `code_verifier` (64 bytes, base64url) and `code_challenge` (SHA-256 of verifier, base64url)
5. Saves `OAuthState` document in MongoDB: `{ state, configId, sessionId, userId, codeVerifier, createdAt, expiresAt: now + 15min }`
6. Builds authorization URL: `{authorizationUrl}?client_id={...}&redirect_uri=https://winbixai.com/api/oauth/callback&scope={encodeURIComponent(scopes.join(' '))}&state={state}&response_type=code&code_challenge={code_challenge}&code_challenge_method=S256{extraParams}`
7. Returns the URL to agent
8. Agent sends URL to user in chat: "Click this link to authorize: [url]"

#### Step 3: Callback route — `GET /api/oauth/callback`

**Success path** — provider redirects with `?code=...&state=...`:

1. Look up `OAuthState` by `state` — if not found or expired → error page
2. Load `IntegrationConfig` by `configId`, verify `userId` matches OAuthState.userId
3. Decrypt `client_id` + `client_secret` from IntegrationConfig
4. POST to `tokenUrl` (from IntegrationConfig.auth.tokenUrl) with:
   ```
   grant_type=authorization_code
   code={code}
   redirect_uri=https://winbixai.com/api/oauth/callback
   client_id={client_id}
   client_secret={client_secret}
   code_verifier={OAuthState.codeVerifier}
   ```
5. Validate response: check `token_type` is "bearer" (case-insensitive), log warning if different
6. Receive `{ access_token, refresh_token, expires_in }`
7. Update IntegrationConfig:
   - Encrypt new credentials: `{ client_id, client_secret, access_token, refresh_token, token_expiry: now + expires_in * 1000 }`
   - Confirm `auth.tokenUrl` is set (for future refresh)
   - Keep `status` = `draft` (actual API test happens in Step 4 via `test_integration_config`)
8. Delete OAuthState record
9. Return HTML page: "Authorization successful! Return to the chat."

**Error path** — provider redirects with `?error=...&error_description=...&state=...` (RFC 6749 Section 4.1.2.1):

1. Look up `OAuthState` by `state` — clean up if found
2. Return error HTML page showing the `error_description` (sanitized) to the user
3. User returns to chat, agent can retry with `start_oauth_flow`

#### Step 4: Agent continues

User returns to chat and says "done" (or agent polls). Agent calls `test_integration_config` → verifies API works with obtained tokens → status becomes `tested` → `activate_integration`.

---

### Token Refresh in `buildAuthHeader()`

For `oauth2_auth_code` integrations at runtime (widget visitor triggers an action):

1. Decrypt credentials → extract `access_token`, `refresh_token`, `token_expiry`
2. If `token_expiry > now + 5min` → return `Bearer {access_token}` (still valid)
3. If expired → acquire per-configId refresh lock (see below), then:
   a. Re-check `token_expiry` (another request may have refreshed while we waited)
   b. POST to `tokenUrl` with `{ grant_type: "refresh_token", refresh_token, client_id, client_secret }`
   c. Validate `token_type` is "bearer"
   d. Receive new `{ access_token, expires_in, refresh_token? }`
   e. Encrypt updated credentials
   f. Update IntegrationConfig in MongoDB via `findOneAndUpdate`
   g. Release lock
   h. Return `Bearer {new_access_token}`
4. If refresh fails (token revoked by user) → set `status = "error"`, return error

**Concurrent refresh protection:** Use an in-process `Map<string, Promise>` keyed by `configId`. When a refresh is needed, check if a Promise already exists for this configId — if so, await it instead of starting a second refresh. This prevents OAuth2 refresh token rotation from breaking under concurrent requests. Single-instance deployment only; for multi-instance, migrate to MongoDB `findOneAndUpdate` with a `refreshing` flag.

**Signature change:** `buildAuthHeader()` needs `configId` parameter to update MongoDB on refresh:

```typescript
buildAuthHeader(
  auth: IIntegrationConfig['auth'],
  decrypted: Record<string, unknown>,
  configId?: string  // only used by oauth2_auth_code for token refresh persistence
): Promise<Record<string, string>>
```

**IMPORTANT:** `executeAction()` must also be updated to pass `config._id.toString()` as the third argument to `buildAuthHeader()`. Without this, refreshed tokens are never persisted.

All other auth types ignore `configId` — fully backward compatible.

**For `oauth2_client_credentials`** — no refresh needed. Just fetch a new token via client_id + client_secret when the cached one expires. Same in-memory cache as service_account.

---

## New Files

| File                                  | Purpose                                                                                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/models/OAuthState.ts`            | Mongoose model for OAuth state parameter. Fields: `state` (unique, indexed), `configId`, `sessionId`, `userId`, `codeVerifier`, `createdAt`, `expiresAt`. TTL index on `expiresAt` for automatic cleanup. |
| `src/app/api/oauth/callback/route.ts` | GET handler. Handles both success (`?code=`) and error (`?error=`) paths. Validates state, verifies userId, exchanges code for tokens with PKCE, updates IntegrationConfig, returns HTML page.            |

## Modified Files

| File                                               | Changes                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/integrations/engine.ts`                   | Add `oauth2_auth_code` case (with refresh lock + MongoDB update) and `oauth2_client_credentials` case (with in-memory token cache) to `buildAuthHeader()`. Expand signature with optional `configId`. Add concurrent refresh lock (`REFRESH_LOCKS` Map). Update `validateConfig()` to accept new auth types and validate required credential fields + tokenUrl. |
| `src/models/IntegrationConfig.ts`                  | Add `oauth2_auth_code` and `oauth2_client_credentials` to auth.type enum. Add `tokenUrl?: string` to auth schema.                                                                                                                                                                                                                                               |
| `src/lib/builder/tools/dynamicIntegrationTools.ts` | Add `start_oauth_flow` tool (generates PKCE + state, builds auth URL, returns link). Add `tokenUrl` parameter to `create_integration`. Update auth type descriptions.                                                                                                                                                                                           |
| `src/lib/builder/systemPrompt.ts`                  | Add OAuth2 Auth Code example flow. Add Client Credentials example. Update tool routing guidance. Note about `access_type=offline` for Google.                                                                                                                                                                                                                   |
| `src/lib/builder/types.ts`                         | Add `start_oauth_flow` to `AgentToolName` union type.                                                                                                                                                                                                                                                                                                           |

**`executeAction()` in engine.ts** must be updated to pass `config._id.toString()` as the third argument to `buildAuthHeader()`. This is required for oauth2_auth_code token refresh to persist.

## Unchanged

- **Frontend builder chat** — agent sends authorization link as plain text in chat message
- **Existing auth types** — full backward compatibility, no behavior changes
- **Widget runtime** — `loadWidgetTools()` and agentic loop unchanged

---

## Security Considerations

- **PKCE (RFC 7636)**: Authorization Code flow uses S256 code challenge. `code_verifier` stored in OAuthState (MongoDB), sent during token exchange. Prevents authorization code interception attacks.
- **State parameter**: Cryptographic random (32 bytes), stored in MongoDB with 15-min TTL, deleted after use. Prevents CSRF attacks.
- **userId verification**: Callback route verifies that the IntegrationConfig belongs to the same userId stored in OAuthState. Prevents cross-user token injection.
- **URL validation**: Both `tokenUrl` and `authorizationUrl` must pass `validateUrl()` — HTTPS required in production, no private IPs. Prevents credential leakage over plaintext HTTP.
- **Credentials at rest**: All tokens encrypted with AES-256-GCM (existing `encrypt()`/`decrypt()`)
- **Refresh tokens**: Encrypted in MongoDB, only decrypted in-memory during `buildAuthHeader()`
- **Callback validation**: State must exist, not expired, userId must match, and IntegrationConfig must exist
- **redirect_uri**: Hardcoded to `https://winbixai.com/api/oauth/callback` — cannot be overridden by attacker
- **Concurrent refresh lock**: In-process Promise-based lock per configId prevents refresh token rotation race conditions on single-instance deployment
- **token_type validation**: All token responses checked for "bearer" type (case-insensitive)

## Error Handling

| Scenario                                       | Handling                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| User doesn't complete OAuth within 15 min      | OAuthState TTL expires, agent can call `start_oauth_flow` again                                                   |
| Provider redirects with `?error=access_denied` | Callback shows error HTML page with sanitized `error_description`, user retries                                   |
| Invalid/expired authorization code             | Token exchange fails, callback returns error HTML page                                                            |
| Refresh token revoked by user                  | `buildAuthHeader()` sets `status = "error"`, returns error to widget visitor, agent notified on next builder chat |
| Provider rate limits token endpoint            | Retry with exponential backoff (max 3 attempts) in `buildAuthHeader()`                                            |
| Invalid client_id/client_secret                | Token exchange fails at callback, error HTML page shown                                                           |
| Concurrent refresh requests                    | Second request awaits first request's refresh Promise instead of re-refreshing                                    |
| userId mismatch on callback                    | Error page: "Authorization failed — session mismatch"                                                             |

## Agent System Prompt Additions

```
### OAuth2 Authorization Code Flow:
When the API requires OAuth2 Auth Code (browser consent):
1. research_api → discover authorizationUrl, tokenUrl, scopes
2. Ask user for client_id + client_secret
3. create_integration with authType "oauth2_auth_code", tokenUrl, credentials {client_id, client_secret}
4. start_oauth_flow with configId, authorizationUrl, scopes (add extraParams like access_type=offline for Google)
5. Send the returned URL to user: "Click to authorize: [link]"
6. Wait for user to confirm they authorized
7. test_integration_config → verify API works with obtained tokens
8. activate_integration

### OAuth2 Client Credentials Flow:
When the API uses server-to-server auth (no browser needed):
1. research_api → discover tokenUrl, scopes
2. Ask user for client_id + client_secret
3. create_integration with authType "oauth2_client_credentials", tokenUrl, scopes, credentials {client_id, client_secret}
4. test_integration_config → engine auto-fetches token and tests
5. activate_integration

### Provider-Specific Notes:
- Google OAuth: always include extraParams { "access_type": "offline" } in start_oauth_flow to get a refresh_token
- Facebook: scopes are comma-separated (not space), use extraParams if needed
- Some providers require client_id/secret in Authorization Basic header for token exchange — engine handles both formats
```
