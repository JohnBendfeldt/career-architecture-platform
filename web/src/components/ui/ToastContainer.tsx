import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  tone?: 'success' | 'info' | 'error';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-stack"
      aria-live="polite"
      aria-atomic="false"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const tone = toast.tone ?? 'info';
        const Icon =
          tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertTriangle : Info;
        const iconColor =
          tone === 'success'
            ? 'var(--status-success)'
            : tone === 'error'
              ? 'var(--status-danger)'
              : 'var(--accent-crimson)';

        return (
          <div
            key={toast.id}
            role={tone === 'error' ? 'alert' : 'status'}
            className={`toast-item toast-${tone}`}
          >
            <Icon size={16} aria-hidden="true" style={{ color: iconColor, flexShrink: 0 }} />
            <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.4, flex: 1 }}>
              {toast.message}
            </span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="icon-btn"
              aria-label="Dismiss notification"
              style={{ minWidth: '28px', minHeight: '28px', padding: '4px' }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
