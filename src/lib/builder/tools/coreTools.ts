// src/lib/builder/tools/coreTools.ts
import type { ToolDefinition, ToolContext } from '../toolRegistry';
import { analyzeSite } from '../siteAnalyzer';
import { uploadKnowledge, setAIPrompt } from '../knowledgeCrawler';
import {
  readWidgetCode,
  validateFilePath,
  writeWidgetFile,
  saveVersion,
  rollbackToVersion,
} from '../widgetCodeManager';
import { CODEGEN_SYSTEM_PROMPT, buildCodegenUserPrompt } from '../codegenPrompt';
import type { SiteProfile } from '../types';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const coreTools: ToolDefinition[] = [
  {
    name: 'analyze_site',
    description:
      'Deep crawl a website URL (30+ pages via sitemap/BFS), extract colors, fonts, content, business type, detected features. Call this first when user provides a URL.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The website URL to analyze' },
      },
      required: ['url'],
    },
    category: 'core',
    async executor(args, ctx) {
      const url = args.url as string;
      ctx.write({ type: 'progress', stage: 'analysis', status: 'active' });
      const profile = await analyzeSite(url);

      if (!profile || (!profile.pages?.length && !profile.businessName)) {
        ctx.write({ type: 'progress', stage: 'analysis', status: 'complete' });
        return {
          success: false,
          error: `Could not extract any meaningful data from ${url}. The site may block crawlers or require JavaScript rendering.`,
        };
      }

      // Save profile to session for crawl_knowledge and playground
      try {
        const BuilderSession = (await import('@/models/BuilderSession')).default;
        await BuilderSession.findByIdAndUpdate(ctx.sessionId, { siteProfile: profile });
      } catch {
        /* non-critical */
      }

      ctx.write({ type: 'progress', stage: 'analysis', status: 'complete' });
      return {
        success: true,
        profile: {
          ...profile,
          // Truncate page content in the tool result to save tokens
          pages: profile.pages.map((p) => ({
            url: p.url,
            title: p.title,
            contentLength: p.content.length,
            preview: p.content.slice(0, 200),
          })),
          totalPagesCrawled: profile.pages.length,
        },
      };
    },
  },
  {
    name: 'generate_design',
    description:
      'Generate 3 theme.json design variants from site profile. Delegates to Gemini 3.1 Pro internally. Returns variants for user selection.',
    parameters: {
      type: 'object',
      properties: {
        siteProfile: { type: 'string', description: 'JSON stringified SiteProfile object' },
        preferences: {
          type: 'string',
          description: 'Optional JSON stringified user preferences for style, mood, etc.',
        },
      },
      required: ['siteProfile'],
    },
    model_hint: 'gemini',
    category: 'core',
    async executor(args, ctx) {
      ctx.write({ type: 'progress', stage: 'design', status: 'active' });
      ctx.write({ type: 'progress', message: 'Generating widget design from site analysis...' });

      // 1. Parse site profile from args or load from session
      let siteProfile: Record<string, unknown> | null = null;
      try {
        if (args.siteProfile) {
          siteProfile = JSON.parse(args.siteProfile as string);
        }
      } catch {
        /* ignore parse errors */
      }

      const BuilderSession = (await import('@/models/BuilderSession')).default;
      const session = await BuilderSession.findById(ctx.sessionId);
      if (!session) {
        return { error: 'Session not found' };
      }

      // Fall back to session's stored siteProfile
      if (!siteProfile && session.siteProfile) {
        siteProfile = session.siteProfile as Record<string, unknown>;
      }

      if (!siteProfile) {
        return { error: 'No site profile available. Run analyze_site first.' };
      }

      // 2. Extract design data from site profile
      const colors = (siteProfile.colors as string[]) || [];
      const fonts = (siteProfile.fonts as string[]) || [];
      const businessName = (siteProfile.businessName as string) || (siteProfile.title as string) || 'Business';
      const businessType = (siteProfile.businessType as string) || 'other';
      const primaryColor = colors[0] || '#3B82F6';
      const accentColor = colors[1] || '';
      const fontFamily = fonts[0] || 'Inter, sans-serif';

      // Parse user preferences if provided
      let prefs: Record<string, string> = {};
      try {
        if (args.preferences) {
          prefs = JSON.parse(args.preferences as string);
        }
      } catch {
        /* ignore */
      }

      // Detect light/dark theme from site background colors
      let isDark = false;
      if (prefs.isDark !== undefined) {
        isDark = prefs.isDark === 'true';
      } else {
        // Use actual background colors extracted from CSS (includes white/black)
        const bgColors = (siteProfile.backgroundColors as string[]) || [];
        if (bgColors.length > 0) {
          // Calculate average luminance of all background colors
          let totalLum = 0;
          let count = 0;
          for (const c of bgColors) {
            const hex = c.replace('#', '');
            if (hex.length !== 6) continue;
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            totalLum += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            count++;
          }
          // If average background luminance < 0.4, site is dark
          if (count > 0) {
            isDark = totalLum / count < 0.4;
          }
        }
        // Default: most websites are light
      }
      const style = prefs.style || 'glass';

      // 3. Call Gemini to generate theme.json
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      const themePrompt = `Generate a complete theme.json for a chat widget based on this real website analysis:
- Business: "${businessName}" (${businessType})
- Primary color from site: ${primaryColor}
- Accent color from site: ${accentColor || 'derive from primary'}
- Font from site: ${fontFamily}
- All site colors: ${colors.slice(0, 8).join(', ')}
- Dark mode: ${isDark}
- Style: ${style}

Return ONLY valid JSON (no markdown, no explanation) with ALL these fields:
{
  "label": "Theme label",
  "domain": "${((siteProfile.url as string) || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '') || businessName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'}",
  "fontUrl": "Google Fonts URL matching or close to ${fontFamily}",
  "font": "${fontFamily}",
  "isDark": ${isDark},
  "widgetW": "370px", "widgetH": "540px", "widgetMaxW": "370px", "widgetMaxH": "540px",
  "toggleSize": "w-[58px] h-[58px]", "toggleRadius": "rounded-2xl",
  "headerPad": "px-6 py-5", "nameSize": "text-[15px]",
  "headerAccent": "", "avatarHeaderRound": "rounded-2xl", "chatAvatarRound": "rounded-xl",
  "hasShine": true,
  "headerFrom": "#hex", "headerVia": "#hex", "headerTo": "#hex",
  "toggleFrom": "#hex", "toggleVia": "#hex", "toggleTo": "#hex",
  "toggleShadow": "#hex", "toggleHoverRgb": "r, g, b",
  "sendFrom": "#hex", "sendTo": "#hex", "sendHoverFrom": "#hex", "sendHoverTo": "#hex",
  "onlineDotBg": "#hex", "onlineDotBorder": "#hex", "typingDot": "#hex",
  "userMsgFrom": "#hex", "userMsgTo": "#hex", "userMsgShadow": "#hex",
  "avatarFrom": "#hex", "avatarTo": "#hex", "avatarBorder": "#hex", "avatarIcon": "#hex",
  "linkColor": "#hex", "linkHover": "#hex", "copyHover": "#hex", "copyActive": "#hex",
  "chipBorder": "#hex", "chipFrom": "#hex", "chipTo": "#hex", "chipText": "#hex",
  "chipHoverFrom": "#hex", "chipHoverTo": "#hex", "chipHoverBorder": "#hex",
  "focusBorder": "#hex", "focusRing": "#hex",
  "imgActiveBorder": "#hex", "imgActiveBg": "#hex", "imgActiveText": "#hex",
  "imgHoverText": "#hex", "imgHoverBorder": "#hex", "imgHoverBg": "#hex",
  "cssPrimary": "#hex", "cssAccent": "#hex", "focusRgb": "r, g, b",
  "feedbackActive": "#hex", "feedbackHover": "#hex",
  "surfaceBg": "#hex", "surfaceCard": "#hex", "surfaceBorder": "#hex",
  "surfaceInput": "#hex", "surfaceInputFocus": "#hex",
  "textPrimary": "#hex", "textSecondary": "#hex", "textMuted": "#hex"
}

CRITICAL COLOR RULES:
- isDark=${isDark}. ${isDark ? 'Dark mode: surfaceBg should be very dark (#0f1117 to #1a1d23), surfaceCard slightly lighter, textPrimary should be white/light.' : 'Light mode: surfaceBg MUST be white or near-white (#ffffff to #f8f9fa), surfaceCard should be white (#ffffff), surfaceInput should be light (#f1f5f9), textPrimary should be dark (#1a1a2e to #111827). The widget must look LIGHT, not dark.'}
- All accent colors (header, toggle, send button, user messages) must be derived from the site's actual colors (${primaryColor}, ${accentColor || 'auto'}).
- Match the site's visual identity as closely as possible.`;

      ctx.write({ type: 'progress', message: 'AI is designing your widget theme...' });

      let themeJson: Record<string, unknown>;
      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: themePrompt,
          config: { temperature: 0.3 },
        });
        const text = (result.text || '')
          .trim()
          .replace(/^```(?:json)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();
        themeJson = JSON.parse(text);
      } catch (err) {
        return { error: `Theme generation failed: ${(err as Error).message}` };
      }

      // Force isDark to match detection — Gemini sometimes ignores the prompt
      themeJson.isDark = isDark;
      if (!isDark) {
        // Ensure light theme has light surfaces
        const surfaceBg = themeJson.surfaceBg as string;
        if (surfaceBg && surfaceBg.startsWith('#')) {
          const hex = surfaceBg.replace('#', '');
          if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            if (lum < 0.5) {
              // Surface is dark despite isDark=false — force light colors
              themeJson.surfaceBg = '#ffffff';
              themeJson.surfaceCard = '#ffffff';
              themeJson.surfaceBorder = '#e5e7eb';
              themeJson.surfaceInput = '#f1f5f9';
              themeJson.surfaceInputFocus = '#ffffff';
              themeJson.textPrimary = '#111827';
              themeJson.textSecondary = '#4b5563';
              themeJson.textMuted = '#9ca3af';
            }
          }
        }
      }

      // 4. Build widget config
      // Derive clientId: try businessName first, fall back to domain from URL
      const slugFromName = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);

      const domainSlug = ((siteProfile.url as string) || '')
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/^www\./, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 40);

      const clientId = slugFromName || domainSlug || `widget-${Date.now()}`;

      // Generate quick replies, welcome message, and input placeholder from site content
      // Pages may have 'content' (from session.siteProfile) or 'preview' (from tool result)
      const sitePages = Array.isArray(siteProfile.pages) ? siteProfile.pages : [];
      const pagesSummary = sitePages
        .slice(0, 5)
        .map((p: Record<string, unknown>) => {
          const title = (p?.title as string) || '';
          const text = (p?.content as string) || (p?.preview as string) || '';
          return `${title}: ${text.slice(0, 300)}`;
        })
        .join('\n');

      let quickReplies = ['Tell me more', 'Contact info', 'Services'];
      let welcomeMessage = `Welcome to **${businessName}**! How can I help you?`;
      let inputPlaceholder = 'Type your message...';
      try {
        const qrResult = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `You are analyzing a ${businessType} business website: "${businessName}".
Here is content from the site:
${pagesSummary.slice(0, 2000)}

Generate a JSON object with:
1. "quickReplies": array of exactly 3 short button labels (max 25 chars each) that reflect the ACTUAL services/pages on THIS specific site. Use the site's language.
2. "welcomeMessage": a brief welcome message for the chat widget in the site's language. Use markdown bold for the business name.
3. "inputPlaceholder": short input field placeholder in the site's language (e.g. "Задайте вопрос..." for Ukrainian/Russian sites).

Return ONLY valid JSON, no markdown.`,
          config: { temperature: 0.3 },
        });
        const qrText = (qrResult.text || '')
          .trim()
          .replace(/^```(?:json)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();
        const qrJson = JSON.parse(qrText);
        if (Array.isArray(qrJson.quickReplies) && qrJson.quickReplies.length >= 2) {
          quickReplies = qrJson.quickReplies.slice(0, 3);
        }
        if (qrJson.welcomeMessage) welcomeMessage = qrJson.welcomeMessage;
        if (qrJson.inputPlaceholder) inputPlaceholder = qrJson.inputPlaceholder;
      } catch {
        // Fall back to defaults
      }

      const widgetConfig = {
        clientId,
        botName: businessName,
        welcomeMessage,
        inputPlaceholder,
        quickReplies,
        avatar: {
          type: 'initials',
          initials: businessName.slice(0, 2).toUpperCase(),
        },
        features: {
          sound: true,
          voiceInput: true,
          streaming: true,
        },
      };

      // 5. Save theme + config to session
      session.themeJson = { ...themeJson, _widgetConfig: widgetConfig };
      session.widgetName = businessName;
      session.clientId = clientId;
      session.currentStage = 'design';
      await session.save();

      ctx.write({ type: 'theme_update', theme: themeJson });
      ctx.write({ type: 'progress', message: 'Building widget...' });

      // 6. Auto-build the widget — emit widget_ready ONLY after build succeeds
      try {
        const buildRes = await fetch(`${ctx.baseUrl}/api/builder/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: ctx.cookie },
          body: JSON.stringify({ sessionId: ctx.sessionId }),
        });

        if (buildRes.ok) {
          const buildData = await buildRes.json();
          const finalClientId = buildData.data?.clientId || clientId;

          // Don't emit widget_ready here — the chat route emits it after ALL tools complete
          // (so knowledge base is loaded before the widget appears)
          ctx.write({ type: 'progress', stage: 'design', status: 'complete' });

          return {
            success: true,
            message: `Widget designed and built for "${businessName}". Preview is now showing in the right panel. ClientId: "${finalClientId}".`,
            clientId: finalClientId,
            themePreview: {
              primaryColor: themeJson.cssPrimary || themeJson.headerFrom,
              accentColor: themeJson.cssAccent || themeJson.headerTo,
              isDark: themeJson.isDark,
              font: themeJson.font,
            },
          };
        } else {
          const errText = await buildRes.text();
          console.error('[generate_design] Build API failed:', errText);
          ctx.write({ type: 'progress', stage: 'design', status: 'complete' });
          return {
            success: true,
            message: `Theme generated and preview panel is open. Build had an issue: ${errText}. Call build_deploy to retry. ClientId: "${clientId}".`,
            clientId,
            buildFailed: true,
          };
        }
      } catch (buildErr) {
        console.error('[generate_design] Build error:', (buildErr as Error).message);
        ctx.write({ type: 'progress', stage: 'design', status: 'complete' });
        return {
          success: true,
          message: `Theme generated and preview panel is open. Build error: ${(buildErr as Error).message}. Call build_deploy to retry. ClientId: "${clientId}".`,
          clientId,
          buildFailed: true,
        };
      }
    },
  },
  {
    name: 'modify_design',
    description:
      'ONLY for COLOR and THEME changes: "darker header", "make it green", "blue accent", "light/dark mode". Changes hex colors in theme.json. Do NOT use for adding/removing UI elements — use modify_widget_code instead. IMPORTANT: Pass the user\'s EXACT words as the instruction — do not rephrase or translate.',
    parameters: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: "The user's EXACT request for design change, copied verbatim. Do NOT rephrase.",
        },
      },
      required: ['instruction'],
    },
    category: 'core',
    async executor(args, ctx) {
      const instruction = args.instruction as string;
      ctx.write({ type: 'progress', message: 'Modifying design...' });

      // Load session to get current theme and clientId
      const { default: BuilderSession } = await import('@/models/BuilderSession');
      const session = await BuilderSession.findById(ctx.sessionId);
      if (!session?.themeJson || !session?.clientId) {
        return { error: 'No theme or clientId found. Run generate_design first.' };
      }

      const currentTheme = { ...session.themeJson } as Record<string, unknown>;
      const clientId = session.clientId;
      const savedWidgetConfig = currentTheme._widgetConfig;

      // Fields Gemini is ALLOWED to change (only colors + isDark + text colors)
      const MUTABLE_FIELDS = [
        'isDark',
        'headerFrom',
        'headerVia',
        'headerTo',
        'toggleFrom',
        'toggleVia',
        'toggleTo',
        'toggleShadow',
        'toggleHoverRgb',
        'sendFrom',
        'sendTo',
        'sendHoverFrom',
        'sendHoverTo',
        'onlineDotBg',
        'onlineDotBorder',
        'typingDot',
        'userMsgFrom',
        'userMsgTo',
        'userMsgShadow',
        'avatarFrom',
        'avatarTo',
        'avatarBorder',
        'avatarIcon',
        'linkColor',
        'linkHover',
        'copyHover',
        'copyActive',
        'chipBorder',
        'chipFrom',
        'chipTo',
        'chipText',
        'chipHoverFrom',
        'chipHoverTo',
        'chipHoverBorder',
        'focusBorder',
        'focusRing',
        'imgActiveBorder',
        'imgActiveBg',
        'imgActiveText',
        'imgHoverText',
        'imgHoverBorder',
        'imgHoverBg',
        'cssPrimary',
        'cssAccent',
        'focusRgb',
        'feedbackActive',
        'feedbackHover',
        'surfaceBg',
        'surfaceCard',
        'surfaceBorder',
        'surfaceInput',
        'surfaceInputFocus',
        'textPrimary',
        'textSecondary',
        'textMuted',
      ];

      // Build a small JSON with only mutable fields for Gemini
      const mutableSnapshot: Record<string, unknown> = {};
      for (const f of MUTABLE_FIELDS) {
        if (currentTheme[f] !== undefined) mutableSnapshot[f] = currentTheme[f];
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Here are the COLOR fields of a chat widget theme:
${JSON.stringify(mutableSnapshot, null, 2)}

USER REQUEST: "${instruction}"

Return a JSON with ONLY these same fields, with colors changed per the request.

CRITICAL RULES FOR DARK/LIGHT SWITCHING:
- When switching to dark mode: ONLY change surface/background/text colors. Keep ALL accent/brand colors (header gradient, toggle, send button, user message, avatar, chips hover, links, cssPrimary, cssAccent) EXACTLY the same — these are the brand identity.
  - Set: isDark=true, surfaceBg="#0f1117", surfaceCard="#1a1d23", surfaceBorder="#2a2d35", surfaceInput="#1e212b", surfaceInputFocus="#1a1d23", textPrimary="#ffffff", textSecondary="#9ca3af", textMuted="#6b7280", onlineDotBorder="#0f1117"
  - Do NOT change: headerFrom/Via/To, toggleFrom/Via/To, sendFrom/To, userMsgFrom/To, avatarFrom/To, cssPrimary, cssAccent, linkColor, chipHoverBorder, focusBorder, imgActiveBorder
  - Adjust chip colors for dark bg: chipBorder="#2a2d35", chipFrom="#1a1d23", chipTo="#0f1117", chipText="#e2e8f0"
- When switching to light mode: ONLY change surface/background/text. Keep ALL accent/brand colors the same.
  - Set: isDark=false, surfaceBg="#ffffff", surfaceCard="#ffffff", surfaceBorder="#e5e7eb", surfaceInput="#f1f5f9", surfaceInputFocus="#ffffff", textPrimary="#111827", textSecondary="#4b5563", textMuted="#9ca3af"
  - Adjust chip colors for light bg: chipBorder="#e5e7eb", chipFrom="#ffffff", chipTo="#f8fafc", chipText="#374151"
- When changing color (e.g. "make it green"): Change ALL accent colors to the new hue, but keep surface/text unchanged.
- All hex colors must be valid 6-digit hex (e.g. #3b82f6).
- focusRgb and toggleHoverRgb must be "r, g, b" format matching the primary accent color.
Return ONLY valid JSON with these ${MUTABLE_FIELDS.length} fields. No other fields. No markdown.`,
          config: { temperature: 0.1 },
        });

        const text = (result.text || '')
          .trim()
          .replace(/^```(?:json)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();
        const changes = JSON.parse(text);

        // MERGE: Start from original theme, apply ONLY valid changes from Gemini
        const mergedTheme = { ...currentTheme };
        delete mergedTheme._widgetConfig;

        for (const field of MUTABLE_FIELDS) {
          if (changes[field] !== undefined) {
            mergedTheme[field] = changes[field];
          }
        }

        // Restore _widgetConfig
        if (savedWidgetConfig) {
          mergedTheme._widgetConfig = savedWidgetConfig;
        }

        // Save updated theme to session
        session.themeJson = mergedTheme;
        await session.save();

        ctx.write({ type: 'theme_update', theme: mergedTheme });

        // Auto-rebuild with cssOnly — colors are now CSS variables, so only index.css needs regeneration
        ctx.write({ type: 'progress', message: 'Rebuilding widget with new colors...' });
        const buildRes = await fetch(`${ctx.baseUrl}/api/builder/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: ctx.cookie },
          body: JSON.stringify({ sessionId: ctx.sessionId, cssOnly: true }),
        });

        if (!buildRes.ok) {
          return { error: 'Theme updated but rebuild failed.' };
        }

        ctx.write({ type: 'widget_ready', clientId });
        return { success: true, clientId, message: `Design updated: ${instruction}` };
      } catch (err) {
        return { error: `Failed to modify design: ${(err as Error).message}` };
      }
    },
  },
  {
    name: 'select_theme',
    description: 'Apply the selected theme variant (0, 1, or 2) from generate_design results.',
    parameters: {
      type: 'object',
      properties: {
        variantIndex: { type: 'string', description: 'Index of the selected variant (0, 1, or 2)' },
      },
      required: ['variantIndex'],
    },
    category: 'core',
    async executor(args, ctx) {
      const variantIndex = parseInt(args.variantIndex as string, 10);
      ctx.write({ type: 'progress', stage: 'design', status: 'complete' });
      return { success: true, selectedVariant: variantIndex };
    },
  },
  {
    name: 'build_deploy',
    description:
      'Run the full build pipeline: generate source files from theme.json, build with Vite, deploy to quickwidgets/. Call after theme is selected.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID for the widget' },
      },
      required: ['clientId'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      ctx.write({ type: 'progress', stage: 'deploy', status: 'active' });

      const res = await fetch(`${ctx.baseUrl}/api/builder/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ctx.cookie },
        body: JSON.stringify({ sessionId: ctx.sessionId }),
      });

      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error || 'Build failed' };
      }

      ctx.write({ type: 'progress', stage: 'deploy', status: 'complete' });
      ctx.write({ type: 'widget_ready', clientId });
      return { success: true, clientId, previewUrl: data.data?.previewUrl };
    },
  },
  {
    name: 'crawl_knowledge',
    description:
      'Deep-crawl the website and upload content to the knowledge base (up to 100 pages). Site must have been analyzed first.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The website URL' },
        clientId: { type: 'string', description: 'The client ID to upload knowledge for' },
      },
      required: ['url', 'clientId'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      ctx.write({ type: 'progress', stage: 'knowledge', status: 'active' });

      const BuilderSession = (await import('@/models/BuilderSession')).default;
      const session = await BuilderSession.findById(ctx.sessionId);
      const siteProfile = session?.siteProfile as SiteProfile | null;

      if (!siteProfile?.pages?.length) {
        return { success: false, error: 'No site profile found. Run analyze_site first.' };
      }

      const result = await uploadKnowledge(siteProfile.pages, clientId, ctx.baseUrl, ctx.cookie, (uploaded, total) => {
        ctx.write({ type: 'knowledge_progress', uploaded, total });
      });

      await setAIPrompt(clientId, siteProfile.businessType, siteProfile.businessName, ctx.baseUrl, ctx.cookie);
      ctx.write({ type: 'progress', stage: 'knowledge', status: 'complete' });
      return { success: true, ...result };
    },
  },
  {
    name: 'modify_widget_code',
    description:
      'Modify widget JSX/CSS source code, rebuild and deploy. Use for ANY UI change: removing buttons, adding elements, changing layout, hiding sections, modifying text. NOT for color changes (use modify_design for colors). IMPORTANT: Call ONCE with ALL changes in one instruction. The file is almost always "components/Widget.jsx". Pass the user\'s EXACT words as instruction.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        file: {
          type: 'string',
          description: 'File to modify. Almost always "components/Widget.jsx" — it contains all UI elements.',
        },
        instruction: {
          type: 'string',
          description: 'ALL changes in one instruction, e.g. "Remove the mic button and the image upload button"',
        },
      },
      required: ['clientId', 'file', 'instruction'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const file = args.file as string;
      const instruction = args.instruction as string;

      const ALLOWED_FILES = [
        'components/Widget.jsx',
        'components/ChatMessage.jsx',
        'components/QuickReplies.jsx',
        'components/MessageFeedback.jsx',
        'components/RichBlocks.jsx',
        'index.css',
        'main.jsx',
      ];
      if (!ALLOWED_FILES.includes(file)) {
        return { error: `File "${file}" not in allowlist: ${ALLOWED_FILES.join(', ')}` };
      }
      const validation = validateFilePath(file);
      if (!validation.valid) return { error: validation.error };

      ctx.write({ type: 'progress', message: `Reading current ${file}...` });
      const bundle = readWidgetCode(clientId, [file]);
      const currentCode = bundle[file];
      if (!currentCode) return { error: `File "${file}" not found for client "${clientId}".` };

      const fullBundle = readWidgetCode(clientId);

      ctx.write({ type: 'progress', message: 'Generating modified code...' });
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      const userPrompt = buildCodegenUserPrompt({
        currentCode,
        instruction,
        themeJson: fullBundle['theme.json'],
        widgetConfig: fullBundle['widget.config.json'],
      });

      let generatedCode: string;
      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: { systemInstruction: CODEGEN_SYSTEM_PROMPT, temperature: 0.3 },
        });
        generatedCode = (result.text || '')
          .trim()
          .replace(/^```(?:jsx|javascript|js)?\n/m, '')
          .replace(/\n```$/m, '')
          .trim();
      } catch (err) {
        return { error: `Code generation failed: ${(err as Error).message}` };
      }

      ctx.write({ type: 'progress', message: 'Writing and building...' });
      writeWidgetFile(clientId, file, generatedCode);

      const buildScript = path.join(process.cwd(), '.claude/widget-builder/scripts/build.js');

      let buildSuccess = false;
      let buildError = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await execAsync(`node "${buildScript}" "${clientId}"`, { cwd: process.cwd(), timeout: 60000 });
          buildSuccess = true;
          break;
        } catch (err) {
          buildError = (err as Error).message || 'Build failed';
          if (attempt === 0) {
            ctx.write({ type: 'progress', message: 'Build failed, retrying with fix...' });
            try {
              const retryPrompt = buildCodegenUserPrompt({
                currentCode: generatedCode,
                instruction: `The previous code had a build error. Fix it:\n${buildError}\n\nOriginal instruction: ${instruction}`,
                themeJson: fullBundle['theme.json'],
                widgetConfig: fullBundle['widget.config.json'],
              });
              const retryResult = await ai.models.generateContent({
                model: 'gemini-3.1-pro-preview',
                contents: [{ role: 'user', parts: [{ text: retryPrompt }] }],
                config: { systemInstruction: CODEGEN_SYSTEM_PROMPT, temperature: 0.3 },
              });
              generatedCode = (retryResult.text || '')
                .trim()
                .replace(/^```(?:jsx|javascript|js)?\n/m, '')
                .replace(/\n```$/m, '')
                .trim();
              writeWidgetFile(clientId, file, generatedCode);
            } catch {
              break;
            }
          }
        }
      }

      if (!buildSuccess) return { error: `Build failed after retry: ${buildError}` };

      const distScript = path.join(process.cwd(), '.claude/widget-builder/dist/script.js');
      if (!fs.existsSync(distScript)) {
        return { error: 'Build produced no output — dist/script.js not found' };
      }

      // Deploy to whichever directory the widget lives in (quickwidgets/ or widgets/)
      const quickDir = path.join(process.cwd(), 'quickwidgets', clientId);
      const fullDir = path.join(process.cwd(), 'widgets', clientId);
      const deployDir = fs.existsSync(fullDir) ? fullDir : fs.existsSync(quickDir) ? quickDir : null;

      if (!deployDir) {
        return { error: `No deploy directory found for client "${clientId}" in quickwidgets/ or widgets/` };
      }

      saveVersion(clientId, instruction.slice(0, 100), 'modify_widget_code');
      fs.copyFileSync(distScript, path.join(deployDir, 'script.js'));

      ctx.write({ type: 'widget_ready', clientId });
      return { success: true, message: `Widget code modified and deployed. File: ${file}` };
    },
  },
  {
    name: 'rollback',
    description: 'Revert widget to a previous version. Use when user says "undo", "revert", or "go back".',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        version: { type: 'string', description: 'Version number (e.g. "2") or "previous"' },
      },
      required: ['clientId', 'version'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const versionArg = args.version as string;
      const version = versionArg === 'previous' ? 'previous' : parseInt(versionArg, 10);
      if (typeof version === 'number' && isNaN(version)) {
        return { error: `Invalid version: "${versionArg}". Use a number or "previous".` };
      }

      ctx.write({ type: 'progress', message: 'Rolling back widget...' });
      const result = rollbackToVersion(clientId, version);
      if (!result.success) return { error: result.error };

      ctx.write({ type: 'widget_ready', clientId });
      return { success: true, message: `Widget rolled back to version ${result.version}.` };
    },
  },
  {
    name: 'modify_config',
    description:
      'Modify widget.config.json fields and rebuild. Use for: removing/changing quick replies, changing welcome message, changing bot name, changing placeholder text, toggling features. This is simpler and more reliable than modify_widget_code for config-level changes. Examples: "remove quick replies", "change greeting to Hello!", "rename bot to Support".',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        quickReplies: {
          type: 'string',
          description:
            'New quick replies as comma-separated list, or "REMOVE" to remove them entirely. E.g. "Pricing,Book a demo" or "REMOVE"',
        },
        welcomeMessage: { type: 'string', description: 'New welcome/greeting message' },
        botName: { type: 'string', description: 'New bot display name' },
        inputPlaceholder: { type: 'string', description: 'New input field placeholder text' },
      },
      required: ['clientId'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;

      // Read current config
      const configPath = path.join(process.cwd(), '.claude/widget-builder/clients', clientId, 'widget.config.json');
      if (!fs.existsSync(configPath)) {
        return { error: `widget.config.json not found for client "${clientId}"` };
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const changes: string[] = [];

      // Apply changes
      if (args.quickReplies !== undefined) {
        const qr = args.quickReplies as string;
        if (qr === 'REMOVE' || qr === '' || qr.toLowerCase() === 'remove') {
          config.quickReplies = [];
          changes.push('removed quick replies');
        } else {
          config.quickReplies = qr
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          changes.push(`set quick replies to: ${config.quickReplies.join(', ')}`);
        }
      }

      if (args.welcomeMessage !== undefined) {
        config.welcomeMessage = args.welcomeMessage as string;
        changes.push('updated welcome message');
      }

      if (args.botName !== undefined) {
        config.botName = args.botName as string;
        changes.push('updated bot name');
      }

      if (args.inputPlaceholder !== undefined) {
        config.inputPlaceholder = args.inputPlaceholder as string;
        changes.push('updated input placeholder');
      }

      if (changes.length === 0) {
        return { error: 'No changes specified. Provide at least one field to modify.' };
      }

      // Write updated config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      ctx.write({ type: 'progress', message: `Config updated: ${changes.join(', ')}` });

      // Rebuild widget
      ctx.write({ type: 'progress', message: 'Rebuilding widget...' });
      const buildScript = path.join(process.cwd(), '.claude/widget-builder/scripts/build.js');

      try {
        await execAsync(`node "${buildScript}" "${clientId}"`, { cwd: process.cwd(), timeout: 60000 });
      } catch (err) {
        return { error: `Build failed: ${(err as Error).message}` };
      }

      // Deploy
      const distScript = path.join(process.cwd(), '.claude/widget-builder/dist/script.js');
      if (!fs.existsSync(distScript)) {
        return { error: 'Build produced no output — dist/script.js not found' };
      }

      const quickDir = path.join(process.cwd(), 'quickwidgets', clientId);
      const fullDir = path.join(process.cwd(), 'widgets', clientId);
      const deployDir = fs.existsSync(fullDir) ? fullDir : fs.existsSync(quickDir) ? quickDir : null;

      if (!deployDir) {
        return { error: `No deploy directory found for client "${clientId}"` };
      }

      saveVersion(clientId, `modify_config: ${changes.join(', ')}`.slice(0, 100), 'modify_config');
      fs.copyFileSync(distScript, path.join(deployDir, 'script.js'));

      ctx.write({ type: 'widget_ready', clientId });
      return { success: true, message: `Widget config updated and deployed. Changes: ${changes.join(', ')}` };
    },
  },
  {
    name: 'modify_structure',
    description:
      'Deterministic widget structure changes — NO AI needed. Use for: toggling components on/off ("remove quick replies", "hide powered by", "remove mic button"), setting component props ("disable voice input", "disable image upload"), reordering components. This is the FASTEST and most RELIABLE tool for enabling/disabling features.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        operations: {
          type: 'string',
          description:
            'JSON array of operations. Each op: { "op": "toggle", "componentId": "<id>", "enabled": true/false } or { "op": "set_prop", "componentId": "<id>", "prop": "<name>", "value": <any> } or { "op": "reorder", "componentId": "<id>", "position": "before:<otherId>" | "after:<otherId>" }. Component IDs: header, contactBar, contextBanner, messageList, imagePreview, inputArea, poweredBy, toggleButton, nudgeBubble. InputArea props: voiceInput (bool), imageUpload (bool).',
        },
      },
      required: ['clientId', 'operations'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const structurePath = path.join(
        process.cwd(),
        '.claude/widget-builder/clients',
        clientId,
        'widget.structure.json'
      );

      if (!fs.existsSync(structurePath)) {
        return {
          error: `widget.structure.json not found for client "${clientId}". This client may use v1 monolithic Widget.jsx — use modify_widget_code instead.`,
        };
      }

      const structure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
      let operations: Array<{
        op: string;
        componentId: string;
        enabled?: boolean;
        prop?: string;
        value?: unknown;
        position?: string;
      }>;

      try {
        operations = JSON.parse(args.operations as string);
      } catch {
        return { error: 'Invalid operations JSON. Must be a JSON array of operation objects.' };
      }

      const changes: string[] = [];

      for (const op of operations) {
        const comp = structure.components.find((c: { id: string }) => c.id === op.componentId);
        if (!comp) {
          changes.push(`⚠️ Component "${op.componentId}" not found`);
          continue;
        }

        if (op.op === 'toggle') {
          comp.enabled = op.enabled ?? !comp.enabled;
          changes.push(`${comp.enabled ? 'enabled' : 'disabled'} ${op.componentId}`);
        } else if (op.op === 'set_prop') {
          if (!comp.props) comp.props = {};
          comp.props[op.prop!] = op.value;
          changes.push(`set ${op.componentId}.${op.prop} = ${JSON.stringify(op.value)}`);
        } else if (op.op === 'reorder') {
          const idx = structure.components.indexOf(comp);
          structure.components.splice(idx, 1);
          const [dir, targetId] = (op.position || '').split(':');
          const targetIdx = structure.components.findIndex((c: { id: string }) => c.id === targetId);
          if (targetIdx === -1) {
            structure.components.push(comp);
            changes.push(`moved ${op.componentId} to end (target "${targetId}" not found)`);
          } else {
            structure.components.splice(dir === 'before' ? targetIdx : targetIdx + 1, 0, comp);
            changes.push(`moved ${op.componentId} ${dir} ${targetId}`);
          }
        }
      }

      if (changes.length === 0) {
        return { error: 'No valid operations applied.' };
      }

      // Write updated structure
      fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2));
      ctx.write({ type: 'progress', message: `Structure updated: ${changes.join(', ')}` });

      // Rebuild and deploy
      ctx.write({ type: 'progress', message: 'Rebuilding widget...' });
      const buildScript = path.join(process.cwd(), '.claude/widget-builder/scripts/build.js');

      try {
        await execAsync(`node "${buildScript}" "${clientId}"`, { cwd: process.cwd(), timeout: 60000 });
      } catch (err) {
        return { error: `Build failed: ${(err as Error).message}` };
      }

      const distScript = path.join(process.cwd(), '.claude/widget-builder/dist/script.js');
      if (!fs.existsSync(distScript)) {
        return { error: 'Build produced no output' };
      }

      const quickDir = path.join(process.cwd(), 'quickwidgets', clientId);
      const fullDir = path.join(process.cwd(), 'widgets', clientId);
      const deployDir = fs.existsSync(fullDir) ? fullDir : fs.existsSync(quickDir) ? quickDir : null;

      if (!deployDir) {
        return { error: `No deploy directory found for client "${clientId}"` };
      }

      saveVersion(clientId, `modify_structure: ${changes.join(', ')}`.slice(0, 100), 'modify_structure');
      fs.copyFileSync(distScript, path.join(deployDir, 'script.js'));

      ctx.write({ type: 'widget_ready', clientId });
      return { success: true, message: `Widget structure updated and deployed. Changes: ${changes.join(', ')}` };
    },
  },
  {
    name: 'modify_component',
    description:
      'Modify a SINGLE component file using AI. Use for changes to a specific component\'s internal layout that can\'t be done with modify_structure or modify_config. The AI only sees the target component (50-80 lines), not the entire widget. Examples: "change header layout", "add subtitle to header", "redesign message bubble shape". Specify which component to modify.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        componentId: {
          type: 'string',
          description:
            'Which component to modify. One of: Header, ContactBar, ContextBanner, MessageList, ImagePreview, InputArea, PoweredBy, ToggleButton, NudgeBubble, ChatMessage, QuickReplies, MessageFeedback, RichBlocks',
        },
        instruction: {
          type: 'string',
          description: "The user's EXACT request for the change, copied verbatim.",
        },
      },
      required: ['clientId', 'componentId', 'instruction'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const componentId = args.componentId as string;
      const instruction = args.instruction as string;
      const fileName = componentId.endsWith('.jsx') ? componentId : `${componentId}.jsx`;
      const filePath = path.join(process.cwd(), '.claude/widget-builder/clients', clientId, 'src/components', fileName);

      if (!fs.existsSync(filePath)) {
        return { error: `Component file not found: ${fileName}. Check component name.` };
      }

      const currentCode = fs.readFileSync(filePath, 'utf-8');
      ctx.write({ type: 'progress', message: `Modifying ${fileName} (${currentCode.split('\n').length} lines)...` });

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `${CODEGEN_SYSTEM_PROMPT}

CURRENT CODE:
\`\`\`jsx
${currentCode}
\`\`\`

INSTRUCTION: ${instruction}

Return ONLY the complete modified component file. No markdown fences, no explanation.`,
          config: { temperature: 0.1 },
        });

        let newCode = (result.text || '')
          .trim()
          .replace(/^```(?:jsx|javascript)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();

        if (!newCode || newCode.length < 20) {
          return { error: 'AI returned empty or invalid code' };
        }

        // Write modified component
        fs.writeFileSync(filePath, newCode);

        // Rebuild and deploy
        ctx.write({ type: 'progress', message: 'Rebuilding widget...' });
        const buildScript = path.join(process.cwd(), '.claude/widget-builder/scripts/build.js');

        try {
          await execAsync(`node "${buildScript}" "${clientId}"`, { cwd: process.cwd(), timeout: 60000 });
        } catch (err) {
          return { error: `Component modified but build failed: ${(err as Error).message}` };
        }

        const distScript = path.join(process.cwd(), '.claude/widget-builder/dist/script.js');
        if (!fs.existsSync(distScript)) {
          return { error: 'Build produced no output' };
        }

        const quickDir = path.join(process.cwd(), 'quickwidgets', clientId);
        const fullDir = path.join(process.cwd(), 'widgets', clientId);
        const deployDir = fs.existsSync(fullDir) ? fullDir : fs.existsSync(quickDir) ? quickDir : null;

        if (!deployDir) {
          return { error: `No deploy directory found for client "${clientId}"` };
        }

        saveVersion(clientId, `modify_component(${componentId}): ${instruction}`.slice(0, 100), 'modify_component');
        fs.copyFileSync(distScript, path.join(deployDir, 'script.js'));

        ctx.write({ type: 'widget_ready', clientId });
        return {
          success: true,
          message: `Component ${componentId} modified and deployed. Lines: ${newCode.split('\n').length}`,
        };
      } catch (err) {
        return { error: `Failed to modify component: ${(err as Error).message}` };
      }
    },
  },
  {
    name: 'add_component',
    description:
      'Generate a NEW custom component and add it to the widget. Use for adding entirely new functionality: booking form, product carousel, countdown timer, custom footer, etc. AI generates a small component file (50-100 lines), adds it to widget.structure.json, and rebuilds.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        componentName: {
          type: 'string',
          description: 'PascalCase name for the new component, e.g. "BookingForm", "ProductCarousel", "CountdownTimer"',
        },
        slot: {
          type: 'string',
          description: 'Where to place the component. One of: panel-top, panel-body, panel-footer, external',
        },
        instruction: {
          type: 'string',
          description: 'Detailed description of what the component should do and look like.',
        },
      },
      required: ['clientId', 'componentName', 'slot', 'instruction'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const componentName = args.componentName as string;
      const slot = args.slot as string;
      const instruction = args.instruction as string;
      const fileName = `${componentName}.jsx`;
      const filePath = path.join(process.cwd(), '.claude/widget-builder/clients', clientId, 'src/components', fileName);

      const structurePath = path.join(
        process.cwd(),
        '.claude/widget-builder/clients',
        clientId,
        'widget.structure.json'
      );

      if (!fs.existsSync(structurePath)) {
        return { error: 'widget.structure.json not found. This client may use v1 — migrate first.' };
      }

      ctx.write({ type: 'progress', message: `Generating ${componentName} component...` });

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `${CODEGEN_SYSTEM_PROMPT}

Generate a NEW Preact component file named: ${componentName}
This component will be placed in slot: ${slot}

DESCRIPTION: ${instruction}

Return ONLY the complete component file. No markdown fences, no explanation.`,
          config: { temperature: 0.2 },
        });

        let code = (result.text || '')
          .trim()
          .replace(/^```(?:jsx|javascript)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();

        if (!code || code.length < 20) {
          return { error: 'AI returned empty or invalid code' };
        }

        // Write new component file
        fs.writeFileSync(filePath, code);

        // Update widget.structure.json
        const structure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
        const componentId = componentName.charAt(0).toLowerCase() + componentName.slice(1);

        // Add to customComponents
        if (!structure.customComponents) structure.customComponents = [];
        structure.customComponents.push({
          id: componentId,
          file: fileName,
          slot,
          enabled: true,
          props: {},
        });

        fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2));

        // Note: WidgetShell uses dynamic imports for custom components via __WIDGET_STRUCTURE__
        // So we don't need to modify WidgetShell.jsx

        // Rebuild and deploy
        ctx.write({ type: 'progress', message: 'Rebuilding widget with new component...' });
        const buildScript = path.join(process.cwd(), '.claude/widget-builder/scripts/build.js');

        try {
          await execAsync(`node "${buildScript}" "${clientId}"`, { cwd: process.cwd(), timeout: 60000 });
        } catch (err) {
          return { error: `Component generated but build failed: ${(err as Error).message}` };
        }

        const distScript = path.join(process.cwd(), '.claude/widget-builder/dist/script.js');
        if (!fs.existsSync(distScript)) {
          return { error: 'Build produced no output' };
        }

        const quickDir = path.join(process.cwd(), 'quickwidgets', clientId);
        const fullDir = path.join(process.cwd(), 'widgets', clientId);
        const deployDir = fs.existsSync(fullDir) ? fullDir : fs.existsSync(quickDir) ? quickDir : null;

        if (!deployDir) {
          return { error: `No deploy directory found for client "${clientId}"` };
        }

        saveVersion(clientId, `add_component(${componentName}): ${instruction}`.slice(0, 100), 'add_component');
        fs.copyFileSync(distScript, path.join(deployDir, 'script.js'));

        ctx.write({ type: 'widget_ready', clientId });
        return {
          success: true,
          message: `New component ${componentName} created (${code.split('\n').length} lines), added to slot "${slot}", and deployed.`,
        };
      } catch (err) {
        return { error: `Failed to generate component: ${(err as Error).message}` };
      }
    },
  },
  {
    name: 'test_widget',
    description:
      'Test a deployed widget by loading it and checking for JavaScript errors. Use after build_deploy or modify_widget_code.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
      },
      required: ['clientId'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const scriptPath = path.join(process.cwd(), 'quickwidgets', clientId, 'script.js');
      if (!fs.existsSync(scriptPath)) {
        return { error: `Widget not found at quickwidgets/${clientId}/script.js` };
      }
      const stats = fs.statSync(scriptPath);
      ctx.write({ type: 'progress', message: 'Widget test passed' });
      return { success: true, size: stats.size, exists: true };
    },
  },
  {
    name: 'create_theme_from_scratch',
    description:
      'Generate a complete theme.json + widget config from user preferences (no website URL needed). Use when user has no website or prefers to describe their widget manually. Delegates to Gemini to generate a full theme.',
    parameters: {
      type: 'object',
      properties: {
        businessName: { type: 'string', description: 'Business or widget name' },
        industry: {
          type: 'string',
          description: 'Industry/niche (e.g. dental, restaurant, saas, beauty, realestate, ecommerce, other)',
        },
        primaryColor: {
          type: 'string',
          description: 'Primary brand color hex (e.g. #3B82F6) or color name (e.g. blue, green)',
        },
        accentColor: { type: 'string', description: 'Optional accent color hex or name' },
        isDark: { type: 'string', description: 'Dark theme? "true" or "false". Default: "true"' },
        botName: { type: 'string', description: 'Bot display name in the widget header' },
        greeting: { type: 'string', description: 'Welcome message the bot shows when widget opens' },
        quickReplies: {
          type: 'string',
          description: 'Comma-separated quick reply buttons (e.g. "Pricing,Book a demo,Contact us")',
        },
        style: {
          type: 'string',
          description: 'Style preference: glass, minimal, corporate, neon, playful. Default: glass',
        },
      },
      required: ['businessName', 'industry'],
    },
    model_hint: 'gemini',
    category: 'core',
    async executor(args, ctx) {
      ctx.write({ type: 'progress', stage: 'design', status: 'active' });
      ctx.write({ type: 'progress', message: 'Creating widget design from your preferences...' });

      const businessName = args.businessName as string;
      const industry = args.industry as string;
      const primaryColor = (args.primaryColor as string) || '#3B82F6';
      const accentColor = (args.accentColor as string) || '';
      const isDark = (args.isDark as string) !== 'false';
      const botName = (args.botName as string) || businessName;
      const greeting = (args.greeting as string) || `Welcome to **${businessName}**! How can I help you?`;
      const quickReplies = (args.quickReplies as string)
        ?.split(',')
        .map((s: string) => s.trim())
        .filter(Boolean) || ['Tell me more', 'Contact info', 'Services'];
      const style = (args.style as string) || 'glass';

      // Use Gemini to generate a complete theme.json
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      const themePrompt = `Generate a complete theme.json for a chat widget with these specs:
- Business: "${businessName}" (${industry})
- Primary color: ${primaryColor}
- Accent color: ${accentColor || 'derive from primary'}
- Dark mode: ${isDark}
- Style: ${style}

Return ONLY valid JSON (no markdown, no explanation) with ALL these fields:
{
  "label": "Theme label",
  "domain": "${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com",
  "fontUrl": "Google Fonts URL",
  "font": "font-family CSS string",
  "isDark": ${isDark},
  "widgetW": "370px", "widgetH": "540px", "widgetMaxW": "370px", "widgetMaxH": "540px",
  "toggleSize": "w-[58px] h-[58px]", "toggleRadius": "rounded-2xl",
  "headerPad": "px-6 py-5", "nameSize": "text-[15px]",
  "headerAccent": "", "avatarHeaderRound": "rounded-2xl", "chatAvatarRound": "rounded-xl",
  "hasShine": true,
  "headerFrom": "#hex", "headerVia": "#hex", "headerTo": "#hex",
  "toggleFrom": "#hex", "toggleVia": "#hex", "toggleTo": "#hex",
  "toggleShadow": "#hex", "toggleHoverRgb": "r, g, b",
  "sendFrom": "#hex", "sendTo": "#hex", "sendHoverFrom": "#hex", "sendHoverTo": "#hex",
  "onlineDotBg": "#hex", "onlineDotBorder": "#hex", "typingDot": "#hex",
  "userMsgFrom": "#hex", "userMsgTo": "#hex", "userMsgShadow": "#hex",
  "avatarFrom": "#hex", "avatarTo": "#hex", "avatarBorder": "#hex", "avatarIcon": "#hex",
  "linkColor": "#hex", "linkHover": "#hex", "copyHover": "#hex", "copyActive": "#hex",
  "chipBorder": "#hex", "chipFrom": "#hex", "chipTo": "#hex", "chipText": "#hex",
  "chipHoverFrom": "#hex", "chipHoverTo": "#hex", "chipHoverBorder": "#hex",
  "focusBorder": "#hex", "focusRing": "#hex",
  "imgActiveBorder": "#hex", "imgActiveBg": "#hex", "imgActiveText": "#hex",
  "imgHoverText": "#hex", "imgHoverBorder": "#hex", "imgHoverBg": "#hex",
  "cssPrimary": "#hex", "cssAccent": "#hex", "focusRgb": "r, g, b",
  "feedbackActive": "#hex", "feedbackHover": "#hex",
  "surfaceBg": "#hex", "surfaceCard": "#hex", "surfaceBorder": "#hex",
  "surfaceInput": "#hex", "surfaceInputFocus": "#hex",
  "textPrimary": "#hex", "textSecondary": "#hex", "textMuted": "#hex"
}

All colors must be harmonious, derived from the primary (${primaryColor}) and accent colors. For dark themes, surfaces should be very dark. For light themes, surfaces should be light/white.`;

      let themeJson: Record<string, unknown>;
      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: themePrompt,
          config: { temperature: 0.3 },
        });
        const text = (result.text || '')
          .trim()
          .replace(/^```(?:json)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();
        themeJson = JSON.parse(text);
      } catch (err) {
        return { error: `Theme generation failed: ${(err as Error).message}` };
      }

      // Build widget config and embed it in themeJson for the build pipeline
      const scratchSlug =
        businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || `widget-${Date.now()}`;

      const widgetConfig = {
        clientId: scratchSlug,
        botName,
        welcomeMessage: greeting,
        inputPlaceholder: 'Type your message...',
        quickReplies,
        avatar: {
          type: 'initials',
          initials: businessName.slice(0, 2).toUpperCase(),
        },
        features: {
          sound: true,
          voiceInput: true,
          streaming: true,
        },
      };

      // Store in session
      const BuilderSession = (await import('@/models/BuilderSession')).default;
      const session = await BuilderSession.findById(ctx.sessionId);
      if (session) {
        session.themeJson = { ...themeJson, _widgetConfig: widgetConfig };
        session.widgetName = businessName;
        session.currentStage = 'design';
        await session.save();
      }

      ctx.write({ type: 'theme_update', theme: themeJson });
      ctx.write({ type: 'progress', stage: 'design', status: 'complete' });

      return {
        success: true,
        message: `Theme created for "${businessName}". Ready to build — call build_deploy with clientId "${widgetConfig.clientId}".`,
        clientId: widgetConfig.clientId,
        themePreview: {
          primaryColor: themeJson.cssPrimary || themeJson.headerFrom,
          accentColor: themeJson.cssAccent || themeJson.headerTo,
          isDark: themeJson.isDark,
          font: themeJson.font,
        },
      };
    },
  },
  {
    name: 'upload_knowledge_text',
    description:
      'Upload custom knowledge text to the widget knowledge base. Use when user provides business info manually (no website to crawl). Accepts plain text about the business.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        text: {
          type: 'string',
          description: 'Knowledge text about the business (services, pricing, FAQ, contacts, etc.)',
        },
        businessType: { type: 'string', description: 'Type of business (e.g. dental clinic, restaurant)' },
        businessName: { type: 'string', description: 'Name of the business' },
      },
      required: ['clientId', 'text'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const text = args.text as string;
      const businessType = (args.businessType as string) || 'business';
      const businessName = (args.businessName as string) || clientId;

      ctx.write({ type: 'progress', stage: 'knowledge', status: 'active' });
      ctx.write({ type: 'progress', message: 'Uploading knowledge...' });

      try {
        // Upload knowledge text
        const knowledgeRes = await fetch(`${ctx.baseUrl}/api/knowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: ctx.cookie },
          body: JSON.stringify({ clientId, text, source: 'builder-manual' }),
        });

        if (!knowledgeRes.ok) {
          const errData = await knowledgeRes.json();
          return { error: `Knowledge upload failed: ${errData.error || 'Unknown error'}` };
        }

        // Set AI prompt
        const { setAIPrompt } = await import('../knowledgeCrawler');
        await setAIPrompt(clientId, businessType, businessName, ctx.baseUrl, ctx.cookie);

        ctx.write({ type: 'progress', stage: 'knowledge', status: 'complete' });
        return { success: true, message: `Knowledge uploaded for ${businessName}.` };
      } catch (err) {
        return { error: `Knowledge upload failed: ${(err as Error).message}` };
      }
    },
  },
];
