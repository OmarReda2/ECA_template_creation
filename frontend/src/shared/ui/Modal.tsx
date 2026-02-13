import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const overlayTransition = 'transition-opacity duration-200 ease-out data-[state=closed]:opacity-0 data-[state=open]:opacity-100';
const contentTransition = 'transition-[opacity,transform] duration-200 ease-out data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100';

/** Modal built on Radix Dialog. Single source of truth for dialogs: ESC, backdrop click, focus trap, smooth transitions. */
export function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={`fixed inset-0 z-50 bg-black/50 ${overlayTransition}`}
        />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-0 text-card-foreground shadow-xl ${contentTransition}`}
          onPointerDownOutside={() => onClose()}
          onEscapeKeyDown={() => onClose()}
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
