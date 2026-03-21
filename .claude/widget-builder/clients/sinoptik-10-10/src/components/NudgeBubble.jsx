import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-preact';

export default function NudgeBubble({ ctx }) {
    const { showNudge, isOpen, nudgeMessage, dismissNudge, setIsOpen } = ctx;

    return (
        <AnimatePresence>
            {showNudge && !isOpen && nudgeMessage && (
                <motion.div key="nudge"
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="max-w-[200px] sm:max-w-[220px] px-3.5 py-2.5 rounded-2xl shadow-xl shadow-black/10 border cursor-pointer relative bg-aw-surface-card border-aw-surface-border text-aw-text-primary"
                    onClick={() => { dismissNudge(); setIsOpen(true); }}
                >
                    <button onClick={(e) => { e.stopPropagation(); dismissNudge(); }}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors bg-aw-surface-border text-aw-text-secondary hover:bg-aw-surface-input">
                        <X size={11} />
                    </button>
                    <p className="text-[12.5px] leading-relaxed pr-2">{nudgeMessage}</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
