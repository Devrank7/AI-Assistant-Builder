import { createStubPlugin } from '../_stub';
import manifest from './manifest.json';
import type { PluginManifest } from '../../core/types';

export const calendlyPlugin = createStubPlugin(manifest as unknown as PluginManifest);
