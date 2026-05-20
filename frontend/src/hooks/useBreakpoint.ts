import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const get = (): Breakpoint => {
    const w = window.innerWidth;
    if (w >= 1024) return 'desktop';
    if (w >= 768) return 'tablet';
    return 'mobile';
  };
  const [bp, setBp] = useState<Breakpoint>(get);
  useEffect(() => {
    const onResize = () => setBp(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}

export const useIsDesktop = () => useBreakpoint() === 'desktop';
export const useIsMobile  = () => useBreakpoint() === 'mobile';
