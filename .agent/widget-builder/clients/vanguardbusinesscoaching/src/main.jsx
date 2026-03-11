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
        const fontHref = 'https://fonts.googleapis.com/css?family=Lato:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i%7COpen%20Sans:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i%7CMontserrat:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i%7COswald:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i%7CBarlow:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i%7CRoboto:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i%7C';
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

const _aw_tag = 'ai-chat-' + (window.__WIDGET_CONFIG__?.clientId || 'widget').replace(/[^a-z0-9]/gi, '-').toLowerCase();
if (!customElements.get(_aw_tag)) {
    customElements.define(_aw_tag, AIChatWidget);
}

function mountWidget() {
    // Remove any previous widget instances from other clients
    document.querySelectorAll('[data-aw]').forEach(el => el.remove());
    const el = document.createElement(_aw_tag);
    el.setAttribute('data-aw', '1');
    document.body.appendChild(el);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
} else {
    mountWidget();
}
