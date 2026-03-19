import { Phone, Mail, Globe } from 'lucide-preact';

export default function ContactBar({ ctx }) {
    const { contacts, uiStrings } = ctx;

    if (!contacts || Object.keys(contacts).length === 0) return null;

    return (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-b overflow-x-auto scrollbar-hide bg-aw-surface-card/80 border-aw-surface-border">
            {contacts.phone && (
                <a href={'tel:' + contacts.phone} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap text-aw-text-secondary hover:text-aw-text-primary hover:bg-aw-surface-input" target="_blank" rel="noopener">
                    <Phone size={12} /> {uiStrings.call}
                </a>
            )}
            {contacts.email && (
                <a href={'mailto:' + contacts.email} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap text-aw-text-secondary hover:text-aw-text-primary hover:bg-aw-surface-input">
                    <Mail size={12} /> Email
                </a>
            )}
            {contacts.website && (
                <a href={contacts.website} target="_blank" rel="noopener" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap text-aw-text-secondary hover:text-aw-text-primary hover:bg-aw-surface-input">
                    <Globe size={12} /> {uiStrings.website}
                </a>
            )}
        </div>
    );
}
