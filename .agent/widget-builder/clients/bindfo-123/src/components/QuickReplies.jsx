import { motion } from 'framer-motion';

export default function QuickReplies({ options, onSelect }) {
    if (!options || options.length === 0) return null;

    return (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mask-fade-right">
            <div className="flex gap-2">
                {options.map((option, idx) => (
                    <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect(option)}
                        className="flex-shrink-0 px-4 py-2 rounded-full border border-white/20 bg-white/5 text-xs text-emerald-100 hover:border-emerald-400/50 hover:text-white transition-colors cursor-pointer shadow-sm hover:shadow-emerald-500/20 whitespace-nowrap"
                    >
                        {option}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
