import { motion } from 'framer-motion';

export default function QuickReplies({ options, onSelect }) {
    if (!options || options.length === 0) return null;

    return (
        <div className="flex flex-col gap-1.5">
            {options.map((option, idx) => (
                <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08, type: 'spring', stiffness: 400, damping: 28 }}
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(option)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#F6D8A8] bg-gradient-to-r from-[#FFF9F0] to-[#FEF5E8]/50 text-[11.5px] font-medium text-[#9A5004] hover:from-[#FEF5E8] hover:to-[#FDE8CC]/50 hover:border-[#f6b26b] hover:shadow-sm transition-all duration-200 cursor-pointer text-left"
                >
                    {option}
                </motion.button>
            ))}
        </div>
    );
}
