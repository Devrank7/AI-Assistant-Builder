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
      <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <svg
          className="h-4 w-4"
          style={{ color: '#22d3ee' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128z"
          />
        </svg>
        <span className="text-xs font-medium" style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}>
          Choose a Design
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid gap-4">
          {variants.map((variant, i) => {
            const headerFrom = (variant.theme.headerFrom as string) || '#3b82f6';
            const headerVia = (variant.theme.headerVia as string) || headerFrom;
            const headerTo = (variant.theme.headerTo as string) || headerFrom;
            const isSelected = selected === i;

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className="group relative overflow-hidden rounded-xl text-left transition-all duration-300"
                style={{
                  background: isSelected ? 'rgba(6,182,212,0.06)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1px solid rgba(6,182,212,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isSelected ? '0 0 24px rgba(6,182,212,0.08)' : 'none',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Gradient preview bar */}
                <div
                  className="h-2 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${headerFrom}, ${headerVia}, ${headerTo})`,
                  }}
                />

                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}
                      >
                        {variant.label}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: '#4a5068' }}>
                        {(variant.theme.font as string) || 'Default font'}
                      </p>
                    </div>
                    {isSelected && (
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                          boxShadow: '0 0 12px rgba(6,182,212,0.4)',
                        }}
                      >
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
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
                          className="h-5 w-5 rounded-lg"
                          style={{
                            backgroundColor: color as string,
                            boxShadow: `0 0 8px ${color as string}25`,
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        />
                      ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
