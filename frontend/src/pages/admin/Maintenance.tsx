import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../../components/layout/AppBar';
import { PageHeader } from '../../components/layout/Shell';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useAuth } from '../../store/auth';
import { wipeTransactional, WipeResult } from '../../api/endpoints';

const CONFIRM_PHRASE = 'XOA TAT CA';

const WIPED_ITEMS = [
  { label: 'Buổi đánh + người tham gia', tables: ['BadmintonSession', 'BadmintonSessionParticipant'] },
  { label: 'Thu chi của buổi', tables: ['BadmintonTransaction'] },
  { label: 'Lịch sử áp dụng nhóm vào buổi', tables: ['BadmintonSessionGroup'] },
  { label: 'Lịch đặt sân', tables: ['CourtBooking'] },
  { label: 'Người chơi', tables: ['BadmintonPlayer'] },
  { label: 'Nhóm người chơi + thành viên', tables: ['BadmintonPlayerGroup', 'BadmintonPlayerGroupMember'] },
  { label: 'Quỹ — chuyển khoản (reset số dư về 0)', tables: ['BadmintonFundTransaction', 'BadmintonFund (reset balance)'] }
];

const KEPT_ITEMS = [
  'Tài khoản đăng nhập + quyền (Users, Roles)',
  'Danh sách sân (Court)',
  'Template thu tiền (PricingTemplate)',
  'Template chi phí (ExpenseTemplate)',
  'Cấu hình hệ thống (SystemConfiguration)',
  'Audit log (giữ nguyên để truy vết)'
];

export default function MaintenancePage() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const isAdmin = useAuth(s => s.isAdmin)();

  const [confirm, setConfirm] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WipeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <>
        {!desktop && <AppBar title="Bảo trì hệ thống" />}
        <div className="page">
          {desktop && <PageHeader title="Bảo trì hệ thống" />}
          <div className="card" style={{ background: '#fef2f2', border: '1px solid var(--c-danger)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--c-danger)' }}>🚫 Chỉ dành cho Admin</h3>
            <p>Tài khoản của bạn không có quyền truy cập tính năng này.</p>
            <button className="btn btn-ghost" onClick={() => nav(-1)}>← Quay lại</button>
          </div>
        </div>
      </>
    );
  }

  async function run() {
    if (confirm !== CONFIRM_PHRASE) {
      setError(`Phải gõ chính xác "${CONFIRM_PHRASE}" để xác nhận.`);
      return;
    }
    if (!window.confirm(`Bạn CHẮC CHẮN muốn xóa toàn bộ dữ liệu giao dịch?\n\nThao tác này KHÔNG THỂ HOÀN TÁC.`)) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await wipeTransactional(confirm, reason || undefined);
      setResult(r.data);
      setConfirm(''); setReason('');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Xóa thất bại.');
    } finally { setBusy(false); }
  }

  const danger: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fecaca' };

  const body = (
    <>
      {result && (
        <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <h3 style={{ marginTop: 0, color: 'var(--c-success)' }}>✅ Đã xóa thành công</h3>
          <p>Tổng số dòng đã xóa/reset: <b>{result.totalRowsDeleted}</b></p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            {Object.entries(result.counts).map(([k, v]) => (
              <li key={k}><code>{k}</code>: <b>{v}</b> dòng</li>
            ))}
          </ul>
          <p className="card-sub">Thực hiện lúc: {new Date(result.executedAt).toLocaleString('vi-VN')}</p>
        </div>
      )}

      <div className="card" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
        <h3 style={{ marginTop: 0 }}>⚠️ Cảnh báo</h3>
        <p>Tính năng này xóa <b>toàn bộ</b> dữ liệu giao dịch. Sau khi xóa <b>không thể hoàn tác</b>.</p>
        <p>Hãy export báo cáo CSV trước khi dùng nếu cần lưu trữ lịch sử.</p>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: desktop ? '1fr 1fr' : '1fr', marginBottom: 16 }}>
        <div className="card" style={danger}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--c-danger)' }}>Sẽ XOÁ</h4>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {WIPED_ITEMS.map((it, k) => (
              <li key={k}>
                {it.label}
                <span className="card-sub" style={{ fontSize: 11, marginLeft: 6 }}>
                  ({it.tables.join(', ')})
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--c-success)' }}>Giữ nguyên (master data)</h4>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {KEPT_ITEMS.map((it, k) => <li key={k}>{it}</li>)}
          </ul>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Xác nhận xóa</h4>
        <div className="form-field">
          <label>Gõ chính xác <code style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>{CONFIRM_PHRASE}</code> *</label>
          <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={CONFIRM_PHRASE}
            autoComplete="off" spellCheck={false} />
        </div>
        <div className="form-field">
          <label>Lý do (ghi vào audit log)</label>
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="VD: reset đầu mùa, dữ liệu test, ..." />
        </div>
        {error && <p style={{ color: 'var(--c-danger)' }}>⚠️ {error}</p>}
        <button className="btn full" disabled={busy || confirm !== CONFIRM_PHRASE}
          style={{ background: 'var(--c-danger)' }} onClick={run}>
          {busy ? 'Đang xóa…' : '🗑️ Xóa toàn bộ dữ liệu giao dịch'}
        </button>
      </div>
    </>
  );

  return (
    <>
      {!desktop && <AppBar title="Bảo trì hệ thống" />}
      <div className="page">
        {desktop && (
          <PageHeader title="Bảo trì hệ thống" subtitle="Xóa toàn bộ dữ liệu giao dịch — chỉ dành cho Admin"
            actions={<button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>← Quay lại</button>} />
        )}
        {body}
      </div>
    </>
  );
}
