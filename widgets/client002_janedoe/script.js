// AI Assistant Widget for janedoe
(function() {
  'use strict';

  const CONFIG = {
    clientId: 'client002_janedoe',
    primaryColor: '#bf00ff',
    position: 'bottom-right'
  };

  // Import helper functions
  // import { formatMessage } from './helpers.js';

  function createWidget() {
    const container = document.createElement('div');
    container.id = 'ai-assistant-widget';
    container.innerHTML = `
      <style>
        #ai-assistant-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .ai-assistant-trigger {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: linear-gradient(135deg, ${CONFIG.primaryColor}, #ff00d4);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(191, 0, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .ai-assistant-trigger:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(191, 0, 255, 0.6);
        }
        .ai-assistant-trigger svg {
          width: 24px;
          height: 24px;
          fill: white;
        }
        .ai-assistant-panel {
          display: none;
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 380px;
          height: 520px;
          background: rgba(15, 10, 25, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(191, 0, 255, 0.2);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }
        .ai-assistant-panel.visible {
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ai-assistant-top {
          padding: 20px;
          background: linear-gradient(135deg, rgba(191, 0, 255, 0.15), rgba(255, 0, 212, 0.1));
          border-bottom: 1px solid rgba(191, 0, 255, 0.2);
        }
        .ai-assistant-top h3 {
          margin: 0 0 4px;
          color: white;
          font-size: 18px;
          font-weight: 600;
        }
        .ai-assistant-top p {
          margin: 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
        }
        .ai-assistant-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          color: rgba(255, 255, 255, 0.8);
        }
        .ai-assistant-bottom {
          padding: 16px 20px;
          border-top: 1px solid rgba(191, 0, 255, 0.2);
          display: flex;
          gap: 10px;
        }
        .ai-assistant-bottom input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid rgba(191, 0, 255, 0.3);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 14px;
        }
        .ai-assistant-bottom input:focus {
          outline: none;
          border-color: ${CONFIG.primaryColor};
          box-shadow: 0 0 0 3px rgba(191, 0, 255, 0.1);
        }
        .ai-assistant-bottom button {
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, ${CONFIG.primaryColor}, #ff00d4);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .ai-assistant-bottom button:hover {
          transform: scale(1.05);
        }
      </style>
      <div class="ai-assistant-panel">
        <div class="ai-assistant-top">
          <h3>AI Assistant</h3>
          <p>Powered by advanced AI</p>
        </div>
        <div class="ai-assistant-content">
          <p>Hello! I'm here to help you. Ask me anything about our services.</p>
        </div>
        <div class="ai-assistant-bottom">
          <input type="text" placeholder="Ask me anything..." />
          <button>Send</button>
        </div>
      </div>
      <button class="ai-assistant-trigger">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
      </button>
    `;
    document.body.appendChild(container);

    const trigger = container.querySelector('.ai-assistant-trigger');
    const panel = container.querySelector('.ai-assistant-panel');
    trigger.addEventListener('click', () => {
      panel.classList.toggle('visible');
    });

    console.log('[AI Assistant] Initialized for client:', CONFIG.clientId);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
