import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { useChat } from '../hooks/useChat';

// Config is passed as prop or read from window inside component
// const config = window.__WIDGET_CONFIG__ || {};

// Icons as simple SVG components
const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

const ChatIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

const ThumbsUpIcon = ({ filled }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
    </svg>
);

const ThumbsDownIcon = ({ filled }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
    </svg>
);

// Glassmorphism styles
const styles = {
    container: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    toggleButton: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
        transition: 'all 0.3s ease',
        color: 'white',
    },
    widget: {
        width: '400px',
        height: '550px',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    header: {
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
    },
    headerActions: {
        display: 'flex',
        gap: '8px',
    },
    iconButton: {
        background: 'rgba(255, 255, 255, 0.2)',
        border: 'none',
        borderRadius: '8px',
        padding: '8px',
        cursor: 'pointer',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
    },
    messagesContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    message: {
        maxWidth: '80%',
        padding: '12px 16px',
        borderRadius: '16px',
        fontSize: '14px',
        lineHeight: '1.5',
    },
    userMessage: {
        alignSelf: 'flex-end',
        background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        color: 'white',
        borderBottomRightRadius: '4px',
    },
    botMessage: {
        alignSelf: 'flex-start',
        background: 'rgba(255, 255, 255, 0.9)',
        color: '#1F2937',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderBottomLeftRadius: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    },
    typingIndicator: {
        display: 'flex',
        gap: '4px',
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '16px',
        alignSelf: 'flex-start',
        border: '1px solid rgba(16, 185, 129, 0.2)',
    },
    typingDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#10B981',
        animation: 'bounce 1.4s infinite ease-in-out',
    },
    quickReplies: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '0 16px 12px',
    },
    quickReplyButton: {
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '20px',
        padding: '8px 16px',
        fontSize: '13px',
        color: '#10B981',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    inputContainer: {
        padding: '16px',
        borderTop: '1px solid rgba(16, 185, 129, 0.1)',
        display: 'flex',
        gap: '12px',
    },
    input: {
        flex: 1,
        padding: '12px 16px',
        borderRadius: '24px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        background: 'rgba(255, 255, 255, 0.9)',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    sendButton: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        border: 'none',
        cursor: 'pointer',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
    },
    feedbackContainer: {
        display: 'flex',
        gap: '8px',
        marginTop: '8px',
    },
    feedbackButton: {
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '8px',
        padding: '6px 10px',
        cursor: 'pointer',
        color: '#10B981',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        transition: 'all 0.2s',
    },
    feedbackButtonActive: {
        background: '#10B981',
        color: 'white',
    },
    leadForm: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 10,
    },
    formInput: {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        fontSize: '14px',
        marginBottom: '12px',
        outline: 'none',
    },
    formButton: {
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        border: 'none',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '8px',
    },
    thankYou: {
        fontSize: '12px',
        color: '#10B981',
        marginTop: '4px',
        animation: 'fadeIn 0.3s ease',
    },
};

// CSS animations
const cssAnimations = `
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// Message component with feedback
function ChatMessage({ message, index, onFeedback, showFeedback }) {
    const isUser = message.role === 'user';
    const [showThankYou, setShowThankYou] = useState(false);

    const handleFeedback = (rating) => {
        onFeedback(index, rating);
        setShowThankYou(true);
        setTimeout(() => setShowThankYou(false), 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
            <div style={{ ...styles.message, ...(isUser ? styles.userMessage : styles.botMessage) }}>
                {message.content}
                {message.streaming && <span style={{ animation: 'blink 1s infinite' }}>▊</span>}
            </div>

            {!isUser && showFeedback && !message.feedback && !message.streaming && (
                <div style={styles.feedbackContainer}>
                    <button
                        style={styles.feedbackButton}
                        onClick={() => handleFeedback('up')}
                        title="Helpful"
                    >
                        <ThumbsUpIcon filled={false} />
                    </button>
                    <button
                        style={styles.feedbackButton}
                        onClick={() => handleFeedback('down')}
                        title="Not helpful"
                    >
                        <ThumbsDownIcon filled={false} />
                    </button>
                </div>
            )}

            {message.feedback && (
                <div style={styles.feedbackContainer}>
                    <button style={{ ...styles.feedbackButton, ...styles.feedbackButtonActive }}>
                        {message.feedback === 'up' ? <ThumbsUpIcon filled={true} /> : <ThumbsDownIcon filled={true} />}
                    </button>
                </div>
            )}

            {showThankYou && config.features?.feedbackThankYou && (
                <span style={styles.thankYou}>Thanks for your feedback!</span>
            )}
        </div>
    );
}

// Lead collection form
function LeadForm({ onSubmit, onSkip, fields }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await onSubmit({ name, email });
        } catch (err) {
            setError('Failed to submit. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <div style={styles.leadForm}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>👋</div>
            <h3 style={{ margin: '0 0 8px', color: '#1F2937', fontSize: '18px' }}>Before we start...</h3>
            <p style={{ margin: '0 0 20px', color: '#6B7280', fontSize: '14px', textAlign: 'center' }}>
                Please share your contact details so we can follow up if needed.
            </p>

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.formInput}
                />
                <input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.formInput}
                />

                {error && <p style={{ color: '#EF4444', fontSize: '12px', margin: '0 0 8px' }}>{error}</p>}

                <button type="submit" style={styles.formButton} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Continue to Chat'}
                </button>
            </form>

            {config.features?.leadCollectionTrigger !== 'before-chat' && (
                <button
                    onClick={onSkip}
                    style={{ background: 'none', border: 'none', color: '#6B7280', marginTop: '12px', cursor: 'pointer', fontSize: '13px' }}
                >
                    Skip for now
                </button>
            )}
        </div>
    );
}

// Main Widget component
export function Widget({ config: propConfig }) {
    // Use prop config or fallback to window config
    const config = propConfig || window.__WIDGET_CONFIG__ || {};

    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const {
        messages,
        sendMessage,
        addMessage,
        sendFeedback,
        submitLead,
        isLoading,
        typing,
        starters,
        showLeadForm,
        setShowLeadForm,
        leadCollected,
        clearHistory
    } = useChat(config); // Pass config to useChat


    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            sendMessage(input);
            setInput('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleQuickReply = (text) => {
        sendMessage(text);
    };

    // Show greeting on first open
    useEffect(() => {
        if (isOpen && messages.length === 0 && config.bot?.greeting) {
            addMessage({
                role: 'assistant',
                content: config.bot.greeting
            });
        }
    }, [isOpen, messages.length, config.bot?.greeting]);

    return (
        <div style={styles.container}>
            <style>{cssAnimations}</style>

            {!isOpen ? (
                <button
                    style={styles.toggleButton}
                    onClick={() => setIsOpen(true)}
                    onMouseEnter={(e) => { e.target.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
                >
                    <ChatIcon />
                </button>
            ) : (
                <div style={{ ...styles.widget, animation: 'slideUp 0.3s ease' }}>
                    {/* Header */}
                    <div style={styles.header}>
                        <div style={styles.headerInfo}>
                            <div style={styles.avatar}>{config.bot?.avatar || '🤖'}</div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '15px' }}>{config.bot?.name || 'AI Assistant'}</div>
                                <div style={{ fontSize: '12px', opacity: 0.9 }}>Online</div>
                            </div>
                        </div>
                        <div style={styles.headerActions}>
                            {config.features?.clearHistory && (
                                <button style={styles.iconButton} onClick={clearHistory} title="Clear chat">
                                    <TrashIcon />
                                </button>
                            )}
                            <button style={styles.iconButton} onClick={() => setIsOpen(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={styles.messagesContainer}>
                        {/* Greeting */}
                        {messages.length === 0 && config.bot?.greeting && (
                            <div style={{ ...styles.message, ...styles.botMessage }}>
                                {config.bot.greeting}
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <ChatMessage
                                key={msg.timestamp || i}
                                message={msg}
                                index={i}
                                onFeedback={sendFeedback}
                                showFeedback={config.features?.feedback}
                            />
                        ))}

                        {typing && (
                            <div style={styles.typingIndicator}>
                                <div style={{ ...styles.typingDot, animationDelay: '0s' }} />
                                <div style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
                                <div style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Replies */}
                    {messages.length <= 1 && starters.length > 0 && (
                        <div style={styles.quickReplies}>
                            {starters.map((starter, i) => (
                                <button
                                    key={i}
                                    style={styles.quickReplyButton}
                                    onClick={() => handleQuickReply(starter.text)}
                                    onMouseEnter={(e) => { e.target.style.background = 'rgba(16, 185, 129, 0.2)'; }}
                                    onMouseLeave={(e) => { e.target.style.background = 'rgba(16, 185, 129, 0.1)'; }}
                                >
                                    {starter.text}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div style={styles.inputContainer}>
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={styles.input}
                            disabled={isLoading}
                        />
                        <button
                            style={styles.sendButton}
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
                        >
                            <SendIcon />
                        </button>
                    </div>

                    {/* Lead Form Overlay */}
                    {showLeadForm && !leadCollected && (
                        <LeadForm
                            onSubmit={submitLead}
                            onSkip={() => setShowLeadForm(false)}
                            fields={config.features?.leadFields || ['name', 'email']}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export default Widget;
