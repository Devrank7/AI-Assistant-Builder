'use client';

import { useState } from 'react';

interface Variant {
  label: string;
  theme: Record<string, unknown>;
}

interface Props {
  variants: Variant[];
  onSelect: (index: number) => void;
}

export default function ABCompare({ variants, onSelect }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    setSelected(index);
    onSelect(index);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-xs font-medium text-gray-500">Choose a Design</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4">
          {variants.map((variant, i) => {
            const colors = (variant.theme.headerFrom as string) || '#3b82f6';
            const isSelected = selected === i;

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${colors}, ${(variant.theme.headerTo as string) || colors})`,
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{variant.label}</p>
                    <p className="text-xs text-gray-500">{(variant.theme.font as string) || 'Default font'}</p>
                  </div>
                  {isSelected && <span className="ml-auto text-lg text-blue-500">✓</span>}
                </div>
                <div className="flex gap-1.5">
                  {[
                    variant.theme.headerFrom,
                    variant.theme.headerVia,
                    variant.theme.headerTo,
                    variant.theme.sendFrom,
                    variant.theme.userMsgFrom,
                  ]
                    .filter(Boolean)
                    .slice(0, 5)
                    .map((color, j) => (
                      <div
                        key={j}
                        className="h-6 w-6 rounded-full border border-gray-200"
                        style={{ backgroundColor: color as string }}
                      />
                    ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
