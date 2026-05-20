import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBreakpoint, useIsDesktop, useIsMobile } from './useBreakpoint';

function setWidth(w: number) {
  (window as any).innerWidth = w;
  window.dispatchEvent(new Event('resize'));
}

describe('useBreakpoint', () => {
  it('returns mobile for narrow widths', () => {
    setWidth(360);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('mobile');
  });

  it('returns tablet between 768 and 1023', () => {
    setWidth(900);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('tablet');
  });

  it('returns desktop at 1024+', () => {
    setWidth(1440);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('desktop');
  });

  it('updates on resize', () => {
    setWidth(360);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('mobile');
    act(() => setWidth(1440));
    expect(result.current).toBe('desktop');
  });

  it('useIsDesktop matches', () => {
    setWidth(1200);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('useIsMobile matches', () => {
    setWidth(360);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});
