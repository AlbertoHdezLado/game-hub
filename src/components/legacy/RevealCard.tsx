import { useLayoutEffect, useRef, type ReactNode } from 'react';

interface RevealCardProps {
  revealed: boolean;
  alarm?: boolean;
  contentClassName?: string;
  maxFontRem?: number;
  minFontRem?: number;
  cover: ReactNode;
  children: ReactNode;
}

// mirrors legacy createRevealCard(): tap-to-reveal box that auto-shrinks its text to fit
export function RevealCard({ revealed, alarm, contentClassName = '', maxFontRem = 1.7, minFontRem = 0.9, cover, children }: Readonly<RevealCardProps>) {
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || !revealed) return;
    el.style.fontSize = '';
    let size = maxFontRem;
    el.style.fontSize = `${size}rem`;
    while (size > minFontRem && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) {
      size -= 0.1;
      el.style.fontSize = `${size.toFixed(2)}rem`;
    }
  }, [revealed, children, maxFontRem, minFontRem]);

  return (
    <div className={`reveal-wrap${revealed ? ' revealed' : ''}${alarm ? ' alarm' : ''}`}>
      <div ref={contentRef} className={`reveal-content ${contentClassName}`.trim()}>{children}</div>
      {cover}
    </div>
  );
}

interface RevealButtonProps {
  onClick: () => void;
  icon?: string;
  label?: string;
}

export function RevealButton({ onClick, icon = '👆', label = 'Toca para revelar' }: Readonly<RevealButtonProps>) {
  return (
    <button type="button" className="reveal-btn" onClick={onClick}>
      <span className="reveal-icon">{icon}</span>
      <span className="reveal-text">{label}</span>
    </button>
  );
}
