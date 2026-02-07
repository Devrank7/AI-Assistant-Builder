import { h, render } from 'preact';
import { Widget } from './components/Widget';
import './index.css';

// Inject global config
window.__WIDGET_CONFIG__ = __WIDGET_CONFIG__;

// Create Shadow DOM container for style isolation
class AIChatWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const container = document.createElement('div');
        container.id = 'widget-root';

        // Inject processed Tailwind CSS into Shadow DOM
        const styleSheet = document.createElement('style');
        styleSheet.textContent = window.__WIDGET_CSS__ || '';
        this.shadowRoot.appendChild(styleSheet);

        this.shadowRoot.appendChild(container);

        console.log('AIWidget: Styles injected into Shadow DOM', window.__WIDGET_CSS__ ? 'yes (' + window.__WIDGET_CSS__.length + ' chars)' : 'no');

        render(h(Widget, { config: window.__WIDGET_CONFIG__ }), container);
    }
}

// Register custom element
if (!customElements.get('ai-chat-widget')) {
    customElements.define('ai-chat-widget', AIChatWidget);
}

// Auto-mount when script loads
function mountWidget() {
    if (!document.querySelector('ai-chat-widget')) {
        document.body.appendChild(document.createElement('ai-chat-widget'));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
} else {
    mountWidget();
}
