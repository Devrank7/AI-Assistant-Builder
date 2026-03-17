import { createStubPlugin } from '../_stub';
import manifest from './manifest.json';
import type { PluginManifest } from '../../core/types';

export const salesforcePlugin = createStubPlugin(manifest as unknown as PluginManifest);
