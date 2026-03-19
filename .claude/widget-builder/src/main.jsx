import { h, render } from 'preact';
import { Widget } from './components/Widget';
import './index.css';

window.__WIDGET_CONFIG__ = __WIDGET_CONFIG__;

// Store a self-contained render function from THIS script's Preact instance.
// When a new script.js loads after modify_widget_code, it overwrites this function
// with one that uses the NEW Widget component + the NEW Preact instance.
// The old customElements class calls this function in connectedCallback,
// avoiding cross-instance __H errors.
window.__WIDGET_MOUNT__ = function(container) {
    render(h(Widget, { config: window.__WIDGET_CONFIG__ }), container);
};

class AIChatWidget extends HTMLElement {
    constructor() {
        super();
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }
    }

    connectedCallback() {
        while (this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        }

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

        // Use window.__WIDGET_MOUNT__ — always calls the LATEST script's render+Widget
        // This avoids cross-Preact-instance __H errors because render() and Widget
        // are both from the same bundle.
        if (window.__WIDGET_MOUNT__) {
            window.__WIDGET_MOUNT__(container);
        } else {
            render(h(Widget, { config: window.__WIDGET_CONFIG__ }), container);
        }
    }

    disconnectedCallback() {
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

async function mountWidget() {
    document.querySelectorAll('[data-aw]').forEach(el => el.remove());

    const clientId = window.__WIDGET_CONFIG__?.clientId;
    const apiBase = window.__WIDGET_CONFIG__?.apiBase || '';

    // Check widget status (message limits) before mounting
    if (clientId && apiBase) {
        try {
            const statusRes = await fetch(apiBase + '/api/widget-status?clientId=' + encodeURIComponent(clientId));
            const status = await statusRes.json();
            if (!status.active) {
                console.warn('[WinBix AI] Widget disabled: ' + (status.message || status.reason || 'Plan limit reached. Upgrade at winbixai.com/plans'));
                return; // Don't mount widget
            }
        } catch (err) {
            // Fail-open: if status check fails, still show widget
            console.warn('[WinBix AI] Status check failed, showing widget anyway:', err.message);
        }
    }

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
