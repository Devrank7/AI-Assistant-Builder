import { render } from 'preact';
import { Widget } from './components/Widget';
import styles from './index.css?inline'; // Import CSS as string

// Config injected during build time via Vite 'define'
const DEFAULT_CONFIG = typeof __WIDGET_CONFIG__ !== 'undefined' ? __WIDGET_CONFIG__ : {
    clientId: 'demo',
    apiEndpoint: 'http://localhost:3000/api/chat',
    theme: { primary: '#000', accent: '#333' },
    bot: { name: 'Demo Bot' }
};

class AIWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        // Merge attributes with config if needed
        const configStr = this.getAttribute('data-config');
        const config = configStr ? JSON.parse(configStr) : DEFAULT_CONFIG;

        // Create container
        const mountPoint = document.createElement('div');

        // Inject Styles into Shadow DOM
        const styleTag = document.createElement('style');
        styleTag.textContent = styles;

        this.shadowRoot.appendChild(styleTag);
        this.shadowRoot.appendChild(mountPoint);

        // Mount the app
        render(<Widget config={config} root={this.shadowRoot} />, mountPoint);
    }
}

if (!customElements.get('ai-widget')) {
    customElements.define('ai-widget', AIWidget);
}

window.initAIWidget = (config) => {
    if (config) Object.assign(DEFAULT_CONFIG, config);
    const widget = document.createElement('ai-widget');
    document.body.appendChild(widget);
};
