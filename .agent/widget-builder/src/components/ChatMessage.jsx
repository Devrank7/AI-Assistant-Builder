import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Bot, User } from 'lucide-preact';

export function ChatMessage({ message, config }) {
    const isBot = message.role === 'assistant';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={clsx(
                "flex gap-3 max-w-[90%]",
                !isBot && "ml-auto flex-row-reverse"
            )}
        >
            <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-sm",
                isBot ? "bg-gradient-to-tr from-primary to-accent" : "bg-gray-200 text-gray-500"
            )}>
                {isBot ? <Bot size={16} /> : <User size={16} />}
            </div>

            <div className={clsx(
                "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                isBot ? [
                    "rounded-tl-none",
                    config.design?.style === 'neon' ? "bg-white/10 text-white/90" : "bg-white border text-gray-800"
                ] : [
                    "rounded-tr-none bg-primary text-white"
                ]
            )}>
                {message.content}
            </div>
        </motion.div>
    );
}
