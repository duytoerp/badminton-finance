import { PaymentStatus, SessionStatus } from '../../api/endpoints';

const paymentMap: Record<PaymentStatus, { label: string; cls: string }> = {
  Unpaid: { label: 'Chưa trả', cls: 'unpaid' },
  PartialPaid: { label: 'Trả thiếu', cls: 'partial' },
  Paid: { label: 'Đã trả', cls: 'paid' },
  OverPaid: { label: 'Trả dư', cls: 'over' }
};
const sessionMap: Record<SessionStatus, { label: string; cls: string }> = {
  Draft: { label: 'Nháp', cls: 'draft' },
  Open: { label: 'Đang mở', cls: 'open' },
  Closed: { label: 'Đã chốt', cls: 'closed' },
  Cancelled: { label: 'Hủy', cls: 'closed' }
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const m = paymentMap[status];
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}
export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const m = sessionMap[status];
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}
