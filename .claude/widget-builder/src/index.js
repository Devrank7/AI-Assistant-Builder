import { h, render } from 'preact';
import { Widget } from './components/Widget';

// Inject config from build
const config = __WIDGET_CONFIG__;
window.__WIDGET_CONFIG__ = config;

// Create shadow DOM container for style isolation
class AIChatWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const container = document.createElement('div');
        this.shadowRoot.appendChild(container);
        // Pass config explicitly to ensure it's available
        render(h(Widget, { config: window.__WIDGET_CONFIG__ || config }), container);
    }
}

// Register custom element
if (!customElements.get('ai-chat-widget')) {
    customElements.define('ai-chat-widget', AIChatWidget);
}

// Auto-mount
document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('ai-chat-widget')) {
        document.body.appendChild(document.createElement('ai-chat-widget'));
    }
});

// Immediately mount if DOM is already ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!document.querySelector('ai-chat-widget')) {
        document.body.appendChild(document.createElement('ai-chat-widget'));
    }
}
