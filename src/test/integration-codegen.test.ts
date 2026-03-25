/**
 * Integration Codegen Framework — Comprehensive Tests
 *
 * Tests the full pipeline: schema validation → code generation → template components → tool routing.
 * These tests do NOT call external APIs — all deterministic.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SCRIPTS_DIR = path.join(ROOT, '.claude/widget-builder/scripts');
const TEMPLATES_DIR = path.join(ROOT, '.claude/widget-builder/integration-templates');
const PLUGINS_DIR = path.join(ROOT, 'src/lib/integrations/plugins');
const COMPONENTS_DIR = path.join(ROOT, '.claude/widget-builder/src/components/templates');
const HOOKS_DIR = path.join(ROOT, '.claude/widget-builder/src/hooks');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Schema Validator
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration Config Schema Validator', () => {
  let validateIntegrationConfig: (config: any) => { valid: boolean; errors: string[] };

  beforeAll(() => {
    const mod = require(path.join(SCRIPTS_DIR, 'integration-config-schema'));
    validateIntegrationConfig = mod.validateIntegrationConfig;
  });

  it('should export validateIntegrationConfig function', () => {
    expect(typeof validateIntegrationConfig).toBe('function');
  });

  it('should reject empty config with all required field errors', () => {
    const result = validateIntegrationConfig({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
    expect(result.errors.some((e: string) => e.includes('provider'))).toBe(true);
    expect(result.errors.some((e: string) => e.includes('baseUrl'))).toBe(true);
    expect(result.errors.some((e: string) => e.includes('auth'))).toBe(true);
    expect(result.errors.some((e: string) => e.includes('actions'))).toBe(true);
  });

  it('should reject invalid provider slug', () => {
    const result = validateIntegrationConfig({
      provider: 'Invalid_Provider',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'bearer', fields: [{ key: 'k', label: 'l' }] },
      actions: [{ id: 'test', name: 'T', method: 'GET', path: '/test' }],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('lowercase slug'))).toBe(true);
  });

  it('should reject non-HTTPS baseUrl', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'http://api.test.com',
      auth: { type: 'bearer', fields: [{ key: 'k', label: 'l' }] },
      actions: [{ id: 'test', name: 'T', method: 'GET', path: '/test' }],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('https://'))).toBe(true);
  });

  it('should reject invalid auth type', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'oauth2', fields: [{ key: 'k', label: 'l' }] },
      actions: [{ id: 'test', name: 'T', method: 'GET', path: '/test' }],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('auth.type'))).toBe(true);
  });

  it('should reject empty auth fields array', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'bearer', fields: [] },
      actions: [{ id: 'test', name: 'T', method: 'GET', path: '/test' }],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('auth.fields'))).toBe(true);
  });

  it('should reject auth fields missing key/label', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'bearer', fields: [{ key: '', label: '' }] },
      actions: [{ id: 'test', name: 'T', method: 'GET', path: '/test' }],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid HTTP method in actions', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'bearer', fields: [{ key: 'k', label: 'l' }] },
      actions: [{ id: 'test', name: 'T', method: 'FETCH', path: '/test' }],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('method'))).toBe(true);
  });

  it('should reject action path not starting with /', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'bearer', fields: [{ key: 'k', label: 'l' }] },
      actions: [{ id: 'test', name: 'T', method: 'GET', path: 'test' }],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('must start with /'))).toBe(true);
  });

  it('should reject action id that is not camelCase', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'bearer', fields: [{ key: 'k', label: 'l' }] },
      actions: [{ id: 'get-items', name: 'T', method: 'GET', path: '/test' }],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('actions[0].id'))).toBe(true);
  });

  it('should reject missing healthCheck fields', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'bearer', fields: [{ key: 'k', label: 'l' }] },
      actions: [{ id: 'test', name: 'T', method: 'GET', path: '/test' }],
      healthCheck: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('healthCheck.method'))).toBe(true);
    expect(result.errors.some((e: string) => e.includes('healthCheck.path'))).toBe(true);
    expect(result.errors.some((e: string) => e.includes('healthCheck.successField'))).toBe(true);
  });

  it('should validate a minimal valid config', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'bearer', fields: [{ key: 'apiKey', label: 'API Key' }] },
      actions: [{ id: 'getItems', name: 'Get Items', method: 'GET', path: '/items' }],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept all valid auth types', () => {
    for (const authType of ['bearer', 'api-key-header', 'api-key-query', 'basic', 'custom']) {
      const result = validateIntegrationConfig({
        provider: 'test',
        name: 'Test',
        baseUrl: 'https://api.test.com',
        auth: { type: authType, fields: [{ key: 'k', label: 'l' }] },
        actions: [{ id: 'test', name: 'T', method: 'GET', path: '/test' }],
        healthCheck: { method: 'GET', path: '/me', successField: 'id' },
      });
      expect(result.valid).toBe(true);
    }
  });

  it('should accept all valid HTTP methods', () => {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      const result = validateIntegrationConfig({
        provider: 'test',
        name: 'Test',
        baseUrl: 'https://api.test.com',
        auth: { type: 'bearer', fields: [{ key: 'k', label: 'l' }] },
        actions: [{ id: 'test', name: 'T', method, path: '/test' }],
        healthCheck: { method: 'GET', path: '/me', successField: 'id' },
      });
      expect(result.valid).toBe(true);
    }
  });

  it('should validate multiple actions', () => {
    const result = validateIntegrationConfig({
      provider: 'test',
      name: 'Test',
      baseUrl: 'https://api.test.com',
      auth: { type: 'bearer', fields: [{ key: 'k', label: 'l' }] },
      actions: [
        { id: 'getItems', name: 'Get', method: 'GET', path: '/items' },
        { id: 'createItem', name: 'Create', method: 'POST', path: '/items' },
        { id: 'deleteItem', name: 'Delete', method: 'DELETE', path: '/items' },
      ],
      healthCheck: { method: 'GET', path: '/me', successField: 'id' },
    });
    expect(result.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Integration Templates Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration Templates', () => {
  let validateIntegrationConfig: (config: any) => { valid: boolean; errors: string[] };

  beforeAll(() => {
    const mod = require(path.join(SCRIPTS_DIR, 'integration-config-schema'));
    validateIntegrationConfig = mod.validateIntegrationConfig;
  });

  it('should have calendly.json template', () => {
    const p = path.join(TEMPLATES_DIR, 'calendly.json');
    expect(fs.existsSync(p)).toBe(true);
    const config = JSON.parse(fs.readFileSync(p, 'utf-8'));
    expect(config.provider).toBe('calendly');
    expect(config.baseUrl).toBe('https://api.calendly.com');
    expect(validateIntegrationConfig(config).valid).toBe(true);
  });

  it('should have google-sheets.json template', () => {
    const p = path.join(TEMPLATES_DIR, 'google-sheets.json');
    expect(fs.existsSync(p)).toBe(true);
    const config = JSON.parse(fs.readFileSync(p, 'utf-8'));
    expect(config.provider).toBe('google-sheets');
    expect(config.baseUrl).toContain('sheets.googleapis.com');
    expect(validateIntegrationConfig(config).valid).toBe(true);
  });

  it('should have telegram-bot.json template', () => {
    const p = path.join(TEMPLATES_DIR, 'telegram-bot.json');
    expect(fs.existsSync(p)).toBe(true);
    const config = JSON.parse(fs.readFileSync(p, 'utf-8'));
    expect(config.provider).toBe('telegram-bot');
    expect(config.baseUrl).toBe('https://api.telegram.org');
    expect(validateIntegrationConfig(config).valid).toBe(true);
  });

  it('calendly template should have getEventTypes and createBooking actions', () => {
    const config = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, 'calendly.json'), 'utf-8'));
    const actionIds = config.actions.map((a: any) => a.id);
    expect(actionIds).toContain('getEventTypes');
    expect(actionIds).toContain('createBooking');
  });

  it('google-sheets template should have getValues and appendRow actions', () => {
    const config = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, 'google-sheets.json'), 'utf-8'));
    const actionIds = config.actions.map((a: any) => a.id);
    expect(actionIds).toContain('getValues');
    expect(actionIds).toContain('appendRow');
  });

  it('telegram-bot template should use custom auth type for bot token', () => {
    const config = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, 'telegram-bot.json'), 'utf-8'));
    expect(config.auth.type).toBe('custom');
    expect(config.auth.fields.some((f: any) => f.key === 'botToken')).toBe(true);
  });

  it('telegram-bot healthCheck should use template vars', () => {
    const config = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, 'telegram-bot.json'), 'utf-8'));
    expect(config.healthCheck.path).toContain('{{auth.botToken}}');
  });

  it('google-sheets healthCheck should use auth.spreadsheetId', () => {
    const config = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, 'google-sheets.json'), 'utf-8'));
    expect(config.healthCheck.path).toContain('{{auth.spreadsheetId}}');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Generator Script
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration Generator', () => {
  let generateManifest: (config: any) => any;
  let generatePluginTS: (config: any) => string;
  let isStubPlugin: (dir: string) => boolean;

  const VALID_CONFIG = {
    provider: 'test-api',
    name: 'Test API',
    category: 'data',
    color: '#FF0000',
    baseUrl: 'https://api.test.com',
    docsUrl: 'https://docs.test.com',
    auth: {
      type: 'bearer',
      header: 'Authorization',
      prefix: 'Bearer',
      fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }],
    },
    actions: [
      {
        id: 'getItems',
        name: 'Get Items',
        description: 'Fetch all items',
        method: 'GET',
        path: '/items',
        responseMapping: { root: 'data', fields: { id: 'id', name: 'title' } },
      },
      {
        id: 'createItem',
        name: 'Create Item',
        description: 'Create a new item',
        method: 'POST',
        path: '/items',
        body: { title: '{{params.title}}', description: '{{params.description}}' },
      },
    ],
    healthCheck: { method: 'GET', path: '/me', successField: 'id' },
  };

  beforeAll(() => {
    const mod = require(path.join(SCRIPTS_DIR, 'generate-integration'));
    generateManifest = mod.generateManifest;
    generatePluginTS = mod.generatePluginTS;
    isStubPlugin = mod.isStubPlugin;
  });

  it('should export generator functions', () => {
    expect(typeof generateManifest).toBe('function');
    expect(typeof generatePluginTS).toBe('function');
    expect(typeof isStubPlugin).toBe('function');
  });

  describe('generateManifest', () => {
    it('should produce manifest with correct slug', () => {
      const manifest = generateManifest(VALID_CONFIG);
      expect(manifest.slug).toBe('test-api');
      expect(manifest.name).toBe('Test API');
      expect(manifest.category).toBe('data');
      expect(manifest.status).toBe('active');
    });

    it('should map auth fields correctly', () => {
      const manifest = generateManifest(VALID_CONFIG);
      expect(manifest.authFields).toHaveLength(1);
      expect(manifest.authFields[0].key).toBe('apiKey');
      expect(manifest.authFields[0].label).toBe('API Key');
      expect(manifest.authFields[0].required).toBe(true);
    });

    it('should map actions correctly', () => {
      const manifest = generateManifest(VALID_CONFIG);
      expect(manifest.actions).toHaveLength(2);
      expect(manifest.actions[0].id).toBe('getItems');
      expect(manifest.actions[1].id).toBe('createItem');
    });

    it('should extract inputSchema from body template vars', () => {
      const manifest = generateManifest(VALID_CONFIG);
      const createAction = manifest.actions.find((a: any) => a.id === 'createItem');
      expect(createAction.inputSchema).toHaveProperty('title');
      expect(createAction.inputSchema).toHaveProperty('description');
    });

    it('should have same keys as HubSpot manifest', () => {
      const manifest = generateManifest(VALID_CONFIG);
      const hubspotManifest = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, 'hubspot/manifest.json'), 'utf-8'));
      const genKeys = Object.keys(manifest).sort();
      const hubKeys = Object.keys(hubspotManifest).sort();
      expect(genKeys).toEqual(hubKeys);
    });

    it('should use defaults for optional fields', () => {
      const minConfig = { ...VALID_CONFIG, category: undefined, color: undefined, docsUrl: undefined };
      const manifest = generateManifest(minConfig);
      expect(manifest.category).toBe('data'); // default
      expect(manifest.color).toBe('#6366f1'); // default
      expect(manifest.docsUrl).toBe('');
    });
  });

  describe('generatePluginTS', () => {
    it('should produce valid TypeScript with named export', () => {
      const code = generatePluginTS(VALID_CONFIG);
      expect(code).toContain('export const testApiPlugin');
      expect(code).not.toContain('export default');
    });

    it('should convert provider slug to camelCase for export name', () => {
      const code = generatePluginTS(VALID_CONFIG);
      // test-api → testApi → testApiPlugin
      expect(code).toContain('testApiPlugin');
    });

    it('should include all 6 IntegrationPlugin methods', () => {
      const code = generatePluginTS(VALID_CONFIG);
      expect(code).toContain('async connect(');
      expect(code).toContain('async disconnect()');
      expect(code).toContain('async testConnection(');
      expect(code).toContain('async healthCheck(');
      expect(code).toContain('async execute(');
      expect(code).toContain('describeCapabilities()');
    });

    it('should include resolveTemplate function', () => {
      const code = generatePluginTS(VALID_CONFIG);
      expect(code).toContain('function resolveTemplate(');
    });

    it('should include buildHeaders function', () => {
      const code = generatePluginTS(VALID_CONFIG);
      expect(code).toContain('function buildHeaders(');
    });

    it('should include getNestedValue function', () => {
      const code = generatePluginTS(VALID_CONFIG);
      expect(code).toContain('function getNestedValue(');
    });

    it('should import from core types', () => {
      const code = generatePluginTS(VALID_CONFIG);
      expect(code).toContain("from '../../core/types'");
    });

    it('should embed config as const', () => {
      const code = generatePluginTS(VALID_CONFIG);
      expect(code).toContain('const config =');
      expect(code).toContain('as const');
      expect(code).toContain('"test-api"'); // embedded provider
    });

    it('should include auto-generated warning', () => {
      const code = generatePluginTS(VALID_CONFIG);
      expect(code).toContain('Auto-generated from integration.config.json');
      expect(code).toContain('DO NOT EDIT MANUALLY');
    });
  });

  describe('isStubPlugin', () => {
    it('should detect stub plugins', () => {
      // Existing stubs use createStubPlugin
      const salesforceDir = path.join(PLUGINS_DIR, 'salesforce');
      if (fs.existsSync(salesforceDir)) {
        expect(isStubPlugin(salesforceDir)).toBe(true);
      }
    });

    it('should NOT detect HubSpot as stub', () => {
      const hubspotDir = path.join(PLUGINS_DIR, 'hubspot');
      expect(isStubPlugin(hubspotDir)).toBe(false);
    });

    it('should detect non-existent dir as stub', () => {
      expect(isStubPlugin('/tmp/nonexistent')).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Template UI Components — File Structure
// ─────────────────────────────────────────────────────────────────────────────

describe('Template UI Components', () => {
  const COMPONENTS = ['ActionButton', 'DataForm', 'DataList', 'StatusCard', 'ExternalLink'];

  for (const name of COMPONENTS) {
    it(`${name}.jsx should exist`, () => {
      const p = path.join(COMPONENTS_DIR, `${name}.jsx`);
      expect(fs.existsSync(p)).toBe(true);
    });

    it(`${name}.jsx should export default function with ctx prop`, () => {
      const code = fs.readFileSync(path.join(COMPONENTS_DIR, `${name}.jsx`), 'utf-8');
      expect(code).toContain(`export default function ${name}`);
      expect(code).toContain('{ ctx }');
    });

    it(`${name}.jsx should import from 'react' (not preact/hooks)`, () => {
      const code = fs.readFileSync(path.join(COMPONENTS_DIR, `${name}.jsx`), 'utf-8');
      if (code.includes('useState') || code.includes('useEffect') || code.includes('useCallback')) {
        expect(code).toContain("from 'react'");
      }
    });

    it(`${name}.jsx should use CSS variable classes (bg-aw-* or text-aw-*)`, () => {
      const code = fs.readFileSync(path.join(COMPONENTS_DIR, `${name}.jsx`), 'utf-8');
      expect(code).toMatch(/(?:bg|text|border)-aw-/);
    });
  }

  it('ActionButton should handle loading/success/error states', () => {
    const code = fs.readFileSync(path.join(COMPONENTS_DIR, 'ActionButton.jsx'), 'utf-8');
    expect(code).toContain('loading');
    expect(code).toContain('success');
    expect(code).toContain('error');
  });

  it('DataForm should have form submission logic', () => {
    const code = fs.readFileSync(path.join(COMPONENTS_DIR, 'DataForm.jsx'), 'utf-8');
    expect(code).toContain('handleSubmit');
    expect(code).toContain('onSubmit');
    expect(code).toContain('executeIntegration');
  });

  it('DataList should fetch data on mount', () => {
    const code = fs.readFileSync(path.join(COMPONENTS_DIR, 'DataList.jsx'), 'utf-8');
    expect(code).toContain('useEffect');
    expect(code).toContain('executeIntegration');
  });

  it('StatusCard should support refreshInterval', () => {
    const code = fs.readFileSync(path.join(COMPONENTS_DIR, 'StatusCard.jsx'), 'utf-8');
    expect(code).toContain('refreshInterval');
    expect(code).toContain('setInterval');
  });

  it('ExternalLink should support popup mode', () => {
    const code = fs.readFileSync(path.join(COMPONENTS_DIR, 'ExternalLink.jsx'), 'utf-8');
    expect(code).toContain('popup');
    expect(code).toContain('window.open');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. useIntegration Hook
// ─────────────────────────────────────────────────────────────────────────────

describe('useIntegration Hook', () => {
  it('should exist', () => {
    const p = path.join(HOOKS_DIR, 'useIntegration.js');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('should import useCallback from react', () => {
    const code = fs.readFileSync(path.join(HOOKS_DIR, 'useIntegration.js'), 'utf-8');
    expect(code).toContain("import { useCallback } from 'react'");
  });

  it('should export default function', () => {
    const code = fs.readFileSync(path.join(HOOKS_DIR, 'useIntegration.js'), 'utf-8');
    expect(code).toContain('export default function useIntegration');
  });

  it('should call /api/integrations/execute', () => {
    const code = fs.readFileSync(path.join(HOOKS_DIR, 'useIntegration.js'), 'utf-8');
    expect(code).toContain('/api/integrations/execute');
  });

  it('should use slug field (not provider) in request body', () => {
    const code = fs.readFileSync(path.join(HOOKS_DIR, 'useIntegration.js'), 'utf-8');
    expect(code).toContain('slug: provider');
  });

  it('should return execute function', () => {
    const code = fs.readFileSync(path.join(HOOKS_DIR, 'useIntegration.js'), 'utf-8');
    expect(code).toContain('return { execute }');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. WidgetShell Integration
// ─────────────────────────────────────────────────────────────────────────────

describe('WidgetShell Integration', () => {
  let shellCode: string;

  beforeAll(() => {
    shellCode = fs.readFileSync(path.join(ROOT, '.claude/widget-builder/src/components/WidgetShell.jsx'), 'utf-8');
  });

  it('should import all 5 template components', () => {
    expect(shellCode).toContain("import ActionButton from './templates/ActionButton'");
    expect(shellCode).toContain("import DataForm from './templates/DataForm'");
    expect(shellCode).toContain("import DataList from './templates/DataList'");
    expect(shellCode).toContain("import StatusCard from './templates/StatusCard'");
    expect(shellCode).toContain("import ExternalLink from './templates/ExternalLink'");
  });

  it('should import useIntegration hook', () => {
    expect(shellCode).toContain("import useIntegration from '../hooks/useIntegration'");
  });

  it('should have template entries in COMPONENT_MAP', () => {
    expect(shellCode).toContain('actionButton: ActionButton');
    expect(shellCode).toContain('dataForm: DataForm');
    expect(shellCode).toContain('dataList: DataList');
    expect(shellCode).toContain('statusCard: StatusCard');
    expect(shellCode).toContain('externalLink: ExternalLink');
  });

  it('should call useIntegration hook', () => {
    expect(shellCode).toContain('useIntegration(config)');
    expect(shellCode).toContain('executeIntegration');
  });

  it('should have executeIntegration in ctx object', () => {
    // Check that executeIntegration is spread into ctx
    expect(shellCode).toContain('executeIntegration');
    // Verify it's in the ctx = { ... } block
    const ctxMatch = shellCode.match(/const ctx = \{[\s\S]*?\};/);
    expect(ctxMatch).not.toBeNull();
    expect(ctxMatch![0]).toContain('executeIntegration');
  });

  it('should have dual lookup in renderSlot', () => {
    expect(shellCode).toContain('COMPONENT_MAP[comp.id] || COMPONENT_MAP[comp.template]');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. modify_structure add_widget_component Operation
// ─────────────────────────────────────────────────────────────────────────────

describe('modify_structure — add_widget_component', () => {
  let coreToolsCode: string;

  beforeAll(() => {
    coreToolsCode = fs.readFileSync(path.join(ROOT, 'src/lib/builder/tools/coreTools.ts'), 'utf-8');
  });

  it('should include add_widget_component in modify_structure description', () => {
    expect(coreToolsCode).toContain('add_widget_component');
  });

  it('should validate template names (camelCase, no toLowerCase)', () => {
    expect(coreToolsCode).toContain("'actionButton', 'dataForm', 'dataList', 'statusCard', 'externalLink'");
    // Should NOT have .toLowerCase() which would break camelCase matching
    expect(coreToolsCode).not.toMatch(/op\.template\??\.\s*toLowerCase\s*\(\)/);
  });

  it('should check for duplicate componentId before adding', () => {
    expect(coreToolsCode).toContain('already exists');
  });

  it('should default slot to panel-footer', () => {
    expect(coreToolsCode).toContain("op.slot || 'panel-footer'");
  });

  it('should add template field to new component', () => {
    // The structure.components.push should include template
    const pushMatch = coreToolsCode.match(/structure\.components\.push\(\{[\s\S]*?\}\)/);
    expect(pushMatch).not.toBeNull();
    expect(pushMatch![0]).toContain('template');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Dynamic Integration Tools
// ─────────────────────────────────────────────────────────────────────────────

describe('Dynamic Integration Tools', () => {
  let integToolsCode: string;

  beforeAll(() => {
    integToolsCode = fs.readFileSync(path.join(ROOT, 'src/lib/builder/tools/dynamicIntegrationTools.ts'), 'utf-8');
  });

  it('should define all 6 dynamic integration tools', () => {
    expect(integToolsCode).toContain("name: 'research_api'");
    expect(integToolsCode).toContain("name: 'create_integration'");
    expect(integToolsCode).toContain("name: 'test_integration_config'");
    expect(integToolsCode).toContain("name: 'activate_integration'");
    expect(integToolsCode).toContain("name: 'deactivate_integration'");
    expect(integToolsCode).toContain("name: 'list_integrations'");
  });

  it('should use validateConfig from engine', () => {
    expect(integToolsCode).toContain('validateConfig');
    expect(integToolsCode).toContain('executeAction');
  });

  it('should encrypt credentials', () => {
    expect(integToolsCode).toContain('encrypt');
    expect(integToolsCode).toContain('encryptedCreds');
  });

  it('should build unified actions prompt', () => {
    expect(integToolsCode).toContain('buildUnifiedActionsPrompt');
    expect(integToolsCode).toContain('actionsSystemPrompt');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Gemini Integration Guide
// ─────────────────────────────────────────────────────────────────────────────

describe('Gemini Integration Guide', () => {
  let guideCode: string;

  beforeAll(() => {
    guideCode = fs.readFileSync(path.join(ROOT, 'src/lib/builder/geminiIntegrationGuide.ts'), 'utf-8');
  });

  it('should export INTEGRATION_GUIDE', () => {
    expect(guideCode).toContain('export const INTEGRATION_GUIDE');
  });

  it('should include decision tree with new tools', () => {
    expect(guideCode).toContain('Decision Tree');
    expect(guideCode).toContain('research_api');
    expect(guideCode).toContain('create_integration');
    expect(guideCode).toContain('activate_integration');
  });

  it('should list all 5 template components', () => {
    expect(guideCode).toContain('actionButton');
    expect(guideCode).toContain('dataForm');
    expect(guideCode).toContain('dataList');
    expect(guideCode).toContain('statusCard');
    expect(guideCode).toContain('externalLink');
  });

  it('should include config-driven schema info', () => {
    expect(guideCode).toContain('IntegrationConfig');
    expect(guideCode).toContain('provider');
    expect(guideCode).toContain('baseUrl');
  });

  it('should include flow examples', () => {
    expect(guideCode).toContain('HubSpot');
    expect(guideCode).toContain('Telegram');
  });

  it('should include rules with new tool names', () => {
    expect(guideCode).toContain('ALWAYS call research_api');
    expect(guideCode).toContain('ALWAYS call test_integration_config');
    expect(guideCode).toContain('NEVER tell user');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. System Prompt + Codegen Prompt Updates
// ─────────────────────────────────────────────────────────────────────────────

describe('System Prompt Updates', () => {
  let systemPrompt: string;

  beforeAll(() => {
    systemPrompt = fs.readFileSync(path.join(ROOT, 'src/lib/builder/systemPrompt.ts'), 'utf-8');
  });

  it('should include config-driven integration flow', () => {
    expect(systemPrompt).toContain('CONFIG-DRIVEN');
    expect(systemPrompt).toContain('create_integration');
  });

  it('should include tool routing for integrations', () => {
    expect(systemPrompt).toContain('research_api');
    expect(systemPrompt).toContain('activate_integration');
  });
});

describe('Codegen Prompt Updates', () => {
  let codegenPrompt: string;

  beforeAll(() => {
    codegenPrompt = fs.readFileSync(path.join(ROOT, 'src/lib/builder/codegenPrompt.ts'), 'utf-8');
  });

  it('should import INTEGRATION_GUIDE', () => {
    expect(codegenPrompt).toContain("from './geminiIntegrationGuide'");
  });

  it('should have integration detection logic', () => {
    expect(codegenPrompt).toMatch(/integrat|connect|api/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Generator — Theme Template (generate-single-theme.js)
// ─────────────────────────────────────────────────────────────────────────────

describe('Theme Generator — Integration Support', () => {
  let genCode: string;

  beforeAll(() => {
    genCode = fs.readFileSync(path.join(SCRIPTS_DIR, 'generate-single-theme.js'), 'utf-8');
  });

  it('should include template component imports in generated WidgetShell', () => {
    expect(genCode).toContain("import ActionButton from './templates/ActionButton'");
    expect(genCode).toContain("import useIntegration from '../hooks/useIntegration'");
  });

  it('should include template entries in generated COMPONENT_MAP', () => {
    expect(genCode).toContain('actionButton: ActionButton');
    expect(genCode).toContain('dataForm: DataForm');
    expect(genCode).toContain('statusCard: StatusCard');
  });

  it('should include dual lookup in generated renderSlot', () => {
    expect(genCode).toContain('COMPONENT_MAP[comp.id] || COMPONENT_MAP[comp.template]');
  });

  it('should include useIntegration in generated code', () => {
    expect(genCode).toContain('useIntegration(config)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. End-to-End: Generator Pipeline
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E: Generator Pipeline', () => {
  const TEST_PROVIDER = 'test-e2e-provider';
  const TEST_DIR = path.join(PLUGINS_DIR, TEST_PROVIDER);

  const TEST_CONFIG = {
    provider: TEST_PROVIDER,
    name: 'E2E Test Provider',
    category: 'data',
    baseUrl: 'https://api.test-e2e.com',
    auth: {
      type: 'bearer',
      header: 'Authorization',
      prefix: 'Bearer',
      fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }],
    },
    actions: [
      {
        id: 'fetchData',
        name: 'Fetch Data',
        method: 'GET',
        path: '/data',
        responseMapping: { root: 'items', fields: { id: 'id', name: 'name' } },
      },
      {
        id: 'pushData',
        name: 'Push Data',
        method: 'POST',
        path: '/data',
        body: { value: '{{params.value}}' },
      },
    ],
    healthCheck: { method: 'GET', path: '/health', successField: 'status' },
  };

  afterAll(() => {
    // Clean up test artifacts
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    // Remove import from barrel file if added
    const barrelPath = path.join(PLUGINS_DIR, 'index.ts');
    let barrel = fs.readFileSync(barrelPath, 'utf-8');
    if (barrel.includes('testE2eProviderPlugin')) {
      barrel = barrel
        .split('\n')
        .filter((l: string) => !l.includes('testE2eProviderPlugin') && !l.includes(TEST_PROVIDER))
        .join('\n');
      fs.writeFileSync(barrelPath, barrel);
    }
  });

  it('should generate plugin files from config', () => {
    const { generate } = require(path.join(SCRIPTS_DIR, 'generate-integration'));

    // Write temp config
    const tempConfigPath = path.join(TEST_DIR, 'integration.config.json');
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.writeFileSync(tempConfigPath, JSON.stringify(TEST_CONFIG));

    // Run generator
    const result = generate(tempConfigPath);

    expect(result.provider).toBe(TEST_PROVIDER);
    expect(fs.existsSync(path.join(TEST_DIR, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, 'index.ts'))).toBe(true);
  });

  it('generated manifest should have correct structure', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'manifest.json'), 'utf-8'));
    expect(manifest.slug).toBe(TEST_PROVIDER);
    expect(manifest.name).toBe('E2E Test Provider');
    expect(manifest.actions).toHaveLength(2);
    expect(manifest.status).toBe('active');
    expect(manifest.authFields).toHaveLength(1);
  });

  it('generated plugin should have named export', () => {
    const code = fs.readFileSync(path.join(TEST_DIR, 'index.ts'), 'utf-8');
    // __test-e2e-provider → testE2eProviderPlugin
    expect(code).toContain('export const testE2eProviderPlugin');
  });

  it('generated plugin should have all 6 methods', () => {
    const code = fs.readFileSync(path.join(TEST_DIR, 'index.ts'), 'utf-8');
    const methods = [
      'connect(',
      'disconnect()',
      'testConnection(',
      'healthCheck(',
      'execute(',
      'describeCapabilities()',
    ];
    for (const m of methods) {
      expect(code).toContain(m);
    }
  });

  it('generated plugin should embed the config', () => {
    const code = fs.readFileSync(path.join(TEST_DIR, 'index.ts'), 'utf-8');
    expect(code).toContain('"test-e2e-provider"');
    expect(code).toContain('"https://api.test-e2e.com"');
    expect(code).toContain('"fetchData"');
    expect(code).toContain('"pushData"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Widget Build Verification
// ─────────────────────────────────────────────────────────────────────────────

describe('Widget Build', () => {
  it('winbix-ai dist/script.js should exist (from previous build)', () => {
    const scriptPath = path.join(ROOT, '.claude/widget-builder/dist/script.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const stat = fs.statSync(scriptPath);
    expect(stat.size).toBeGreaterThan(100000); // Should be > 100KB
  });
});
