import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-preact';

function Card({ card, onAction }) {
    return (
        <div className="flex-shrink-0 w-[170px] sm:w-[200px] rounded-2xl border overflow-hidden bg-[#0F1629] border-[#1E2D4A] shadow-sm">
            {card.image && (
                <img src={card.image} alt={card.title || ''} className="w-full h-[100px] object-cover" loading="lazy" />
            )}
            <div className="p-3 space-y-1.5">
                <h4 className="font-semibold text-[12.5px] leading-tight text-[#E8EAED]">{card.title}</h4>
                {card.description && <p className="text-[11px] leading-relaxed text-[#94A3B8]">{card.description}</p>}
                {card.button && (
                    <button onClick={() => onAction?.(card.button.url, card.button.label)}
                        className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all bg-[#0A1020] text-[#E8EAED] hover:bg-[#131D35] flex items-center justify-center gap-1">
                        {card.button.label} <ExternalLink size={10} />
                    </button>
                )}
            </div>
        </div>
    );
}

function Carousel({ items, onAction }) {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateArrows = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    }, []);

    const scroll = useCallback((dir) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * 210, behavior: 'smooth' });
    }, []);

    return (
        <div className="relative group">
            <div ref={scrollRef} onScroll={updateArrows}
                className="overflow-x-auto scrollbar-hide -mr-4 pr-4 scroll-smooth">
                <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                    {items.map((card, ci) => <Card key={ci} card={card} onAction={onAction} />)}
                </div>
            </div>
            {canScrollLeft && (
                <button onClick={() => scroll(-1)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0F1629]/90 border-[#1E2D4A] hover:bg-[#0F1629] shadow-md border flex items-center justify-center transition-all z-10">
                    <ChevronLeft size={14} className="text-[#94A3B8]" />
                </button>
            )}
            {canScrollRight && (
                <button onClick={() => scroll(1)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0F1629]/90 border-[#1E2D4A] hover:bg-[#0F1629] shadow-md border flex items-center justify-center transition-all z-10">
                    <ChevronRight size={14} className="text-[#94A3B8]" />
                </button>
            )}
        </div>
    );
}

function ButtonGroup({ buttons, onAction }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {buttons.map((btn, i) => (
                <button key={i} onClick={() => onAction?.(btn.url, btn.label)}
                    className="px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all cursor-pointer border-[#1E2D4A] bg-[#0F1629] text-[#E8EAED] hover:bg-[#0A1020]">
                    {btn.label}
                </button>
            ))}
        </div>
    );
}

function LeadForm({ fields, submitLabel, onSubmit }) {
    const [values, setValues] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        const filled = Object.values(values).filter(v => v?.trim()).length;
        if (filled === 0) return;
        setSubmitted(true);
        const formText = fields.map(f => f.label + ': ' + (values[f.key] || '—')).join('\n');
        onSubmit?.('form_submit', formText);
    }, [values, fields, onSubmit]);

    if (submitted) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl border p-3 text-center bg-[#0F1629] border-[#1E2D4A]">
                <p className="text-[12px] font-medium text-[#E8EAED]">✓ Submitted</p>
            </motion.div>
        );
    }

    return (
        <motion.form initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} className="rounded-2xl border p-3 space-y-2 bg-[#0F1629] border-[#1E2D4A]">
            {fields.map((f) => (
                <input key={f.key} type={f.key === 'email' ? 'email' : f.key === 'phone' ? 'tel' : 'text'}
                    placeholder={f.label}
                    value={values[f.key] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-1 focus:ring-[#111827] transition-all bg-[#0A1020] border-[#1E2D4A] text-[#E8EAED] placeholder-[#64748B] focus:border-[#3B82F6]"
                />
            ))}
            <button type="submit"
                className="w-full py-2 rounded-xl text-[12px] font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] transition-all shadow-sm">
                {submitLabel}
            </button>
        </motion.form>
    );
}

export default function RichBlocks({ blocks, onAction }) {
    if (!blocks || blocks.length === 0) return null;

    return (
        <div className="ml-7 sm:ml-9 mt-1.5 mb-1 space-y-2">
            {blocks.map((block, idx) => {
                if (block.type === 'card') {
                    return <div key={idx} className="flex"><Card card={block} onAction={onAction} /></div>;
                }
                if (block.type === 'carousel') {
                    return <Carousel key={idx} items={block.items} onAction={onAction} />;
                }
                if (block.type === 'button_group') {
                    return <ButtonGroup key={idx} buttons={block.buttons} onAction={onAction} />;
                }
                if (block.type === 'form') {
                    return <LeadForm key={idx} fields={block.fields} submitLabel={block.submitLabel} onSubmit={onAction} />;
                }
                return null;
            })}
        </div>
    );
}
