import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useFaq } from '../hooks/useFaq';
import { useDrag } from '../hooks/useDrag';
import { useLanguage } from '../hooks/useLanguage';

const CFG = typeof window !== 'undefined' && window.__WIDGET_CFG__ ? window.__WIDGET_CFG__ : {};
const API_BASE = CFG.apiBase || '';
const CLIENT_ID = CFG.clientId || '';

export default function SmartFaq() {
  const [isOpen, setIsOpen] = useState(false);
  const { position, onPointerDown } = useDrag();
  const { t } = useLanguage();
  const {
    items,
    categories,
    searchQuery,
    activeCategory,
    expandedId,
    loading,
    error,
    search,
    filterByCategory,
    toggleExpanded,
  } = useFaq(CLIENT_ID, API_BASE);

  return (
    <div class="wbx-faq-root">
      {/* Toggle Button */}
      <button
        class="wbx-faq-toggle"
        onClick={() => setIsOpen(!isOpen)}
        onPointerDown={onPointerDown}
        style={{ bottom: position.y + 'px', right: position.x + 'px' }}
        aria-label={isOpen ? 'Close FAQ' : 'Open FAQ'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      </button>

      {/* FAQ Panel */}
      {isOpen && (
        <div class="wbx-faq-panel">
          {/* Header */}
          <div class="wbx-faq-header">
            <h2 class="wbx-faq-title">{t('faq_title', 'Frequently Asked Questions')}</h2>
            <button class="wbx-faq-close" onClick={() => setIsOpen(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div class="wbx-faq-search">
            <input
              type="text"
              class="wbx-faq-search-input"
              placeholder={t('faq_search', 'Search questions...')}
              value={searchQuery}
              onInput={(e) => search(e.target.value)}
            />
          </div>

          {/* Category Filters */}
          {categories.length > 0 && (
            <div class="wbx-faq-categories">
              {categories.map((cat) => (
                <button
                  key={cat}
                  class={`wbx-faq-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => filterByCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div class="wbx-faq-content">
            {loading && <div class="wbx-faq-loading">{t('loading', 'Loading...')}</div>}
            {error && <div class="wbx-faq-error">{error}</div>}
            {!loading && !error && items.length === 0 && (
              <div class="wbx-faq-empty">{t('faq_empty', 'No questions found')}</div>
            )}
            {items.map((item) => (
              <div key={item.id} class={`wbx-faq-item ${expandedId === item.id ? 'expanded' : ''}`}>
                <button
                  class="wbx-faq-question"
                  onClick={() => toggleExpanded(item.id)}
                  aria-expanded={expandedId === item.id}
                >
                  <span>{item.question}</span>
                  <svg
                    class={`wbx-faq-chevron ${expandedId === item.id ? 'rotated' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {expandedId === item.id && <div class="wbx-faq-answer">{item.answer}</div>}
              </div>
            ))}
          </div>

          {/* AI Fallback */}
          <div class="wbx-faq-footer">
            <p class="wbx-faq-footer-text">{t('faq_fallback', "Didn't find your answer?")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
