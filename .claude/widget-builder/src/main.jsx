import { h, render } from 'preact';
import { Widget } from './components/Widget';
import './index.css';

window.__WIDGET_CONFIG__ = __WIDGET_CONFIG__;
// Store Widget component on window so re-injected scripts always use the LATEST version
window.__WIDGET_COMPONENT__ = Widget;

class AIChatWidget extends HTMLElement {
    constructor() {
        super();
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }
    }

    connectedCallback() {
        // Clear shadow DOM completely (handles re-connection with fresh config)
        while (this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        }

        // Load Google Fonts into document head (fonts are global, available in Shadow DOM)
        const fontHref = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
        if (!document.querySelector('link[href="' + fontHref + '"]')) {
            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = fontHref;
            document.head.appendChild(fontLink);
        }

        const container = document.createElement('div');
        container.id = 'widget-root';
        this._widgetContainer = container;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = window.__WIDGET_CSS__ || '';
        this.shadowRoot.appendChild(styleSheet);
        this.shadowRoot.appendChild(container);

        // Use window.__WIDGET_COMPONENT__ — always the latest version from the most recent script load
        const WidgetComponent = window.__WIDGET_COMPONENT__ || Widget;
        render(h(WidgetComponent, { config: window.__WIDGET_CONFIG__ }), container);
    }

    disconnectedCallback() {
        // Unmount Preact tree to prevent memory leaks and stale state
        if (this._widgetContainer) {
            render(null, this._widgetContainer);
            this._widgetContainer = null;
        }
    }
}

const _aw_tag = 'ai-chat-' + (window.__WIDGET_CONFIG__?.clientId || 'widget').replace(/[^a-z0-9]/gi, '-').toLowerCase();
if (!customElements.get(_aw_tag)) {
    customElements.define(_aw_tag, AIChatWidget);
}

function mountWidget() {
    // Remove any previous widget instances
    document.querySelectorAll('[data-aw]').forEach(el => el.remove());

    // Clear stale chat data from localStorage for this client
    const clientId = window.__WIDGET_CONFIG__?.clientId;
    if (clientId) {
        try {
            localStorage.removeItem('aiwidget_' + clientId + '_messages');
            localStorage.removeItem('aiwidget_' + clientId + '_session');
        } catch {}
    }

    const el = document.createElement(_aw_tag);
    el.setAttribute('data-aw', '1');
    document.body.appendChild(el);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
} else {
    mountWidget();
}
