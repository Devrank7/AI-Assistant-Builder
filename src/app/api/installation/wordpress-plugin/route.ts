import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import { deflateRawSync } from 'zlib';

const PRODUCTION_URL = 'https://winbixai.com';

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(filename: string, content: string): Buffer {
  const data = Buffer.from(content, 'utf-8');
  const compressed = deflateRawSync(data);
  const filenameBytes = Buffer.from(filename, 'utf-8');
  const crc = crc32(data);

  // Local file header
  const localHeader = Buffer.alloc(30 + filenameBytes.length);
  localHeader.writeUInt32LE(0x04034b50, 0); // signature
  localHeader.writeUInt16LE(20, 4); // version needed
  localHeader.writeUInt16LE(0, 6); // flags
  localHeader.writeUInt16LE(8, 8); // compression method (deflate)
  localHeader.writeUInt16LE(0, 10); // mod time
  localHeader.writeUInt16LE(0, 12); // mod date
  localHeader.writeUInt32LE(crc, 14); // CRC32
  localHeader.writeUInt32LE(compressed.length, 18); // compressed size
  localHeader.writeUInt32LE(data.length, 22); // uncompressed size
  localHeader.writeUInt16LE(filenameBytes.length, 26); // filename length
  localHeader.writeUInt16LE(0, 28); // extra field length
  filenameBytes.copy(localHeader, 30);

  // Central directory entry
  const centralDir = Buffer.alloc(46 + filenameBytes.length);
  centralDir.writeUInt32LE(0x02014b50, 0); // signature
  centralDir.writeUInt16LE(20, 4); // version made by
  centralDir.writeUInt16LE(20, 6); // version needed
  centralDir.writeUInt16LE(0, 8); // flags
  centralDir.writeUInt16LE(8, 10); // compression method
  centralDir.writeUInt16LE(0, 12); // mod time
  centralDir.writeUInt16LE(0, 14); // mod date
  centralDir.writeUInt32LE(crc, 16); // CRC32
  centralDir.writeUInt32LE(compressed.length, 20); // compressed size
  centralDir.writeUInt32LE(data.length, 24); // uncompressed size
  centralDir.writeUInt16LE(filenameBytes.length, 28); // filename length
  centralDir.writeUInt16LE(0, 30); // extra field length
  centralDir.writeUInt16LE(0, 32); // comment length
  centralDir.writeUInt16LE(0, 34); // disk number start
  centralDir.writeUInt16LE(0, 36); // internal file attributes
  centralDir.writeUInt32LE(0, 38); // external file attributes
  centralDir.writeUInt32LE(0, 42); // relative offset of local header
  filenameBytes.copy(centralDir, 46);

  const localSize = localHeader.length + compressed.length;

  // End of central directory record
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // signature
  endRecord.writeUInt16LE(0, 4); // disk number
  endRecord.writeUInt16LE(0, 6); // disk with central directory
  endRecord.writeUInt16LE(1, 8); // entries on this disk
  endRecord.writeUInt16LE(1, 10); // total entries
  endRecord.writeUInt32LE(centralDir.length, 12); // central directory size
  endRecord.writeUInt32LE(localSize, 16); // central directory offset
  endRecord.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localHeader, compressed, centralDir, endRecord]);
}

function generatePluginPhp(clientId: string, clientType: string): string {
  const folder = clientType === 'full' ? 'widgets' : 'quickwidgets';

  return `<?php
/**
 * Plugin Name: WinBix AI Chat Widget
 * Plugin URI: https://winbixai.com
 * Description: Adds the WinBix AI chat widget to your WordPress site. No configuration needed — just activate!
 * Version: 1.0.0
 * Author: WinBix AI
 * Author URI: https://winbixai.com
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) exit;

function winbix_ai_enqueue_widget() {
    wp_enqueue_script(
        'winbix-ai-widget',
        '${PRODUCTION_URL}/${folder}/${clientId}/script.js',
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'winbix_ai_enqueue_widget');

// Add settings link on plugins page
function winbix_ai_plugin_links($links) {
    $settings_link = '<a href="https://winbixai.com/dashboard" target="_blank">Dashboard</a>';
    array_unshift($links, $settings_link);
    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'winbix_ai_plugin_links');
`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return Errors.badRequest('clientId query parameter is required');
    }

    await connectDB();

    const Client = (await import('@/models/Client')).default;

    // Build ownership query based on auth context
    const query: Record<string, unknown> = { clientId };
    if (auth.organizationId) {
      query.organizationId = auth.organizationId;
    } else {
      query.userId = auth.userId;
    }

    const client = await Client.findOne(query).select('clientId clientType username');

    if (!client) {
      return Errors.notFound('Widget not found or access denied');
    }

    const clientType = client.clientType || 'quick';
    const phpContent = generatePluginPhp(clientId, clientType);
    const zipBuffer = createZip('winbix-ai-widget/winbix-ai-widget.php', phpContent);

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="winbix-ai-widget.zip"',
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('WordPress plugin generation error:', error);
    return Errors.internal('Failed to generate WordPress plugin');
  }
}
