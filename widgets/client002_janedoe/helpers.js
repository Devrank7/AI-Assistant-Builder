// Helper functions for the AI Assistant widget

export function formatMessage(text) {
  return text.trim().replace(/\n/g, '<br>');
}

export function formatTimestamp(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
}

export function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export const CONSTANTS = {
  MAX_MESSAGE_LENGTH: 1000,
  TYPING_DELAY: 50,
  API_TIMEOUT: 30000
};
