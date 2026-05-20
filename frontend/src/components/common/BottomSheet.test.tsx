import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BottomSheet from './BottomSheet';

describe('BottomSheet (mobile primary modal)', () => {
  it('renders nothing when closed', () => {
    render(<BottomSheet open={false} onClose={() => {}} title="Hello">Body</BottomSheet>);
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
    expect(screen.queryByText('Body')).not.toBeInTheDocument();
  });

  it('renders title and body when open', () => {
    render(<BottomSheet open={true} onClose={() => {}} title="Thu tiền">
      <p>nội dung</p>
    </BottomSheet>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Thu tiền')).toBeInTheDocument();
    expect(screen.getByText('nội dung')).toBeInTheDocument();
  });

  it('locks body scroll when open', () => {
    render(<BottomSheet open={true} onClose={() => {}}>x</BottomSheet>);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('calls onClose when backdrop is tapped', async () => {
    const onClose = vi.fn();
    const { container } = render(<BottomSheet open={true} onClose={onClose}>x</BottomSheet>);
    const backdrop = container.querySelector('.sheet-backdrop')!;
    await userEvent.click(backdrop as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });
});
