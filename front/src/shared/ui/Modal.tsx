import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const DURATION_MS = 200;

const overlayBase =
  'fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ease-out';
const contentBase =
  'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-0 text-card-foreground shadow-xl transition-[opacity,transform] duration-200 ease-out';

/**
 * Modal built on Radix Dialog.
 * Smooth enter (fade overlay + scale/fade content) and exit animations.
 * ESC, backdrop click, and focus trap unchanged.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const [isOpen, setIsOpen] = useState(open);
  const [isExiting, setIsExiting] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterRafRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const startExit = useCallback(() => {
    if (exitTimeoutRef.current != null) return;
    setIsExiting(true);
    exitTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      onCloseRef.current();
      setIsExiting(false);
      setHasEntered(false);
      exitTimeoutRef.current = null;
    }, DURATION_MS);
  }, []);

  // Sync open → show dialog and run enter animation
  useEffect(() => {
    if (open) {
      setIsOpen(true);
      setIsExiting(false);
      setHasEntered(false);
      enterRafRef.current = requestAnimationFrame(() => {
        enterRafRef.current = requestAnimationFrame(() => {
          setHasEntered(true);
          enterRafRef.current = null;
        });
      });
      return () => {
        if (enterRafRef.current != null) {
          cancelAnimationFrame(enterRafRef.current);
          enterRafRef.current = null;
        }
      };
    }
  }, [open]);

  // When parent sets open=false: run exit animation then notify
  useEffect(() => {
    if (!open && isOpen && !isExiting) {
      startExit();
    }
  }, [open, isOpen, isExiting, startExit]);

  // Cleanup timeouts on unmount
  useEffect(
    () => () => {
      if (exitTimeoutRef.current != null) clearTimeout(exitTimeoutRef.current);
    },
    []
  );

  const overlayVisible = hasEntered && !isExiting;
  const contentVisible = hasEntered && !isExiting;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) startExit();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={`${overlayBase} ${overlayVisible ? 'opacity-100' : 'opacity-0'}`}
        />
        <Dialog.Content
          className={`${contentBase} ${contentVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          onPointerDownOutside={startExit}
          onEscapeKeyDown={startExit}
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <Dialog.Title id="modal-title" className="text-lg font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              aria-label="Close"
            >
              ×
            </Dialog.Close>
          </div>
          <div className="px-6 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
