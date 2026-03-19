import { useState } from 'react';
import { Sparkles, X, MoreVertical, Trash2, Volume2, VolumeX, Type, Download, ChevronDown } from 'lucide-preact';

export default function Header({ ctx }) {
    const { isOffline, config, uiStrings, setIsOpen, isMobile, showMenu, setShowMenu,
            menuRef, clearMessages, toggleMute, isMuted, cycleFontSize, chatFontSize,
            exportChat, messages } = ctx;

    return (
        <div className="relative px-6 py-5 flex items-center justify-between bg-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-aw-header-from via-aw-header-via to-aw-header-to" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

            <div className="relative flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shadow-white/10">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    {!isOffline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-aw-online-dot border-[2.5px] border-aw-online-dot-border shadow-sm" />
                    )}
                </div>
                <div>
                    <h3 className="font-semibold text-[15px] text-white tracking-tight leading-tight truncate max-w-[140px] sm:max-w-[180px]">{config.botName || config.bot?.name}</h3>
                    <p className="text-[11px] text-white/65 font-medium flex items-center gap-1">
                        {isOffline ? uiStrings.offline : (<><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />{uiStrings.respondsInstantly}</>)}
                    </p>
                </div>
            </div>
            <div className="relative flex items-center gap-1">
                <div className="relative" ref={menuRef}>
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="p-2 hover:bg-white/15 rounded-xl text-white/50 hover:text-white transition-all duration-200" aria-label="Menu">
                        <MoreVertical size={15} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1.5 w-[168px] rounded-2xl shadow-xl border overflow-hidden z-50 bg-aw-surface-card/95 border-aw-surface-border" style={{ backdropFilter: 'blur(16px)' }}>
                            <button onClick={() => { clearMessages(); setShowMenu(false); }}
                                className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center gap-2.5 transition-colors text-aw-text-primary hover:bg-aw-surface-input">
                                <Trash2 size={13} /> {uiStrings.newChat}
                            </button>
                            <button onClick={() => { toggleMute(); setShowMenu(false); }}
                                className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center gap-2.5 transition-colors text-aw-text-primary hover:bg-aw-surface-input">
                                {isMuted ? <Volume2 size={13} /> : <VolumeX size={13} />} {isMuted ? uiStrings.unmute : uiStrings.mute}
                            </button>
                            <button onClick={() => { cycleFontSize(); }}
                                className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center justify-between transition-colors text-aw-text-primary hover:bg-aw-surface-input">
                                <span className="flex items-center gap-2.5"><Type size={13} /> {uiStrings.fontSize}</span>
                                <span className="text-[10px] opacity-60 font-bold tracking-wider">{chatFontSize.toUpperCase()}</span>
                            </button>
                            {messages.length > 0 && (
                                <button onClick={exportChat}
                                    className="w-full px-3.5 py-2.5 text-left text-[12px] font-medium flex items-center gap-2.5 transition-colors text-aw-text-primary hover:bg-aw-surface-input">
                                    <Download size={13} /> {uiStrings.exportChat}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/15 rounded-xl text-white/50 hover:text-white transition-all duration-200" aria-label="Close">
                    {isMobile ? <ChevronDown size={18} /> : <X size={16} />}
                </button>
            </div>
        </div>
    );
}
