'use strict';

const fs = require('fs');
const path = require('path');
const { validateIntegrationConfig } = require('./integration-config-schema');

const PLUGINS_DIR = path.resolve(__dirname, '../../../src/lib/integrations/plugins');
const BARREL_FILE = path.join(PLUGINS_DIR, 'index.ts');

function generateManifest(config) {
  return {
    slug: config.provider,
    name: config.name,
    category: config.category || 'data',
    description: config.description || `${config.name} integration`,
    icon: `/integrations/${config.provider}.svg`,
    color: config.color || '#6366f1',
    authFields: config.auth.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type || 'password',
      required: f.required !== false,
      placeholder: f.placeholder || '',
    })),
    actions: config.actions.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description || a.name,
      inputSchema: a.body
        ? Object.fromEntries(
            JSON.stringify(a.body)
              .match(/\{\{params\.(\w+)\}\}/g)
              ?.map((m) => {
                const key = m.match(/params\.(\w+)/)[1];
                return [key, 'string'];
              }) || []
          )
        : {},
    })),
    healthEndpoint: config.healthCheck.path,
    docsUrl: config.docsUrl || '',
    status: 'active',
  };
}

function generatePluginTS(config) {
  const providerCamel = config.provider.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return `import { IntegrationPlugin, ConnectionResult, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

// Auto-generated from integration.config.json — DO NOT EDIT MANUALLY
// To update: modify integration.config.json and re-run generate-integration.js

const config = ${JSON.stringify(config, null, 2)} as const;

function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\\{\\{(\\w+\\.\\w+)\\}\\}/g, (_, p) => {
    const [scope, key] = p.split('.');
    return context[scope]?.[key] ?? '';
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function buildHeaders(credentials: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authType = config.auth.type;
  const credKey = config.auth.fields[0].key;

  if (authType === 'bearer') {
    headers[config.auth.header || 'Authorization'] = \`\${config.auth.prefix || 'Bearer'} \${credentials[credKey]}\`;
  } else if (authType === 'api-key-header') {
    headers[config.auth.header || 'X-API-Key'] = credentials[credKey];
  } else if (authType === 'basic') {
    const user = credentials.username || '';
    const pass = credentials.password || credentials[credKey] || '';
    headers['Authorization'] = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
  }
  return headers;
}

// Named export — matches existing convention (calendlyPlugin, hubspotPlugin, etc.)
export const ${providerCamel}Plugin: IntegrationPlugin = {
  manifest,

  async connect(credentials: Record<string, string>): Promise<ConnectionResult> {
    const health = await this.healthCheck(credentials);
    return { success: health.healthy, error: health.error, metadata: {} };
  },

  async disconnect(): Promise<void> {},

  async testConnection(credentials: Record<string, string>): Promise<HealthResult> {
    return this.healthCheck(credentials);
  },

  async healthCheck(credentials: Record<string, string>): Promise<HealthResult> {
    try {
      const hcPath = resolveTemplate(config.healthCheck.path, { auth: credentials, params: {} });
      const url = config.baseUrl + hcPath;
      const headers = buildHeaders(credentials);
      const res = await fetch(url, { method: config.healthCheck.method, headers });
      if (!res.ok) return { healthy: false, error: \`HTTP \${res.status}\` };
      const data = await res.json();
      return { healthy: !!getNestedValue(data, config.healthCheck.successField) };
    } catch (err) {
      return { healthy: false, error: (err as Error).message };
    }
  },

  async execute(action: string, params: Record<string, unknown>, credentials: Record<string, string>): Promise<ExecutionResult> {
    const actionDef = config.actions.find(a => a.id === action);
    if (!actionDef) return { success: false, error: \`Unknown action: \${action}\` };

    try {
      const context = { params, auth: credentials };
      let url = config.baseUrl + resolveTemplate(actionDef.path, context);
      const headers = buildHeaders(credentials);
      const fetchOpts: RequestInit = { method: actionDef.method, headers };

      if ((actionDef as any).body && ['POST', 'PUT', 'PATCH'].includes(actionDef.method)) {
        fetchOpts.body = JSON.stringify(
          JSON.parse(resolveTemplate(JSON.stringify((actionDef as any).body), context))
        );
      }
      if ((actionDef as any).queryParams) {
        const qp = new URLSearchParams();
        for (const [k, v] of Object.entries((actionDef as any).queryParams)) {
          qp.set(k, resolveTemplate(v as string, context));
        }
        url += '?' + qp.toString();
      }

      const res = await fetch(url, fetchOpts);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { success: false, error: \`\${action} failed: HTTP \${res.status} — \${errText.slice(0, 200)}\`, retryable: res.status >= 500 };
      }

      const data = await res.json();
      const mapping = (actionDef as any).responseMapping;
      const root = mapping?.root ? getNestedValue(data, mapping.root) : data;

      if (mapping?.fields && root) {
        const mapItem = (item: any) => {
          const mapped: Record<string, any> = {};
          for (const [ourKey, apiKey] of Object.entries(mapping.fields)) {
            mapped[ourKey] = getNestedValue(item, apiKey as string);
          }
          return mapped;
        };
        return { success: true, data: Array.isArray(root) ? root.map(mapItem) : mapItem(root) };
      }
      return { success: true, data: root || data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },

  describeCapabilities(): string {
    return config.actions.map(a => \`\${a.id}: \${a.description || a.name}\`).join('; ');
  },
};

// No default export — barrel file uses named import: import { ${providerCamel}Plugin } from './${config.provider}';
`;
}

function isStubPlugin(pluginDir) {
  const indexPath = path.join(pluginDir, 'index.ts');
  if (!fs.existsSync(indexPath)) return true;
  const content = fs.readFileSync(indexPath, 'utf-8');
  return content.includes('createStubPlugin') || content.includes('_stub');
}

function hasConfigSibling(pluginDir) {
  return fs.existsSync(path.join(pluginDir, 'integration.config.json'));
}

function updateBarrelFile(provider) {
  let barrel = fs.readFileSync(BARREL_FILE, 'utf-8');

  const importName = provider.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Plugin';
  if (barrel.includes(importName)) {
    console.log(`  ✓ ${importName} already in barrel file`);
    return;
  }

  const importLines = barrel.split('\n').filter((l) => l.startsWith('import'));
  const lastImport = importLines[importLines.length - 1];
  const newImport = `import { ${importName} } from './${provider}';`;
  barrel = barrel.replace(lastImport, lastImport + '\n' + newImport);

  const arrayMatch = barrel.match(/\[([^\]]+)\]/s);
  if (arrayMatch) {
    const existingArray = arrayMatch[1].trim();
    const newArray = existingArray + `,\n     ${importName}`;
    barrel = barrel.replace(arrayMatch[1], newArray);
  }

  fs.writeFileSync(BARREL_FILE, barrel);
  console.log(`  ✓ Added ${importName} to barrel file`);
}

function generate(configPath) {
  console.log(`\nGenerating integration from: ${configPath}`);

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const validation = validateIntegrationConfig(config);
  if (!validation.valid) {
    console.error('❌ Invalid config:');
    validation.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const provider = config.provider;
  const pluginDir = path.join(PLUGINS_DIR, provider);

  if (fs.existsSync(pluginDir)) {
    if (!isStubPlugin(pluginDir) && !hasConfigSibling(pluginDir)) {
      console.error(`❌ Plugin "${provider}" already has a full implementation. Use modify_component to edit it.`);
      process.exit(1);
    }
    console.log(`  ⚠️ Overwriting ${isStubPlugin(pluginDir) ? 'stub' : 'generated'} plugin for "${provider}"`);
  }

  fs.mkdirSync(pluginDir, { recursive: true });

  const manifest = generateManifest(config);
  fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`  ✓ Generated manifest.json`);

  const pluginCode = generatePluginTS(config);
  fs.writeFileSync(path.join(pluginDir, 'index.ts'), pluginCode);
  console.log(`  ✓ Generated index.ts (${pluginCode.split('\n').length} lines)`);

  fs.writeFileSync(path.join(pluginDir, 'integration.config.json'), JSON.stringify(config, null, 2));
  console.log(`  ✓ Saved integration.config.json`);

  updateBarrelFile(provider);

  console.log(`\n✅ Integration "${provider}" generated successfully!`);
  console.log(`   Plugin: ${pluginDir}/index.ts`);
  console.log(`   Manifest: ${pluginDir}/manifest.json`);
  return { provider, pluginDir, manifest };
}

if (require.main === module) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('Usage: node generate-integration.js <path-to-integration.config.json>');
    process.exit(1);
  }
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  generate(resolved);
}

module.exports = { generate, generateManifest, generatePluginTS, isStubPlugin };
