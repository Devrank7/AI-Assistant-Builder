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
3. Cache token in-memory (same Map as service_account, 5-min safety margin before expiry)
4. Use as `Authorization: Bearer {access_token}`

**Credentials stored:** `{ client_id, client_secret }`

**Auth config:** `{ type: "oauth2_client_credentials", tokenUrl: "...", scopes?: [] }`

**Token caching:** Same in-memory `TOKEN_CACHE` Map used by `oauth2_service_account`. Cache key: `cc:${clientId}:${client_secret_hash}`. No MongoDB writes needed — tokens are short-lived and re-fetchable.

---

### New Auth Type: `oauth2_auth_code`

Full OAuth2 Authorization Code flow with server-side callback.

#### Step 1: Agent creates draft integration

User says "connect my HubSpot". Agent:

1. Calls `research_api` — discovers HubSpot uses OAuth2 Auth Code
2. Asks user for `client_id` + `client_secret` (from HubSpot Developer Console)
3. Calls `create_integration` with:
   - `authType: "oauth2_auth_code"`
   - `credentials: { client_id, client_secret }` (no tokens yet)
   - `tokenUrl: "https://api.hubapi.com/oauth/v1/token"`
   - Status = `draft`

#### Step 2: `start_oauth_flow` tool

Agent calls this new tool with:

- `configId` — ID of the draft IntegrationConfig
- `authorizationUrl` — provider's authorization endpoint (e.g., `https://app.hubspot.com/oauth/authorize`)
- `scopes` — array of OAuth2 scopes
- `tokenUrl` — provider's token endpoint (saved to config for later refresh)

Tool does:

1. Generates cryptographic `state` (32 bytes, hex via `crypto.randomBytes`)
2. Saves `OAuthState` document in MongoDB: `{ state, configId, sessionId, userId, tokenUrl, createdAt, expiresAt: now + 15min }`
3. Builds authorization URL: `{authorizationUrl}?client_id={...}&redirect_uri=https://winbixai.com/api/oauth/callback&scope={scopes.join('+')}&state={state}&response_type=code`
4. Returns the URL to agent
5. Agent sends URL to user in chat: "Click this link to authorize: [url]"

#### Step 3: Callback route — `GET /api/oauth/callback`

Provider redirects here with `?code=...&state=...`:

1. Look up `OAuthState` by `state` — if not found or expired → error page
2. Load `IntegrationConfig` by `configId`, decrypt `client_id` + `client_secret`
3. POST to `tokenUrl` with:
   ```
   grant_type=authorization_code
   code={code}
   redirect_uri=https://winbixai.com/api/oauth/callback
   client_id={client_id}
   client_secret={client_secret}
   ```
4. Receive `{ access_token, refresh_token, expires_in }`
5. Update IntegrationConfig:
   - Encrypt new credentials: `{ client_id, client_secret, access_token, refresh_token, token_expiry: now + expires_in }`
   - Set `auth.tokenUrl` = tokenUrl (for future refresh)
   - Set `status` = `tested` (tokens are freshly issued — valid by definition)
6. Delete OAuthState record
7. Return HTML page: "Authorization successful! Return to the chat."

#### Step 4: Agent continues

User returns to chat and says "done" (or agent polls). Agent calls `test_integration_config` → verifies API works → `activate_integration`.

---

### Token Refresh in `buildAuthHeader()`

For `oauth2_auth_code` integrations at runtime (widget visitor triggers an action):

1. Decrypt credentials → extract `access_token`, `refresh_token`, `token_expiry`
2. If `token_expiry > now + 5min` → return `Bearer {access_token}` (still valid)
3. If expired:
   a. POST to `tokenUrl` with `{ grant_type: "refresh_token", refresh_token, client_id, client_secret }`
   b. Receive new `{ access_token, expires_in, refresh_token? }`
   c. Encrypt updated credentials
   d. Update IntegrationConfig in MongoDB
   e. Return `Bearer {new_access_token}`
4. If refresh fails (token revoked by user) → set `status = "error"`, return error

**Signature change:** `buildAuthHeader()` needs `configId` parameter to update MongoDB on refresh:

```typescript
buildAuthHeader(
  auth: IIntegrationConfig['auth'],
  decrypted: Record<string, unknown>,
  configId?: string  // only used by oauth2_auth_code for token refresh persistence
): Promise<Record<string, string>>
```

All other auth types ignore `configId` — fully backward compatible.

---

## New Files

| File                                  | Purpose                                                                                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/models/OAuthState.ts`            | Mongoose model for OAuth state parameter. Fields: `state` (unique, indexed), `configId`, `sessionId`, `userId`, `tokenUrl`, `createdAt`, `expiresAt`. TTL index on `expiresAt` for automatic cleanup. |
| `src/app/api/oauth/callback/route.ts` | GET handler. Validates state, exchanges code for tokens, updates IntegrationConfig, returns success HTML page.                                                                                        |

## Modified Files

| File                                               | Changes                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/integrations/engine.ts`                   | Add `oauth2_auth_code` case (with refresh logic + MongoDB update) and `oauth2_client_credentials` case (with in-memory token cache) to `buildAuthHeader()`. Expand signature with optional `configId`. Update `validateConfig()` to accept new auth types and validate required credential fields. |
| `src/models/IntegrationConfig.ts`                  | Add `oauth2_auth_code` and `oauth2_client_credentials` to auth.type enum. Add `tokenUrl?: string` to auth schema.                                                                                                                                                                                  |
| `src/lib/builder/tools/dynamicIntegrationTools.ts` | Add `start_oauth_flow` tool (generates state, builds auth URL, returns link). Add `tokenUrl` parameter to `create_integration`. Update auth type descriptions.                                                                                                                                     |
| `src/lib/builder/systemPrompt.ts`                  | Add OAuth2 Auth Code example flow. Add Client Credentials example. Update tool routing guidance.                                                                                                                                                                                                   |
| `src/lib/builder/types.ts`                         | Add `start_oauth_flow` to `AgentToolName` union type.                                                                                                                                                                                                                                              |

## Unchanged

- **Frontend builder chat** — agent sends authorization link as plain text in chat message
- **`executeAction()`** — already calls `buildAuthHeader()`, new auth types work automatically
- **Existing auth types** — full backward compatibility, no behavior changes
- **Widget runtime** — `loadWidgetTools()` and agentic loop unchanged

---

## Security Considerations

- **State parameter**: Cryptographic random (32 bytes), stored in MongoDB with 15-min TTL, deleted after use. Prevents CSRF attacks.
- **Credentials at rest**: All tokens encrypted with AES-256-GCM (existing `encrypt()`/`decrypt()`)
- **Refresh tokens**: Encrypted in MongoDB, only decrypted in-memory during `buildAuthHeader()`
- **Callback validation**: State must exist, not expired, and match a valid IntegrationConfig
- **redirect_uri**: Hardcoded to `https://winbixai.com/api/oauth/callback` — cannot be overridden by attacker
- **Token refresh race condition**: Acceptable for single-instance deployment. If needed later, add distributed lock via MongoDB findOneAndUpdate.

## Error Handling

| Scenario                                  | Handling                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| User doesn't complete OAuth within 15 min | OAuthState TTL expires, agent can call `start_oauth_flow` again                                                   |
| Invalid/expired authorization code        | Callback returns error HTML page, user retries                                                                    |
| Refresh token revoked by user             | `buildAuthHeader()` sets `status = "error"`, returns error to widget visitor, agent notified on next builder chat |
| Provider rate limits token endpoint       | Retry with exponential backoff (max 3 attempts) in `buildAuthHeader()`                                            |
| Invalid client_id/client_secret           | Token exchange fails at callback, error HTML page shown                                                           |

## Agent System Prompt Additions

```
### OAuth2 Authorization Code Flow:
When the API requires OAuth2 Auth Code (browser consent):
1. research_api → discover authorizationUrl, tokenUrl, scopes
2. Ask user for client_id + client_secret
3. create_integration with authType "oauth2_auth_code", tokenUrl, credentials {client_id, client_secret}
4. start_oauth_flow with configId, authorizationUrl, scopes
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
```
