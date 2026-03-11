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
                    className="group relative w-full rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer text-left shadow-sm hover:shadow-md bg-[#18202a]/80 border-[#273640]/80 hover:border-[#f6f6f6] hover:bg-[#0e1820] group-hover:shadow-[0_0_20px_rgba(240,240,240,0.08)]"
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                        <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-gradient-to-br from-[#f0f0f0]/20 to-[#f0f0f0]/10 flex items-center justify-center shadow-sm">
                            <MessageCircle size={13} className="text-[#f0f0f0]" />
                        </span>
                        <span className="text-[12px] font-medium leading-snug text-[#e2e8f0]">{option}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#f0f0f0]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </motion.button>
            ))}
        </div>
    );
}
