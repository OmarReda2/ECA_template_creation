import { type ReactNode, useEffect, useRef, useCallback, useState } from 'react';

const DURATION_MS = 200;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

function getFocusables(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent != null && !el.hasAttribute('aria-hidden')
  );
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !contentRef.current?.contains(document.activeElement as Node)) return;
      const focusables = getFocusables(contentRef.current);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (document.activeElement === last && !e.shiftKey) {
        e.preventDefault();
        first.focus();
      } else if (document.activeElement === first && e.shiftKey) {
        e.preventDefault();
        last.focus();
      }
    },
    [onClose]
  );

  // Enter: mount visible then trigger transition
  useEffect(() => {
    if (!open) return;
    setHasAnimatedIn(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setHasAnimatedIn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Close transition and cleanup
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setIsClosing(false);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      setIsClosing(true);
    }
  }, [open, handleKeyDown]);

  // After exit animation, restore focus and clear closing
  useEffect(() => {
    if (!open && isClosing) {
      const t = setTimeout(() => {
        setIsClosing(false);
        previousActiveElement.current?.focus();
        previousActiveElement.current = null;
      }, DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [open, isClosing]);

  // Focus first focusable when modal content is visible
  useEffect(() => {
    if (open && hasAnimatedIn && contentRef.current) {
      const focusables = getFocusables(contentRef.current);
      if (focusables.length > 0) focusables[0].focus();
    }
  }, [open, hasAnimatedIn]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!contentRef.current?.contains(e.target as Node)) onClose();
  };

  const isVisible = open || isClosing;
  const showBackdrop = (open && hasAnimatedIn) || isClosing;
  const showContent = (open && hasAnimatedIn) || isClosing;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: open || isClosing ? 'auto' : 'none',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-hidden={!open && !isClosing}
      onClick={handleBackdropClick}
    >
      {/* Backdrop with fade */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        style={{
          transitionDuration: `${DURATION_MS}ms`,
          opacity: showBackdrop ? 1 : 0,
        }}
        aria-hidden
      />
      {/* Content with scale + fade */}
      <div
        ref={contentRef}
        className="relative w-full max-w-md rounded-lg bg-white shadow-xl transition-[transform,opacity]"
        style={{
          transitionDuration: `${DURATION_MS}ms`,
          transform: showContent ? 'scale(1)' : 'scale(0.95)',
          opacity: showContent ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
