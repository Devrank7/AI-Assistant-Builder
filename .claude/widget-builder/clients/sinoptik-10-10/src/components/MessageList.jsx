import { motion } from 'framer-motion';
import { Sparkles, ArrowDown } from 'lucide-preact';
import ChatMessage from './ChatMessage';
import MessageFeedback from './MessageFeedback';
import RichBlocks from './RichBlocks';

export default function MessageList({ ctx }) {
    const { chatContainerRef, handleChatScroll, chatFontSize, typewriterDone, welcomeMsg,
            typewriterText, messages, shouldShowSeparator, getDayLabel, setExpandedImage,
            ttsSupported, speak, lang, speakingIdx, retryLastMessage, sessionId, config,
            isTyping, hasNewMessages, isAtBottom, scrollToBottom, messagesEndRef,
            handleRichAction, detectLang, sendMessage, uiStrings } = ctx;

    return (
        <div ref={chatContainerRef} onScroll={handleChatScroll}
            className={`flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide chat-pattern font-${chatFontSize}`} aria-live="polite">
            <ChatMessage role="assistant" content={typewriterDone ? welcomeMsg : typewriterText} onImageClick={setExpandedImage}
                onSpeak={ttsSupported && typewriterDone ? () => speak(welcomeMsg, lang, -1) : null} isSpeaking={speakingIdx === -1} />
            {messages.map((msg, idx) => (
                <div key={idx}>
                    {shouldShowSeparator(idx) && msg.timestamp && (
                        <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 h-px bg-aw-surface-border/50" />
                            <span className="text-[10px] font-medium text-aw-text-muted whitespace-nowrap">{getDayLabel(msg.timestamp)}</span>
                            <div className="flex-1 h-px bg-aw-surface-border/50" />
                        </div>
                    )}
                    <ChatMessage
                        role={msg.role} content={msg.content} timestamp={msg.timestamp}
                        isError={msg.isError} onRetry={msg.isError ? retryLastMessage : undefined}
                        imageUrl={msg.imageUrl} onImageClick={setExpandedImage}
                        onSpeak={msg.role === 'assistant' && ttsSupported ? () => speak(msg.content, lang, idx) : null}
                        isSpeaking={speakingIdx === idx}
                    />
                    {msg.role === 'assistant' && !msg.isError && msg.content && config.features?.feedback !== false && (
                        <MessageFeedback messageIndex={idx} sessionId={sessionId} clientId={config.clientId} />
                    )}
                    {msg.role === 'assistant' && msg.richBlocks?.length > 0 && (
                        <RichBlocks blocks={msg.richBlocks} onAction={handleRichAction} />
                    )}
                    {msg.role === 'assistant' && !msg.isError && msg.suggestions?.length > 0 && idx === messages.length - 1 && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="flex flex-wrap gap-1.5 ml-7 sm:ml-9 mt-2 mb-1">
                            {msg.suggestions.map((s, si) => (
                                <button key={si} onClick={() => { detectLang(s); sendMessage(s); }}
                                    className="px-2.5 py-1.5 rounded-lg border text-[12px] font-medium transition-all duration-200 cursor-pointer border-aw-surface-border bg-aw-surface-card text-aw-text-primary hover:bg-aw-surface-input hover:border-aw-chip-hover-border">
                                    {s}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </div>
            ))}
            {isTyping && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 py-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-aw-avatar-from to-aw-avatar-to flex items-center justify-center flex-shrink-0 shadow-sm border border-aw-avatar-border/50">
                        <Sparkles size={13} className="text-aw-avatar-icon" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-aw-text-secondary ml-1">{config.botName || 'AI'} {uiStrings.isTyping}</span>
                        <div className="bg-aw-surface-card border border-aw-surface-border rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                        </div>
                    </div>
                </motion.div>
            )}
            {hasNewMessages && !isAtBottom && (
                <div className="sticky bottom-2 left-0 right-0 flex justify-center z-10">
                    <button onClick={scrollToBottom}
                        className="new-msg-pill px-3.5 py-1.5 rounded-full text-[12px] font-semibold shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:shadow-xl bg-aw-surface-card text-aw-text-primary border border-aw-surface-border shadow-black/20">
                        <ArrowDown size={12} /> {uiStrings.newMessages}
                    </button>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
