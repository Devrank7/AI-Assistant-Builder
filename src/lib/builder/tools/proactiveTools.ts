// src/lib/builder/tools/proactiveTools.ts
import type { ToolDefinition } from '../toolRegistry';
import type { Suggestion } from '../types';
import fs from 'fs';
import path from 'path';

export const proactiveTools: ToolDefinition[] = [
  {
    name: 'analyze_opportunities',
    description:
      'Deep-analyze the current site profile, widget config, and structure to find improvement areas. Returns current widget state + smart suggestions. Call after initial deployment.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
      },
      required: ['clientId'],
    },
    category: 'proactive',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      ctx.write({ type: 'progress', message: 'Deep-analyzing widget and site...' });

      const BuilderSession = (await import('@/models/BuilderSession')).default;
      const session = await BuilderSession.findById(ctx.sessionId);
      const siteProfile = session?.siteProfile as Record<string, unknown> | undefined;
      const knowledgeUploaded = session?.knowledgeUploaded;

      // Read current widget config and structure
      const clientDir = path.join(process.cwd(), '.claude/widget-builder/clients', clientId);
      let widgetConfig: Record<string, unknown> = {};
      let widgetStructure: Record<string, unknown> = {};
      try {
        const configPath = path.join(clientDir, 'widget.config.json');
        if (fs.existsSync(configPath)) {
          widgetConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
      } catch {
        /* ignore */
      }
      try {
        const structPath = path.join(clientDir, 'widget.structure.json');
        if (fs.existsSync(structPath)) {
          widgetStructure = JSON.parse(fs.readFileSync(structPath, 'utf-8'));
        }
      } catch {
        /* ignore */
      }

      // Extract what's already configured
      const currentState = {
        botName: widgetConfig.botName || 'unknown',
        welcomeMessage: widgetConfig.welcomeMessage || '',
        quickReplies: (widgetConfig.quickReplies as string[]) || [],
        features: widgetConfig.features || {},
        contacts: widgetConfig.contacts || {},
        enabledComponents: [] as string[],
        disabledComponents: [] as string[],
      };

      // Parse structure for enabled/disabled components
      const components = (widgetStructure.components as Array<Record<string, unknown>>) || [];
      for (const comp of components) {
        if (comp.enabled === false) {
          currentState.disabledComponents.push(comp.id as string);
        } else {
          currentState.enabledComponents.push(comp.id as string);
        }
      }

      // Analyze site profile for opportunities
      const opportunities: string[] = [];
      const pages = (siteProfile?.pages as Array<Record<string, unknown>>) || [];
      const features = (siteProfile?.detectedFeatures as string[]) || [];
      const contactInfo = (siteProfile?.contactInfo as Record<string, string>) || {};
      const businessType = (siteProfile?.businessType as string) || '';
      const url = (siteProfile?.url as string) || '';

      // Knowledge gaps
      if (!knowledgeUploaded) {
        opportunities.push(
          'CRITICAL_GAP: Knowledge base is empty — AI cannot answer specific questions about the business.'
        );
      }
      if (pages.length < 5 && pages.length > 0) {
        opportunities.push(
          `KNOWLEDGE: Only ${pages.length} pages crawled. Deeper crawl would improve AI answer quality.`
        );
      }
      if (pages.length >= 5) {
        const uncrawledPages = pages.filter((p) => !p.crawled);
        if (uncrawledPages.length > 2) {
          opportunities.push(`KNOWLEDGE: ${uncrawledPages.length} pages detected but not crawled yet.`);
        }
      }

      // Integration opportunities based on site content
      if (features.includes('booking_page') || features.includes('calendly') || features.includes('appointment')) {
        opportunities.push(
          'INTEGRATION: Booking/appointment page detected — connect Calendly or Google Calendar for in-chat booking.'
        );
      }
      if (features.includes('pricing_page') || features.includes('shop') || features.includes('ecommerce')) {
        opportunities.push(
          'INTEGRATION: Pricing/shop detected — connect Stripe for in-chat payments or product catalog.'
        );
      }
      if (features.includes('contact_form') || features.includes('lead_form')) {
        opportunities.push(
          'INTEGRATION: Contact form detected — connect CRM (HubSpot/Pipedrive) for automatic lead capture.'
        );
      }
      if (contactInfo.phone) {
        opportunities.push('FEATURE: Phone number found — add click-to-call contact bar to widget header.');
      }
      if (contactInfo.email) {
        opportunities.push('FEATURE: Email found — add email link to contact bar.');
      }

      // Business-type specific suggestions
      if (/game|gaming|gta|server/i.test(businessType) || /game|gaming|gta/i.test(url)) {
        opportunities.push(
          'FEATURE: Gaming site — add server status widget, online players count, or Discord integration.'
        );
        opportunities.push(
          'INTEGRATION: Gaming community — connect Discord or Telegram bot for cross-platform support.'
        );
      }
      if (/restaurant|cafe|food|menu/i.test(businessType)) {
        opportunities.push('INTEGRATION: Restaurant — add menu browsing, table reservation via Google Calendar.');
        opportunities.push('FEATURE: Add delivery tracking integration or UberEats/Glovo link.');
      }
      if (/clinic|doctor|medical|dental/i.test(businessType)) {
        opportunities.push('INTEGRATION: Medical — add appointment booking (Calendly), patient intake forms.');
        opportunities.push('FEATURE: Add insurance/services FAQ auto-generated from crawled pages.');
      }
      if (/beauty|salon|spa/i.test(businessType)) {
        opportunities.push('INTEGRATION: Salon — add online booking (Calendly/Cal.com) and service catalog.');
      }
      if (/shop|store|ecommerce|product/i.test(businessType)) {
        opportunities.push('INTEGRATION: E-commerce — add product search, order tracking, Stripe payments.');
      }
      if (/saas|software|tech|startup/i.test(businessType)) {
        opportunities.push(
          'INTEGRATION: SaaS — add Intercom-style lead qualification, demo booking, Stripe billing portal.'
        );
      }

      // Universal suggestions (always applicable)
      opportunities.push(
        'ENGAGEMENT: Add proactive greeting bubble — shows after 5s when widget is closed. Increases engagement 30%+.'
      );
      opportunities.push('CHANNEL: Connect Telegram bot — visitors can continue conversations in their messenger.');
      opportunities.push(
        'CHANNEL: Connect WhatsApp — popular for mobile users, keeps conversations alive after they leave the site.'
      );
      opportunities.push('ANALYTICS: Enable lead collection — capture visitor emails/phones before or during chat.');
      opportunities.push(
        'AI_ACTIONS: Enable autonomous AI actions — bot can book appointments, create CRM contacts, send notifications automatically during chat.'
      );
      opportunities.push(
        'MULTILINGUAL: Widget auto-detects language (en/uk/ru/ar). Ensure knowledge base covers all relevant languages.'
      );

      return {
        success: true,
        currentState,
        siteInfo: {
          url,
          businessType,
          pagesFound: pages.length,
          detectedFeatures: features,
          contactInfo,
        },
        opportunities,
        count: opportunities.length,
      };
    },
  },
  {
    name: 'suggest_improvements',
    description: 'Format improvement suggestions as interactive cards. Shows suggestions in the chat UI.',
    parameters: {
      type: 'object',
      properties: {
        suggestions: { type: 'string', description: 'JSON array of Suggestion objects' },
      },
      required: ['suggestions'],
    },
    category: 'proactive',
    async executor(args, ctx) {
      let suggestions: Suggestion[];
      try {
        suggestions = JSON.parse(args.suggestions as string);
      } catch {
        return { error: 'Invalid suggestions JSON' };
      }

      ctx.write({ type: 'suggestions', suggestions });
      ctx.write({ type: 'progress', message: 'Suggestions complete' });
      return { success: true, count: suggestions.length };
    },
  },
  {
    name: 'check_knowledge_gaps',
    description:
      'Compare crawled pages vs uploaded knowledge to find gaps. Identifies pages not yet in knowledge base.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
      },
      required: ['clientId'],
    },
    category: 'proactive',
    async executor(args, ctx) {
      const clientId = args.clientId as string;

      const res = await fetch(`${ctx.baseUrl}/api/knowledge?clientId=${clientId}`, {
        headers: { Cookie: ctx.cookie },
      });
      const data = await res.json();
      const uploadedCount = data.data?.length || 0;

      const BuilderSession = (await import('@/models/BuilderSession')).default;
      const session = await BuilderSession.findById(ctx.sessionId);
      const pages = ((session?.siteProfile as Record<string, unknown>)?.pages as Array<unknown>) || [];

      return {
        success: true,
        totalPages: pages.length,
        knowledgeChunks: uploadedCount,
        hasGaps: pages.length > 0 && uploadedCount < pages.length * 2,
      };
    },
  },
  {
    name: 'analyze_competitors',
    description: '[DEFERRED TO v2] Find competitor websites and compare their chat solutions. Not yet implemented.',
    parameters: {
      type: 'object',
      properties: {
        businessType: { type: 'string', description: 'Business type to search competitors for' },
      },
      required: ['businessType'],
    },
    category: 'proactive',
    async executor() {
      return {
        success: false,
        error: 'analyze_competitors is deferred to v2. It will be available in a future update.',
      };
    },
  },
];

  },
];
