import { ReactNode, useEffect } from 'react';

export default function BottomSheet({
  open, onClose, title, children
}: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </>
  );
}
