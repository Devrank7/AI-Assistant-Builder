// src/components/playground/ColorPicker.tsx

'use client';

import { useState, useCallback } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [text, setText] = useState(value);
  const [eyeDropperSupported] = useState(() => typeof window !== 'undefined' && 'EyeDropper' in window);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setText(v);
      if (HEX_RE.test(v)) onChange(v);
    },
    [onChange]
  );

  const handleNativeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setText(v);
      onChange(v);
    },
    [onChange]
  );

  const handleEyeDropper = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      const hex = result.sRGBHex;
      setText(hex);
      onChange(hex);
    } catch {
      // User cancelled or API error — ignore
    }
  }, [onChange]);

  // Sync when parent value changes (e.g., reset, "Auto from site")
  // Using useEffect avoids render-loop issues
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (HEX_RE.test(value)) setText(value);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="w-24 shrink-0 truncate text-xs text-gray-400">{label}</label>
      <div className="relative">
        <input
          type="color"
          value={HEX_RE.test(text) ? text : '#000000'}
          onChange={handleNativeChange}
          className="h-8 w-8 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
        />
      </div>
      <input
        type="text"
        value={text}
        onChange={handleTextChange}
        placeholder="#000000"
        maxLength={7}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-white focus:border-cyan-500/50 focus:outline-none"
      />
      {eyeDropperSupported && (
        <button
          type="button"
          onClick={handleEyeDropper}
          title="Pick color from screen"
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11.25l1.5-1.5a3.354 3.354 0 10-4.743-4.743L10.5 6.5m4.5 4.75l-7.5 7.5-3 1 1-3 7.5-7.5m1.5-1.5L15 11.25"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
