import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-preact';

function Card({ card, onAction }) {
    return (
        <div className="flex-shrink-0 w-[200px] rounded-2xl border overflow-hidden bg-white border-gray-100 shadow-sm">
            {card.image && (
                <img src={card.image} alt={card.title || ''} className="w-full h-[100px] object-cover" loading="lazy" />
            )}
            <div className="p-3 space-y-1.5">
                <h4 className="font-semibold text-[12.5px] leading-tight text-gray-800">{card.title}</h4>
                {card.description && <p className="text-[11px] leading-relaxed text-gray-500">{card.description}</p>}
                {card.button && (
                    <button onClick={() => onAction?.(card.button.url, card.button.label)}
                        className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all bg-[#F0F8FE] text-[#1a2081] hover:bg-[#E8F4FD] flex items-center justify-center gap-1">
                        {card.button.label} <ExternalLink size={10} />
                    </button>
                )}
            </div>
        </div>
    );
}

function ButtonGroup({ buttons, onAction }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {buttons.map((btn, i) => (
                <button key={i} onClick={() => onAction?.(btn.url, btn.label)}
                    className="px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all cursor-pointer border-[#C8E5FA] bg-[#F0F8FE] text-[#1a2081] hover:bg-[#E8F4FD] hover:border-[#00c6ff]">
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
                className="rounded-2xl border p-3 text-center bg-gray-50 border-gray-100">
                <p className="text-[12px] font-medium text-gray-700">✓ Submitted</p>
            </motion.div>
        );
    }

    return (
        <motion.form initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} className="rounded-2xl border p-3 space-y-2 bg-gray-50 border-gray-100">
            {fields.map((f) => (
                <input key={f.key} type={f.key === 'email' ? 'email' : f.key === 'phone' ? 'tel' : 'text'}
                    placeholder={f.label}
                    value={values[f.key] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-1 focus:ring-[#F0F8FE] transition-all bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-[#5a63d8]"
                />
            ))}
            <button type="submit"
                className="w-full py-2 rounded-xl text-[12px] font-semibold text-white bg-[#1a2081] hover:bg-[#15196E] transition-all shadow-sm">
                {submitLabel}
            </button>
        </motion.form>
    );
}

export default function RichBlocks({ blocks, onAction }) {
    if (!blocks || blocks.length === 0) return null;

    return (
        <div className="ml-9 mt-1.5 mb-1 space-y-2">
            {blocks.map((block, idx) => {
                if (block.type === 'card') {
                    return <div key={idx} className="flex"><Card card={block} onAction={onAction} /></div>;
                }
                if (block.type === 'carousel') {
                    return (
                        <div key={idx} className="overflow-x-auto scrollbar-hide -mr-4 pr-4">
                            <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                                {block.items.map((card, ci) => <Card key={ci} card={card} onAction={onAction} />)}
                            </div>
                        </div>
                    );
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
