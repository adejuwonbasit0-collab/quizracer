'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

interface Props { lastKey?: string }

export function VirtualKeyboard({ lastKey }: Props) {
  const [activeKey, setActiveKey] = useState('');

  useEffect(() => {
    if (!lastKey) return;
    const k = lastKey === ' ' ? 'SPACE' : lastKey.toUpperCase();
    setActiveKey(k);
    const t = setTimeout(() => setActiveKey(''), 150);
    return () => clearTimeout(t);
  }, [lastKey]);

  return (
    <div className="hidden sm:flex flex-col items-center gap-1.5 mt-2 select-none" aria-hidden="true">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1">
          {row.map((key) => (
            <div key={key}
              className={cn(
                'w-8 h-8 rounded-md border flex items-center justify-center text-xs font-semibold transition-all duration-100',
                activeKey === key
                  ? 'bg-brand-600 border-brand-500 text-white scale-95 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                  : 'bg-secondary border-border text-muted-foreground',
              )}
            >
              {key}
            </div>
          ))}
        </div>
      ))}
      <div className="flex gap-1 mt-0.5">
        <div className={cn(
          'w-36 h-8 rounded-md border flex items-center justify-content text-xs font-semibold transition-all duration-100',
          activeKey === 'SPACE'
            ? 'bg-brand-600 border-brand-500 text-white scale-95'
            : 'bg-secondary border-border text-muted-foreground',
        )}>
          <span className="w-full text-center">SPACE</span>
        </div>
      </div>
    </div>
  );
}
