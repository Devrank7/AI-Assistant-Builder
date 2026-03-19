import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-preact';

export default function ToggleButton({ ctx }) {
    const { isOpen, setIsOpen, isMobile, isDragging, resetPosition,
            onPointerDown, onPointerMove, onPointerUp, unreadCount } = ctx;

    if (isMobile && isOpen) return null;

    return (
        <div className="relative self-end">
            {!isOpen && unreadCount > 0 && (
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-aw-toggle-from to-aw-toggle-to animate-pulse-ring" />
            )}
            <motion.button
                whileHover={isDragging ? {} : { scale: 1.08, boxShadow: '0 8px 30px rgba(var(--aw-toggle-hover-rgb), 0.35)' }}
                whileTap={isDragging ? {} : { scale: 0.92 }}
                onClick={() => { if (!isDragging) setIsOpen(!isOpen); }}
                onDoubleClick={resetPosition}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className={`w-[58px] h-[58px] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-aw-toggle-shadow/30 bg-gradient-to-br from-aw-toggle-from via-aw-toggle-via to-aw-toggle-to border border-white/10 ${!isOpen ? 'animate-breathe' : ''}`}
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <X size={22} strokeWidth={2.5} />
                        </motion.div>
                    ) : (
                        <motion.div key="chat" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <MessageCircle size={22} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
            {!isOpen && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-aw-surface-bg shadow-sm pointer-events-none">
                    {unreadCount}
                </span>
            )}
        </div>
    );
}
