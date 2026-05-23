import { useEffect, useState } from 'react';

export type ToastType = 'error' | 'info' | 'success' | 'warning';

interface ToastEvent {
  id: number;
  type: ToastType;
  text: string;
}

let nextId = 1;

export function showToast(type: ToastType, text: string) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { type, text } }));
}

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent<{ type?: ToastType; text?: string }>;
      const text = ce.detail?.text;
      if (!text) return;
      const type: ToastType = ce.detail?.type || 'info';
      const id = nextId++;
      setToasts(t => [...t, { id, type, text }]);
      window.setTimeout(() => {
        setToasts(t => t.filter(x => x.id !== id));
      }, 3000);
    }
    window.addEventListener('app:toast', onToast as EventListener);
    return () => window.removeEventListener('app:toast', onToast as EventListener);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 32px)'
      }}
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            pointerEvents: 'auto',
            padding: '10px 14px',
            borderRadius: 8,
            color: 'white',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            background:
              t.type === 'error' ? '#dc2626' :
              t.type === 'success' ? '#16a34a' :
              t.type === 'warning' ? '#d97706' :
              '#2563eb',
            maxWidth: 360,
            wordBreak: 'break-word'
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
