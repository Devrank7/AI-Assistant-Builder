import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import BuilderSession from '@/models/BuilderSession';
import Client from '@/models/Client';
import { saveVersion } from '@/lib/builder/widgetCodeManager';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { sessionId, forceRegen } = body;

    if (!sessionId) {
      return Errors.badRequest('sessionId is required');
    }

    await connectDB();

    const session = await BuilderSession.findOne({ _id: sessionId, userId: auth.userId });
    if (!session) {
      return Errors.notFound('Session not found');
    }

    const themeData = session.themeJson as Record<string, unknown> | null;
    if (!themeData) {
      return Errors.badRequest('No theme configuration found. Continue chatting to generate one.');
    }

    // Extract widgetConfig if stored alongside themeJson
    const widgetConfig = (themeData._widgetConfig as Record<string, unknown>) || null;
    // Remove _widgetConfig from themeJson before writing
    const cleanThemeJson = { ...themeData };
    delete cleanThemeJson._widgetConfig;

    // Generate clientId from widget name or session id
    const baseName = session.widgetName || `widget-${session._id}`;
    const clientId = (widgetConfig?.clientId as string) || slugify(baseName);

    // Update session status
    session.status = 'building';
    session.clientId = clientId;
    await session.save();

    const projectRoot = process.cwd();
    const builderRoot = path.join(projectRoot, '.claude', 'widget-builder');
    const clientDir = path.join(builderRoot, 'clients', clientId);
    const quickwidgetsDir = path.join(projectRoot, 'quickwidgets', clientId);

    try {
      // 1. Create client directory
      fs.mkdirSync(clientDir, { recursive: true });

      // 2. Write theme.json
      fs.writeFileSync(
        path.join(clientDir, 'theme.json'),
        JSON.stringify(cleanThemeJson, null, 2)
      );

      // 3. Write widget.config.json
      const finalWidgetConfig = widgetConfig || {
        clientId,
        botName: session.widgetName || 'AI Assistant',
        welcomeMessage: 'Hello! How can I help you today?',
        inputPlaceholder: 'Type your message...',
        quickReplies: ['Tell me more', 'Contact info', 'Services'],
        avatar: {
          type: 'initials',
          initials: clientId.slice(0, 2).toUpperCase(),
        },
        features: {
          sound: true,
          voiceInput: true,
        },
      };

      fs.writeFileSync(
        path.join(clientDir, 'widget.config.json'),
        JSON.stringify(finalWidgetConfig, null, 2)
      );

      // 4. Run generate-single-theme.js
      const generateScript = path.join(builderRoot, 'scripts', 'generate-single-theme.js');
      const regenFlag = forceRegen ? ' --force-regen' : '';
      await execAsync(`node "${generateScript}" "${clientId}"${regenFlag}`, {
        cwd: builderRoot,
        timeout: 30000,
      });

      // 5. Run build.js
      const buildScript = path.join(builderRoot, 'scripts', 'build.js');
      await execAsync(`node "${buildScript}" "${clientId}"`, {
        cwd: builderRoot,
        timeout: 60000,
      });

      // 6. Copy built script.js to quickwidgets
      fs.mkdirSync(quickwidgetsDir, { recursive: true });

      const distScript = path.join(builderRoot, 'dist', 'script.js');
      if (fs.existsSync(distScript)) {
        // Save version before overwriting deployed script (so rollback has the previous state)
        saveVersion(clientId, 'Initial build', 'build_widget');
        fs.copyFileSync(distScript, path.join(quickwidgetsDir, 'script.js'));
      } else {
        throw new Error('Build completed but script.js not found in dist/');
      }

      // 7. Write info.json
      fs.writeFileSync(
        path.join(quickwidgetsDir, 'info.json'),
        JSON.stringify(
          {
            clientType: 'quick',
            widgetName: session.widgetName || clientId,
            website: (cleanThemeJson.domain as string) || '',
            userId: auth.userId,
            builtAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      // 7b. Generate preview.html for LivePreview iframe
      const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Widget Preview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #111318; overflow: hidden; }
</style>
</head>
<body>
<script src="/quickwidgets/${clientId}/script.js"><\/script>
</body>
</html>`;
      fs.writeFileSync(path.join(quickwidgetsDir, 'preview.html'), previewHtml);

      // 8. Create or update Client record in DB
      const existingClient = await Client.findOne({ clientId });
      if (!existingClient) {
        await Client.create({
          clientId,
          clientToken: '',
          clientType: 'quick',
          userId: auth.userId,
          username: session.widgetName || clientId,
          email: auth.user?.email || '',
          website: (cleanThemeJson.domain as string) || '',
          folderPath: `quickwidgets/${clientId}`,
          isActive: true,
          subscriptionStatus: 'active',
        });
      }

      // 9. Update session
      session.status = 'deployed';
      await session.save();

      return successResponse({
        clientId,
        previewUrl: `/quickwidgets/${clientId}/script.js`,
        widgetName: session.widgetName || clientId,
      });
    } catch (buildError) {
      // Reset session status on failure
      session.status = 'chatting';
      await session.save();

      console.error('Widget build error:', buildError);
      const errorMessage = buildError instanceof Error ? buildError.message : 'Unknown build error';
      return Errors.internal(`Widget build failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Builder build error:', error);
    return Errors.internal('Failed to build widget');
  }
}
