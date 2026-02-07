import { h, render } from 'preact';
import { Widget } from './components/Widget';

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
        this.shadowRoot.appendChild(container);
        render(h(Widget, {}), container);
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
