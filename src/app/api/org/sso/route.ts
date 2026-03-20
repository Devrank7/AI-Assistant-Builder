import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { verifyUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SSOConfig from '@/models/SSOConfig';
import Organization from '@/models/Organization';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  if (!auth.organizationId) {
    return Errors.badRequest('No organization found');
  }

  // Must be owner or admin
  if (!auth.orgRole || !['owner', 'admin'].includes(auth.orgRole)) {
    return Errors.forbidden('Only owners and admins can view SSO settings');
  }

  // Check enterprise plan
  await connectDB();
  const org = await Organization.findById(auth.organizationId);
  if (!org || org.plan !== 'enterprise') {
    return Errors.forbidden('SSO is available on the Enterprise plan only');
  }

  const config = await SSOConfig.findOne({ organizationId: auth.organizationId });

  return successResponse(
    config
      ? {
          protocol: config.protocol,
          provider: config.provider,
          entryPoint: config.entryPoint,
          issuer: config.issuer,
          cert: config.cert ? '***configured***' : null,
          clientId: config.clientId,
          clientSecret: config.clientSecret ? '***configured***' : null,
          discoveryUrl: config.discoveryUrl,
          autoProvision: config.autoProvision,
          defaultRole: config.defaultRole,
          allowedDomains: config.allowedDomains,
          enforceSSO: config.enforceSSO,
          enabled: config.enabled,
        }
      : null
  );
}

export async function PUT(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  if (!auth.organizationId) {
    return Errors.badRequest('No organization found');
  }

  // Must be owner or admin
  if (!auth.orgRole || !['owner', 'admin'].includes(auth.orgRole)) {
    return Errors.forbidden('Only owners and admins can manage SSO settings');
  }

  // Check enterprise plan
  await connectDB();
  const org = await Organization.findById(auth.organizationId);
  if (!org || org.plan !== 'enterprise') {
    return Errors.forbidden('SSO is available on the Enterprise plan only');
  }

  try {
    const body = await request.json();
    const {
      protocol,
      provider,
      entryPoint,
      issuer,
      cert,
      clientId,
      clientSecret,
      discoveryUrl,
      autoProvision,
      defaultRole,
      allowedDomains,
      enforceSSO,
      enabled,
    } = body;

    // Validate protocol
    if (protocol && !['saml', 'oidc'].includes(protocol)) {
      return Errors.badRequest('Protocol must be "saml" or "oidc"');
    }

    // Validate required fields based on protocol
    const effectiveProtocol = protocol || 'saml';
    if (enabled) {
      if (effectiveProtocol === 'saml' && (!entryPoint || !issuer)) {
        return Errors.badRequest('SAML requires entryPoint and issuer');
      }
      if (effectiveProtocol === 'oidc' && (!clientId || !discoveryUrl)) {
        return Errors.badRequest('OIDC requires clientId and discoveryUrl');
      }
    }

    const updateData: Record<string, unknown> = {
      organizationId: auth.organizationId,
    };

    if (protocol !== undefined) updateData.protocol = protocol;
    if (provider !== undefined) updateData.provider = provider;
    if (entryPoint !== undefined) updateData.entryPoint = entryPoint;
    if (issuer !== undefined) updateData.issuer = issuer;
    if (cert !== undefined && cert !== '***configured***') updateData.cert = cert;
    if (clientId !== undefined) updateData.clientId = clientId;
    if (clientSecret !== undefined && clientSecret !== '***configured***') updateData.clientSecret = clientSecret;
    if (discoveryUrl !== undefined) updateData.discoveryUrl = discoveryUrl;
    if (autoProvision !== undefined) updateData.autoProvision = autoProvision;
    if (defaultRole !== undefined) updateData.defaultRole = defaultRole;
    if (allowedDomains !== undefined) updateData.allowedDomains = allowedDomains;
    if (enforceSSO !== undefined) updateData.enforceSSO = enforceSSO;
    if (enabled !== undefined) updateData.enabled = enabled;

    const config = await SSOConfig.findOneAndUpdate(
      { organizationId: auth.organizationId },
      { $set: updateData },
      { upsert: true, new: true }
    );

    return successResponse(
      {
        protocol: config.protocol,
        provider: config.provider,
        enabled: config.enabled,
        enforceSSO: config.enforceSSO,
        allowedDomains: config.allowedDomains,
      },
      'SSO configuration updated'
    );
  } catch (err) {
    console.error('SSO config update error:', err);
    return Errors.internal('Failed to update SSO configuration');
  }
}
