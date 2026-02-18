import { motion } from 'framer-motion';

export default function QuickReplies({ options, onSelect }) {
    if (!options || options.length === 0) return null;

    return (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex gap-2">
                {options.map((option, idx) => (
                    <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, type: 'spring', stiffness: 400, damping: 25 }}
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelect(option)}
                        className="flex-shrink-0 px-3.5 py-2 rounded-xl border border-[#7ee8c0] bg-gradient-to-b from-[#e6faf2] to-[#ccf5e5]/50 text-[11.5px] font-medium text-[#00905c] hover:bg-gradient-to-b hover:from-[#ccf5e5] hover:to-[#b3f0d8]/50 hover:border-[#4edda8] hover:shadow-sm transition-all duration-200 cursor-pointer whitespace-nowrap"
                    >
                        {option}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
