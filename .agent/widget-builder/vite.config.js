import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import fs from 'fs';
import path from 'path';

// Try to load the specific config for this build
let widgetConfig = {};
try {
    const configPath = path.resolve(__dirname, 'widget.config.json');
    if (fs.existsSync(configPath)) {
        widgetConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
} catch (e) {
    console.warn("No widget.config.json found, using defaults");
}

export default defineConfig({
    plugins: [
        preact(),
        cssInjectedByJsPlugin({
            injectCodeFunction: function(cssCode) {
                try {
                    window.__WIDGET_CSS__ = (window.__WIDGET_CSS__ || '') + cssCode;
                } catch (e) {
                    console.error('AIWidget: CSS injection error', e);
                }
            },
        }),
    ],
    resolve: {
        alias: {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
            'react/jsx-runtime': 'preact/compat/jsx-runtime',
        },
    },
    build: {
        lib: {
            entry: 'src/main.jsx',
            name: 'AIWidget',
            fileName: (format) => `script.js`,
            formats: ['iife'],
        },
        rollupOptions: {
            external: (id) => false,
            output: {
                extend: true,
            },
        },
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: false,
    },
    define: {
        'process.env': {},
        '__WIDGET_CONFIG__': JSON.stringify(widgetConfig),
    },
});
