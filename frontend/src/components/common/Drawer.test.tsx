import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Drawer from './Drawer';

describe('Drawer (desktop side panel)', () => {
  it('hidden when closed', () => {
    render(<Drawer open={false} onClose={() => {}} title="x">y</Drawer>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title and children when open', () => {
    render(<Drawer open={true} onClose={() => {}} title="Tạo sân">
      <p>form</p>
    </Drawer>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Tạo sân')).toBeInTheDocument();
    expect(screen.getByText('form')).toBeInTheDocument();
  });

  it('closes when backdrop clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(<Drawer open={true} onClose={onClose}>x</Drawer>);
    await userEvent.click(container.querySelector('.drawer-backdrop') as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });
});
