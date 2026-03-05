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
                    className="group relative w-full rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer text-left shadow-sm hover:shadow-md bg-white/80 border-[#9acfed] hover:border-[#67b8e3] hover:bg-[#e6f3fa]/40 group-hover:shadow-[0_2px_16px_rgba(2,136,209,0.10)]"
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                        <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-gradient-to-br from-[#0288d1]/[0.12] to-[#0288d1]/[0.05] flex items-center justify-center shadow-sm">
                            <MessageCircle size={13} className="text-[#0288d1]" />
                        </span>
                        <span className="text-[12px] font-medium leading-snug text-[#0274b2]">{option}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0288d1]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </motion.button>
            ))}
        </div>
    );
}
