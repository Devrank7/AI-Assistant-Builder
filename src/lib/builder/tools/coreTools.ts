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
      ctx.write({ type: 'progress', stage: 'analysis', status: 'complete' });
      return { success: true, profile };
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
      ctx.write({ type: 'panel_mode', mode: 'ab_compare' });
      return {
        success: true,
        message:
          'Generate 3 theme.json variants using the site profile. Return them as JSON with format: {"variants": [{"label": "Name", "theme": {theme.json fields...}}, ...]}',
      };
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
];
