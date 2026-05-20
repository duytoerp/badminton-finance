import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentBadge, SessionStatusBadge } from './StatusBadge';

describe('PaymentBadge', () => {
  it.each([
    ['Unpaid', 'Chưa trả', 'unpaid'],
    ['PartialPaid', 'Trả thiếu', 'partial'],
    ['Paid', 'Đã trả', 'paid'],
    ['OverPaid', 'Trả dư', 'over']
  ] as const)('renders %s as "%s" with class %s', (status, label, cls) => {
    render(<PaymentBadge status={status} />);
    const el = screen.getByText(label);
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('badge', cls);
  });
});

describe('SessionStatusBadge', () => {
  it.each([
    ['Draft', 'Nháp'],
    ['Open', 'Đang mở'],
    ['Closed', 'Đã chốt'],
    ['Cancelled', 'Hủy']
  ] as const)('renders %s as "%s"', (status, label) => {
    render(<SessionStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
