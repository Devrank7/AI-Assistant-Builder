export const INTEGRATION_GUIDE = `## Integration Codegen Guide

### Decision Tree
- User says "connect X" / "add X integration" → generate_integration (fills config JSON → deterministic code)
- User says "add booking button" / "add contact form" → modify_structure with add_widget_component (template UI)
- User says "show event list" / "display status" → modify_structure with add_widget_component (DataList/StatusCard)
- Integration already exists (check list_user_integrations) → attach_integration_to_widget + add_widget_component

### Available Template Components
| Template | Use for | Key props |
|----------|---------|-----------|
| actionButton | Trigger action (book, pay, save) | label, provider, action, params, style |
| dataForm | Collect input + submit (contact form, booking form) | fields[], submitAction, successMessage |
| dataList | Display fetched data (events, contacts) | provider, action, displayFields[] |
| statusCard | Show single data point (balance, status) | provider, action, displayFields[], refreshInterval |
| externalLink | Open external URL | url, label, openIn |

### integration.config.json Schema
\`\`\`json
{
  "provider": "lowercase-slug",
  "name": "Display Name",
  "category": "crm|calendar|payment|notification|data",
  "baseUrl": "https://api.example.com",
  "auth": { "type": "bearer|api-key-header|basic", "header": "Authorization", "prefix": "Bearer", "fields": [{ "key": "apiKey", "label": "API Key", "type": "password", "required": true }] },
  "actions": [{ "id": "camelCase", "name": "Display", "method": "GET|POST", "path": "/endpoint", "body": {}, "queryParams": {}, "responseMapping": { "root": "data", "fields": { "ourKey": "apiKey" } } }],
  "healthCheck": { "method": "GET", "path": "/me", "successField": "id" }
}
\`\`\`
Template vars: \`{{params.X}}\` from action call, \`{{auth.X}}\` from credentials.

### Flow Examples
**Known plugin (HubSpot):** list_user_integrations → already active → attach_integration_to_widget → add_widget_component (dataForm for contact creation)
**Stub plugin (Calendly):** web_search Calendly API docs → generate_integration with config → attach → add_widget_component
**Unknown API:** web_search → web_fetch docs → generate_integration → attach → add_widget_component

### Rules
- NEVER write index.ts manually for REST APIs — use generate_integration
- ALWAYS web_search before filling config for unknown APIs
- ALWAYS test_integration after creation
- Prefer template components over add_component — they never fail
- One integration at a time — don't batch multiple providers
`;
