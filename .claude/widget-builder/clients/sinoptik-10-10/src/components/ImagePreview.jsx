import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-preact';

export default function ImagePreview({ ctx }) {
    const { selectedImage, removeSelectedImage } = ctx;

    return (
        <AnimatePresence>
            {selectedImage && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 overflow-hidden bg-aw-surface-bg border-aw-surface-border">
                    <div className="relative inline-block my-2.5">
                        <img src={selectedImage.previewUrl} alt="" className="h-16 w-auto rounded-xl border border-aw-surface-border object-cover shadow-sm" />
                        <button onClick={removeSelectedImage} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md transition-colors">
                            <X size={11} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
