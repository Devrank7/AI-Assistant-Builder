import { IntegrationPlugin, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

// Dynamic import for nodemailer to avoid issues in edge/browser environments
async function getNodemailer() {
  try {
    const nodemailer = await import('nodemailer');
    return nodemailer.default || nodemailer;
  } catch {
    return null;
  }
}

function parseSmtpConfig(credentials: Record<string, string>) {
  const host = credentials.host || 'smtp.gmail.com';
  const port = parseInt(credentials.port || '587', 10);
  const secure = port === 465;
  const user = credentials.user || credentials.from || credentials.email || '';
  const pass = credentials.apiKey;

  return { host, port, secure, user, pass };
}

export const emailSmtpPlugin: IntegrationPlugin = {
  manifest: manifest as unknown as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {},

  async testConnection(credentials): Promise<HealthResult> {
    try {
      const nodemailer = await getNodemailer();
      if (!nodemailer) {
        return {
          healthy: false,
          error: 'nodemailer not available',
          suggestion: 'Install nodemailer: npm install nodemailer',
        };
      }

      const config = parseSmtpConfig(credentials);
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        connectionTimeout: 10000,
      });

      await transporter.verify();
      return {
        healthy: true,
        details: { host: config.host, port: config.port, user: config.user },
      };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'SMTP connection failed',
        suggestion: 'Verify SMTP host, port, and credentials. For Gmail, use an App Password.',
      };
    }
  },

  async healthCheck(credentials) {
    return this.testConnection(credentials);
  },

  async execute(action, params, credentials): Promise<ExecutionResult> {
    try {
      switch (action) {
        case 'sendEmail': {
          const nodemailer = await getNodemailer();
          if (!nodemailer) {
            return { success: false, error: 'nodemailer not available' };
          }

          const config = parseSmtpConfig(credentials);
          const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
              user: config.user,
              pass: config.pass,
            },
          });

          const from = (params.from as string) || config.user;
          const to = params.to as string;
          const subject = params.subject as string;
          const body = params.body as string;

          if (!to || !subject) {
            return {
              success: false,
              error: 'Missing required fields: to, subject',
            };
          }

          // Determine if body is HTML
          const isHtml = body?.includes('<') && body?.includes('>');

          const info = await transporter.sendMail({
            from,
            to,
            subject,
            ...(isHtml ? { html: body } : { text: body }),
          });

          return {
            success: true,
            data: {
              messageId: info.messageId,
              accepted: info.accepted,
              rejected: info.rejected,
            },
          };
        }

        case 'verify': {
          const health = await this.testConnection(credentials);
          return {
            success: health.healthy,
            data: health.details,
            error: health.error,
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Execution failed',
        retryable: true,
      };
    }
  },

  describeCapabilities() {
    return 'Email SMTP: Send emails via SMTP (supports HTML and plain text), verify SMTP connection.';
  },
};
