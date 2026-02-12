import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Modal built on Radix Dialog. Single source of truth for dialogs: ESC, backdrop click, focus trap, smooth transitions. */
export function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100"
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-0 shadow-xl transition-[opacity,transform] duration-200 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100"
          onPointerDownOutside={() => onClose()}
          onEscapeKeyDown={() => onClose()}
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <Dialog.Title id="modal-title" className="text-lg font-semibold text-neutral-900">
              {title}
            </Dialog.Title>
            <Dialog.Close
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
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
