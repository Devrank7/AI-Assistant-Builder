import { h, render } from 'preact';
import { Widget } from './components/Widget';
import './index.css';

window.__WIDGET_CONFIG__ = __WIDGET_CONFIG__;

class AIChatWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        // Load Google Fonts into document head (fonts are global, available in Shadow DOM)
        const fontHref = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap';
        if (!document.querySelector('link[href="' + fontHref + '"]')) {
            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = fontHref;
            document.head.appendChild(fontLink);
        }

        const container = document.createElement('div');
        container.id = 'widget-root';

        const styleSheet = document.createElement('style');
        styleSheet.textContent = window.__WIDGET_CSS__ || '';
        this.shadowRoot.appendChild(styleSheet);
        this.shadowRoot.appendChild(container);

        render(h(Widget, { config: window.__WIDGET_CONFIG__ }), container);
    }
}

if (!customElements.get('ai-chat-widget')) {
    customElements.define('ai-chat-widget', AIChatWidget);
}

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
