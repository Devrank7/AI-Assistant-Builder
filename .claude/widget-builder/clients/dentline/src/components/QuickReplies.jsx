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
                    className="w-full px-3 py-1.5 rounded-xl border border-[#a3d4b8] bg-gradient-to-r from-[#edf7f1] to-[#d4eede]/50 text-[11.5px] font-medium text-[#246e49] hover:from-[#d4eede] hover:to-[#c5e7d3]/50 hover:border-[#8cc9a6] hover:shadow-sm transition-all duration-200 cursor-pointer text-left"
                >
                    {option}
                </motion.button>
            ))}
        </div>
    );
}
