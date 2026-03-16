import { useState, useEffect, useCallback } from 'preact/hooks';

/**
 * Hook for Smart FAQ widget — fetches FAQ items from knowledge base
 * and provides search/filter functionality.
 *
 * @param {string} clientId - The widget client ID
 * @param {string} apiBase - Base URL for API calls
 */
export function useFaq(clientId, apiBase) {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch FAQ items on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchFaq() {
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/api/widget/faq?clientId=${clientId}`);
        if (!res.ok) throw new Error('Failed to fetch FAQ');
        const data = await res.json();
        if (!cancelled) {
          const faqItems = data.data || [];
          setItems(faqItems);
          setFilteredItems(faqItems);
          // Extract unique categories
          const cats = [...new Set(faqItems.map((i) => i.category).filter(Boolean))];
          setCategories(cats);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFaq();
    return () => {
      cancelled = true;
    };
  }, [clientId, apiBase]);

  // Filter items by search query and category
  useEffect(() => {
    let result = items;
    if (activeCategory) {
      result = result.filter((i) => i.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q));
    }
    setFilteredItems(result);
  }, [items, searchQuery, activeCategory]);

  const toggleExpanded = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const search = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const filterByCategory = useCallback((cat) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  }, []);

  return {
    items: filteredItems,
    categories,
    searchQuery,
    activeCategory,
    expandedId,
    loading,
    error,
    search,
    filterByCategory,
    toggleExpanded,
  };
}
