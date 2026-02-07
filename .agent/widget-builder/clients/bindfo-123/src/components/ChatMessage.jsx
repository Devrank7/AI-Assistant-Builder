import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User } from 'lucide-preact';

export default function ChatMessage({ role, content, avatar }) {
    const isBot = role === 'assistant';

    return (
        <motion.div
            initial={{ opacity: 0, x: isBot ? -20 : 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`flex items-end gap-2 mb-4 ${isBot ? 'justify-start' : 'justify-end'}`}
        >
            {isBot && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                    <img src={avatar} alt="Bot" className="w-full h-full object-cover" />
                </div>
            )}

            <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-md backdrop-blur-md border border-white/5 ${isBot
                    ? 'bg-white/10 text-white rounded-bl-sm'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm shadow-emerald-500/10'
                    }`}
            >
                <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            </div>

            {!isBot && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/50">
                    <User size={14} />
                </div>
            )}
        </motion.div>
    );
}
