import { ImagePlus, Mic, MicOff, Send } from 'lucide-preact';
import QuickReplies from './QuickReplies';

export default function InputArea({ ctx }) {
    const { inputRef, fileInputRef, inputValue, setInputValue, handleKeyDown, handleSubmit,
            handleImageSelect, selectedImage, voiceSupported, config, isListening,
            handleVoiceToggle, uiStrings, isLoading, showQuickReplies, sendMessage } = ctx;

    return (
        <div className="px-4 pt-2 pb-3 border-t border-aw-surface-border bg-aw-surface-bg space-y-1.5 safe-area-bottom">
            {showQuickReplies && <QuickReplies options={config.quickReplies || config.features?.quickReplies?.starters} onSelect={(t) => sendMessage(t)} />}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
                {ctx.imageUpload !== false && (
                    <>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                            className={`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 ${selectedImage ? 'border-aw-img-active-border bg-aw-img-active-bg text-aw-img-active-text shadow-sm' : 'border-aw-surface-border text-aw-text-secondary hover:text-aw-img-hover-text hover:border-aw-img-hover-border hover:bg-aw-img-hover-bg'}`}
                            aria-label="Upload photo">
                            <ImagePlus size={16} />
                        </button>
                    </>
                )}
                {voiceSupported && config.features?.voiceInput !== false && ctx.voiceInput !== false && (
                    <button type="button" onClick={handleVoiceToggle}
                        className={`flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200 ${isListening ? 'border-aw-img-active-border bg-aw-img-active-bg text-aw-img-active-text shadow-sm animate-pulse' : 'border-aw-surface-border text-aw-text-secondary hover:text-aw-img-hover-text hover:border-aw-img-hover-border hover:bg-aw-img-hover-bg'}`}
                        aria-label={isListening ? 'Stop recording' : 'Voice input'}>
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                )}
                <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={uiStrings.placeholder}
                    rows={1}
                    className="flex-1 min-w-0 bg-aw-surface-input text-aw-text-primary placeholder-aw-text-secondary rounded-xl py-2.5 pl-3.5 pr-3.5 border border-aw-surface-border focus:outline-none focus:border-aw-focus-border focus:ring-2 focus:ring-aw-focus-ring focus:bg-aw-surface-input-focus transition-all resize-none text-[13.5px] leading-relaxed"
                    style={{ maxHeight: '100px' }}
                />
                <button type="submit" disabled={(!inputValue.trim() && !selectedImage) || isLoading}
                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-aw-send text-white flex items-center justify-center hover:bg-aw-send-hover active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-aw-send/25">
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}
