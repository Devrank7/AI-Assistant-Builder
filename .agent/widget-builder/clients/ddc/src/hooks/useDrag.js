import { useState, useRef, useCallback, useEffect } from 'react';

const DRAG_THRESHOLD = 8;
const STORAGE_KEY_PREFIX = 'aw-drag-pos-';

export default function useDrag(clientId) {
    const [offset, setOffset] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_PREFIX + clientId);
            if (saved) return JSON.parse(saved);
        } catch { }
        return { x: 0, y: 0 };
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragState = useRef(null);

    const persist = useCallback((pos) => {
        try { localStorage.setItem(STORAGE_KEY_PREFIX + clientId, JSON.stringify(pos)); } catch { }
    }, [clientId]);

    const onPointerDown = useCallback((e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragState.current = {
            startX: e.clientX,
            startY: e.clientY,
            offsetX: offset.x,
            offsetY: offset.y,
            moved: false,
        };
    }, [offset]);

    const onPointerMove = useCallback((e) => {
        const ds = dragState.current;
        if (!ds) return;
        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        if (!ds.moved && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        ds.moved = true;
        setIsDragging(true);
        const newOffset = { x: ds.offsetX + dx, y: ds.offsetY + dy };
        setOffset(newOffset);
    }, []);

    const onPointerUp = useCallback((e) => {
        const ds = dragState.current;
        dragState.current = null;
        if (ds?.moved) {
            e.preventDefault();
            e.stopPropagation();
            persist(offset);
            // Delay clearing isDragging to suppress the click event
            requestAnimationFrame(() => setIsDragging(false));
        } else {
            setIsDragging(false);
        }
    }, [offset, persist]);

    const resetPosition = useCallback(() => {
        const zero = { x: 0, y: 0 };
        setOffset(zero);
        persist(zero);
    }, [persist]);

    return {
        offset,
        isDragging,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        resetPosition,
        dragStyle: { transform: `translate(${offset.x}px, ${offset.y}px)` },
    };
}
