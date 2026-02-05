// AI Chat Widget for johndoe
(function() {
  'use strict';

  const CONFIG = {
    clientId: 'client001_johndoe',
    primaryColor: '#00fff2',
    position: 'bottom-right'
  };

  // Create widget container
  function createWidget() {
    const container = document.createElement('div');
    container.id = 'ai-chat-widget';
    container.innerHTML = `
      <style>
        #ai-chat-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .ai-widget-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${CONFIG.primaryColor}, #bf00ff);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0, 255, 242, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .ai-widget-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(0, 255, 242, 0.6);
        }
        .ai-widget-button svg {
          width: 28px;
          height: 28px;
          fill: white;
        }
        .ai-widget-chat {
          display: none;
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 350px;
          height: 500px;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        .ai-widget-chat.open {
          display: flex;
          flex-direction: column;
        }
        .ai-widget-header {
          padding: 16px;
          background: rgba(0, 255, 242, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .ai-widget-header h3 {
          margin: 0;
          color: ${CONFIG.primaryColor};
          font-size: 16px;
        }
        .ai-widget-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
        }
        .ai-widget-input {
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .ai-widget-input input {
          width: 100%;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 14px;
        }
        .ai-widget-input input:focus {
          outline: none;
          border-color: ${CONFIG.primaryColor};
        }
      </style>
      <div class="ai-widget-chat">
        <div class="ai-widget-header">
          <h3>AI Assistant</h3>
        </div>
        <div class="ai-widget-messages">
          <p style="color: #888; text-align: center;">How can I help you today?</p>
        </div>
        <div class="ai-widget-input">
          <input type="text" placeholder="Type your message..." />
        </div>
      </div>
      <button class="ai-widget-button">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      </button>
    `;
    document.body.appendChild(container);

    // Toggle chat
    const button = container.querySelector('.ai-widget-button');
    const chat = container.querySelector('.ai-widget-chat');
    button.addEventListener('click', () => {
      chat.classList.toggle('open');
    });

    console.log('[AI Widget] Initialized for client:', CONFIG.clientId);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
