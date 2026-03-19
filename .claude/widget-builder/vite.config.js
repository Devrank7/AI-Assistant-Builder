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

// Try to load widget structure (v2 component layout)
let widgetStructure = null;
try {
    const structurePath = path.resolve(__dirname, 'widget.structure.json');
    if (fs.existsSync(structurePath)) {
        widgetStructure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
    }
} catch (e) {
    // No structure file — v1 monolithic mode
}

export default defineConfig({
    plugins: [
        preact(),
        cssInjectedByJsPlugin({
            injectCodeFunction: function(cssCode) {
                try {
                    window.__WIDGET_CSS__ = cssCode;
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
                banner: `
/* API base URL auto-detect */
(function(){try{var s=document.querySelectorAll("script[src]");for(var i=0;i<s.length;i++){var u=s[i].src;if(u&&(u.indexOf("/quickwidgets/")!==-1||u.indexOf("/widgets/")!==-1)){window.__WIDGET_API_BASE__=new URL(u).origin;break}}}catch(e){}if(!window.__WIDGET_API_BASE__){window.__WIDGET_API_BASE__=""}})();
/* Google Fonts */
(function(){var h="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";if(!document.querySelector('link[href="'+h+'"]')){var l=document.createElement("link");l.rel="stylesheet";l.href=h;document.head.appendChild(l)}})();`,
            },
        },
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: false,
    },
    define: {
        'process.env': {},
        '__WIDGET_CONFIG__': JSON.stringify(widgetConfig),
        '__WIDGET_STRUCTURE__': JSON.stringify(widgetStructure),
    },
});
