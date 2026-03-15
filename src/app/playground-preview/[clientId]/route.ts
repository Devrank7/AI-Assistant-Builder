// src/app/playground-preview/[clientId]/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { searchParams } = request.nextUrl;
  const website = searchParams.get('website') || '';
  const dir = searchParams.get('dir') || 'quickwidgets';
  const frameable = searchParams.get('frameable') === 'true';
  const scriptUrl = `/${dir}/${clientId}/script.js`;
  const screenshotUrl = website ? `https://image.thum.io/get/width/1200/${website}` : '';

  let bgHtml: string;
  if (frameable && website) {
    bgHtml = `<iframe class="bg-frame" src="${website}" title="Website background"></iframe>`;
  } else if (screenshotUrl) {
    bgHtml = `<div class="bg-screenshot" style="background-image:url(${screenshotUrl})"></div>`;
  } else {
    bgHtml = `<div class="bg-gradient"></div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Widget Preview</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:100vw;height:100vh;overflow:hidden;position:relative}
    .bg-frame{position:absolute;inset:0;width:100%;height:100%;border:none;z-index:0}
    .bg-screenshot{position:absolute;inset:0;width:100%;height:100%;background-size:cover;background-position:top center;z-index:0}
    .bg-gradient{position:absolute;inset:0;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e 0%,#0a0a0f 100%);z-index:0}
  </style>
</head>
<body>
  ${bgHtml}
  <script src="${scriptUrl}" defer><\/script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
}
