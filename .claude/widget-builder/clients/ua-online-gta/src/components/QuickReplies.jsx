import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-preact';

export default function QuickReplies({ options, onSelect }) {
    if (!options || options.length === 0) return null;

    return (
        <div className="flex flex-col gap-2">
            {options.map((option, idx) => (
                <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.1 + idx * 0.07, type: 'spring', stiffness: 380, damping: 26 }}
                    whileHover={{ scale: 1.015, y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => onSelect(option)}
                    className="group relative w-full rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer text-left shadow-sm hover:shadow-md bg-[#1a1d23]/80 border-[#2a2d35]/80 hover:border-[#4ade80] hover:bg-[#1e212b] group-hover:shadow-[0_0_20px_rgba(74,222,128,0.08)]"
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                        <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-gradient-to-br from-[#4ade80]/20 to-[#4ade80]/10 flex items-center justify-center shadow-sm">
                            <MessageCircle size={13} className="text-[#4ade80]" />
                        </span>
                        <span className="text-[12px] font-medium leading-snug text-[#ffffff]">{option}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#4ade80]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </motion.button>
            ))}
        </div>
    );
}
