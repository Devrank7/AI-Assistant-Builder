export const INTEGRATION_GUIDE = `## Integration Guide — Config-Driven Approach

### Decision Tree
- User says "connect X" / "add X integration" → research_api → create_integration → test_integration_config → activate_integration
- User says "add booking button" / "add contact form" → modify_structure with add_widget_component (template UI)
- User says "show event list" / "display status" → modify_structure with add_widget_component (DataList/StatusCard)
- Integration already exists (check list_integrations) → already active, no action needed

### Available Template Components
| Template | Use for | Key props |
|----------|---------|-----------|
| actionButton | Trigger action (book, pay, save) | label, provider, action, params, style |
| dataForm | Collect input + submit (contact form, booking form) | fields[], submitAction, successMessage |
| dataList | Display fetched data (events, contacts) | provider, action, displayFields[] |
| statusCard | Show single data point (balance, status) | provider, action, displayFields[], refreshInterval |
| externalLink | Open external URL | url, label, openIn |

### IntegrationConfig Schema (Config-Driven)
The builder creates JSON configs, NOT code. The runtime engine executes them deterministically.
Template vars: \`{{auth.X}}\` from credentials, \`{{config.X}}\` from static config, \`{{input.X}}\` from runtime args.

### Flow Examples
**Any REST API:** research_api → ask user for credentials → create_integration (JSON config) → test_integration_config → activate_integration
**Marketplace plugin (HubSpot, Stripe):** open_connection_wizard → plugin handles OAuth/connection → list_integrations to verify
**Telegram notifications:** research_api("telegram", "sendMessage") → get bot token from user → web_fetch getUpdates for chat_id → create_integration → test_integration_config → activate_integration

### Rules
- ALWAYS call research_api before creating configs for unknown APIs
- ALWAYS call test_integration_config after create_integration
- NEVER tell user "connected" until activate_integration succeeds
- Use list_integrations to check existing integrations before adding duplicates
- One integration at a time — don't batch multiple providers
`;
