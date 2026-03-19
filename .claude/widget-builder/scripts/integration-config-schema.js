'use strict';

const VALID_AUTH_TYPES = ['bearer', 'api-key-header', 'api-key-query', 'basic', 'custom'];
const VALID_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function validateIntegrationConfig(config) {
  const errors = [];

  if (!config.provider || typeof config.provider !== 'string') errors.push('provider: required string (lowercase slug)');
  if (config.provider && !/^[a-z][a-z0-9-]*$/.test(config.provider)) errors.push('provider: must be lowercase slug (a-z, 0-9, hyphens)');
  if (!config.name || typeof config.name !== 'string') errors.push('name: required string');
  if (!config.baseUrl || typeof config.baseUrl !== 'string') errors.push('baseUrl: required string');
  if (config.baseUrl && !config.baseUrl.startsWith('https://')) errors.push('baseUrl: must start with https://');

  if (!config.auth || typeof config.auth !== 'object') {
    errors.push('auth: required object');
  } else {
    if (!VALID_AUTH_TYPES.includes(config.auth.type)) errors.push(`auth.type: must be one of ${VALID_AUTH_TYPES.join(', ')}`);
    if (!Array.isArray(config.auth.fields) || config.auth.fields.length === 0) errors.push('auth.fields: required non-empty array');
    if (config.auth.fields) {
      config.auth.fields.forEach((f, i) => {
        if (!f.key) errors.push(`auth.fields[${i}].key: required`);
        if (!f.label) errors.push(`auth.fields[${i}].label: required`);
      });
    }
  }

  if (!Array.isArray(config.actions) || config.actions.length === 0) {
    errors.push('actions: required non-empty array');
  } else {
    config.actions.forEach((a, i) => {
      if (!a.id || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(a.id)) errors.push(`actions[${i}].id: required camelCase string`);
      if (!a.name) errors.push(`actions[${i}].name: required string`);
      if (!VALID_METHODS.includes(a.method)) errors.push(`actions[${i}].method: must be one of ${VALID_METHODS.join(', ')}`);
      if (!a.path || !a.path.startsWith('/')) errors.push(`actions[${i}].path: must start with /`);
    });
  }

  if (!config.healthCheck || typeof config.healthCheck !== 'object') {
    errors.push('healthCheck: required object');
  } else {
    if (!VALID_METHODS.includes(config.healthCheck.method)) errors.push('healthCheck.method: required valid HTTP method');
    if (!config.healthCheck.path) errors.push('healthCheck.path: required');
    if (!config.healthCheck.successField) errors.push('healthCheck.successField: required');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateIntegrationConfig };
