import { ReactNode } from 'react';
import BottomSheet from './BottomSheet';
import Drawer from './Drawer';
import { useIsDesktop } from '../../hooks/useBreakpoint';

export default function ResponsiveSheet({
  open, onClose, title, children
}: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const desktop = useIsDesktop();
  return desktop
    ? <Drawer open={open} onClose={onClose} title={title}>{children}</Drawer>
    : <BottomSheet open={open} onClose={onClose} title={title}>{children}</BottomSheet>;
}
