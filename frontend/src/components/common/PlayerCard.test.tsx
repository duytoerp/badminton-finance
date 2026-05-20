import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PlayerCard from './PlayerCard';
import type { Player } from '../../api/endpoints';

const basePlayer: Player = {
  id: 'p1', fullName: 'Nguyễn Văn A', phoneNumber: '0901234567',
  playerType: 'Guest', isActive: true, currentDebt: 0
};

describe('PlayerCard (mobile card)', () => {
  it('renders name and phone', () => {
    render(<PlayerCard player={basePlayer} />);
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText(/0901234567/)).toBeInTheDocument();
  });

  it('shows "Sạch nợ" when debt is zero', () => {
    render(<PlayerCard player={basePlayer} />);
    expect(screen.getByText(/Sạch nợ/i)).toBeInTheDocument();
  });

  it('shows debt amount when debt > 0', () => {
    render(<PlayerCard player={{ ...basePlayer, currentDebt: 150_000 }} />);
    expect(screen.getByText(/Nợ 150\.000đ/)).toBeInTheDocument();
  });

  it('renders "Chưa có SĐT" when phone missing', () => {
    render(<PlayerCard player={{ ...basePlayer, phoneNumber: undefined }} />);
    expect(screen.getByText(/Chưa có SĐT/)).toBeInTheDocument();
  });

  it('shows player type label "Vãng lai" for Guest', () => {
    render(<PlayerCard player={basePlayer} />);
    expect(screen.getByText(/Vãng lai/)).toBeInTheDocument();
  });

  it('shows "Thành viên" for Member', () => {
    render(<PlayerCard player={{ ...basePlayer, playerType: 'Member' }} />);
    expect(screen.getByText(/Thành viên/)).toBeInTheDocument();
  });

  it('invokes onClick when tapped (mobile primary action)', async () => {
    const onClick = vi.fn();
    render(<PlayerCard player={basePlayer} onClick={onClick} />);
    await userEvent.click(screen.getByText('Nguyễn Văn A'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
