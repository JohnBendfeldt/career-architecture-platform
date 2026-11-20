import React, { useEffect, useRef } from 'react';

interface ModalDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  labelledBy?: string;
  ariaLabel?: string;
  maxWidth?: string;
  padding?: string;
  zIndex?: number;
  disableClose?: boolean;
  children: React.ReactNode;
  dialogStyle?: React.CSSProperties;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen = true,
  onClose,
  labelledBy,
  ariaLabel,
  maxWidth = '540px',
  padding = '28px',
  zIndex = 3500,
  disableClose = false,
  children,
  dialogStyle,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const disableCloseRef = useRef(disableClose);

  useEffect(() => {
    onCloseRef.current = onClose;
    disableCloseRef.current = disableClose;
  }, [onClose, disableClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialogEl = dialogRef.current;
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (dialogEl && !dialogEl.contains(document.activeElement)) {
      const firstInput = dialogEl.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
      );
      const firstFocusable = dialogEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = firstInput || firstFocusable || dialogEl;
      try {
        target.focus({ preventScroll: true });
      } catch {
        target.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current && !disableCloseRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusables.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevBodyOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isFlush = padding === '0' || padding === '0px';

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose && !disableClose) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        tabIndex={-1}
        className={`modal-dialog${isFlush ? ' modal-dialog-flush' : ''}`}
        style={{
          maxWidth,
          padding,
          ...dialogStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
};
