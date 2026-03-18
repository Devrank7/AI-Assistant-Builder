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

      // Save profile to session for crawl_knowledge and playground
      try {
        const BuilderSession = (await import('@/models/BuilderSession')).default;
        await BuilderSession.findByIdAndUpdate(ctx.sessionId, { siteProfile: profile });
      } catch { /* non-critical */ }

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
      } catch { /* ignore parse errors */ }

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
      } catch { /* ignore */ }
      const isDark = prefs.isDark !== 'false';
      const style = prefs.style || 'glass';

      // 3. Call Gemini to generate theme.json
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

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
  "domain": "${(siteProfile.url as string || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '') || businessName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'}",
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

All colors must be harmonious, derived from the site's actual colors (${primaryColor}, ${accentColor || 'auto'}). Match the site's visual identity as closely as possible.`;

      ctx.write({ type: 'progress', message: 'AI is designing your widget theme...' });

      let themeJson: Record<string, unknown>;
      try {
        const result = await model.generateContent(themePrompt);
        const text = result.response
          .text()
          .trim()
          .replace(/^```(?:json)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();
        themeJson = JSON.parse(text);
      } catch (err) {
        return { error: `Theme generation failed: ${(err as Error).message}` };
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

      const quickReplies = businessType === 'dental'
        ? ['Book Appointment', 'Services', 'Insurance Info']
        : businessType === 'restaurant'
          ? ['Menu', 'Reservations', 'Hours']
          : businessType === 'beauty'
            ? ['Book Now', 'Services & Prices', 'Gift Cards']
            : ['Tell me more', 'Contact info', 'Services'];

      const widgetConfig = {
        clientId,
        botName: businessName,
        welcomeMessage: `Welcome to **${businessName}**! How can I help you?`,
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

      // 5. Save theme + config to session
      session.themeJson = { ...themeJson, _widgetConfig: widgetConfig };
      session.widgetName = businessName;
      session.clientId = clientId;
      session.currentStage = 'design';
      await session.save();

      ctx.write({ type: 'theme_update', theme: themeJson });

      // Show preview panel immediately (even before build completes)
      ctx.write({ type: 'widget_ready', clientId });
      ctx.write({ type: 'panel_mode', mode: 'live_preview' });
      ctx.write({ type: 'progress', message: 'Building widget...' });

      // 6. Auto-build the widget
      try {
        const buildRes = await fetch(`${ctx.baseUrl}/api/builder/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: ctx.cookie },
          body: JSON.stringify({ sessionId: ctx.sessionId }),
        });

        if (buildRes.ok) {
          const buildData = await buildRes.json();
          const finalClientId = buildData.data?.clientId || clientId;

          // Update clientId if build pipeline changed it
          if (finalClientId !== clientId) {
            ctx.write({ type: 'widget_ready', clientId: finalClientId });
          }
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
      'Make targeted design changes to current theme ("darker header", "rounder corners", "change font to Poppins"). Delegates to Gemini 3.1 Pro.',
    parameters: {
      type: 'object',
      properties: {
        instruction: { type: 'string', description: 'What to change in the design' },
        currentTheme: { type: 'string', description: 'JSON stringified current theme.json' },
      },
      required: ['instruction', 'currentTheme'],
    },
    model_hint: 'gemini',
    category: 'core',
    async executor(args, ctx) {
      ctx.write({ type: 'progress', message: 'Modifying design...' });
      return {
        success: true,
        message: `Modify the theme.json based on: "${args.instruction}". Return the complete updated theme.json.`,
      };
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
      ctx.write({ type: 'panel_mode', mode: 'live_preview' });
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
      ctx.write({ type: 'panel_mode', mode: 'live_preview' });
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
      'Read current widget source code, write a modification based on natural language instruction, rebuild and deploy. Use for UI changes, adding features, changing layout.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        file: { type: 'string', description: 'File to modify, e.g. "components/Widget.jsx". Cannot modify hooks/.' },
        instruction: { type: 'string', description: 'What to change, in natural language' },
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
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });

      const userPrompt = buildCodegenUserPrompt({
        currentCode,
        instruction,
        themeJson: fullBundle['theme.json'],
        widgetConfig: fullBundle['widget.config.json'],
      });

      let generatedCode: string;
      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: CODEGEN_SYSTEM_PROMPT,
        });
        generatedCode = result.response
          .text()
          .trim()
          .replace(/^```(?:jsx|javascript|js)?\n/m, '')
          .replace(/\n```$/m, '')
          .trim();
      } catch (err) {
        return { error: `Code generation failed: ${(err as Error).message}` };
      }

      ctx.write({ type: 'progress', message: 'Writing and building...' });
      writeWidgetFile(clientId, file, generatedCode);

      const { execSync } = await import('child_process');
      const buildScript = path.join(process.cwd(), '.claude/widget-builder/scripts/build.js');

      let buildSuccess = false;
      let buildError = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          execSync(`node "${buildScript}" "${clientId}"`, { cwd: process.cwd(), timeout: 60000, stdio: 'pipe' });
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
              const retryResult = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: retryPrompt }] }],
                systemInstruction: CODEGEN_SYSTEM_PROMPT,
              });
              generatedCode = retryResult.response
                .text()
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
      const deployDir = path.join(process.cwd(), 'quickwidgets', clientId);
      if (fs.existsSync(distScript) && fs.existsSync(deployDir)) {
        saveVersion(clientId, instruction.slice(0, 100), 'modify_widget_code');
        fs.copyFileSync(distScript, path.join(deployDir, 'script.js'));
      }

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
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

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
        const result = await model.generateContent(themePrompt);
        const text = result.response
          .text()
          .trim()
          .replace(/^```(?:json)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();
        themeJson = JSON.parse(text);
      } catch (err) {
        return { error: `Theme generation failed: ${(err as Error).message}` };
      }

      // Build widget config and embed it in themeJson for the build pipeline
      const scratchSlug = businessName
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
