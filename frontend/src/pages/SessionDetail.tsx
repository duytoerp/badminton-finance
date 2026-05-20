import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import ResponsiveSheet from '../components/common/ResponsiveSheet';
import { PaymentBadge, SessionStatusBadge } from '../components/common/StatusBadge';
import DataTable, { Column } from '../components/common/DataTable';
import { useIsDesktop } from '../hooks/useBreakpoint';
import {
  addExpense, addGroupsToSession, addParticipant, addParticipantsBulk,
  cancelSession, closeSession,
  getSession, listPlayerGroups, listPlayers, previewAddGroupsToSession,
  GROUP_TYPE_LABEL, GROUP_TYPE_BADGE_CLS,
  Participant, PlayerGroup, PreviewAddGroupsResult, PreviewGroupPlayer,
  quickPayment, reopenSession, removeParticipant,
  SessionDetail as TSession, Player, TransactionDto
} from '../api/endpoints';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';
const modeLabel = (m?: string) =>
  m === 'FixedAmount' ? 'Cố định'
  : m === 'EqualPerHead' ? 'Chia đều'
  : 'Tỷ lệ';
type Tab = 'overview' | 'players' | 'transactions' | 'payments' | 'debts' | 'history';

export default function SessionDetail() {
  const { id } = useParams();
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [data, setData] = useState<TSession | null>(null);
  const [warn, setWarn] = useState<string[]>([]);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [paySheet, setPaySheet] = useState<Participant | null>(null);
  const [addSheet, setAddSheet] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  async function load() {
    if (!id) return;
    const r = await getSession(id);
    setData(r.data);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!data) return <><AppBar title="Buổi đánh" /><div className="page">Đang tải…</div></>;

  const closed = data.status === 'Closed';
  const cancelled = data.status === 'Cancelled';
  const locked = closed || cancelled;
  const debts = data.participants.filter(p => p.debt > 0);

  // ============= Desktop =============
  if (desktop) {
    return (
      <div className="page">
        <PageHeader title={data.title}
          subtitle={`${new Date(data.playDate).toLocaleDateString('vi-VN')} · ${data.courtName} · ${data.startTime.slice(0,5)}–${data.endTime.slice(0,5)}${data.pricingTemplateName ? ` · ${data.pricingTemplateName} (${modeLabel(data.pricingMode)})` : ''}`}
          actions={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>← Quay lại</button>
              <SessionStatusBadge status={data.status} />
              {!locked && <button className="btn" onClick={async () => {
                try { await closeSession(data.id); await load(); }
                catch (e: any) { alert(e?.response?.data?.message || 'Không thể chốt buổi'); }
              }}>🔒 Chốt buổi</button>}
              {closed && <button className="btn btn-ghost" onClick={async () => {
                const reason = prompt('Lý do mở lại?'); if (!reason || reason.length < 5) return;
                await reopenSession(data.id, reason); await load();
              }}>🔓 Mở lại</button>}
              {!locked && <button className="btn" style={{ background: 'var(--c-danger)' }} onClick={async () => {
                const reason = prompt('Lý do hủy?'); if (!reason || reason.length < 3) return;
                await cancelSession(data.id, reason); await load();
              }}>Hủy buổi</button>}
            </>
          } />

        {warn.length > 0 && (
          <div className="panel" style={{ background: '#fef3c7', marginBottom: 16 }}>
            {warn.map((w, i) => <div key={i}>⚠️ {w}</div>)}
          </div>
        )}

        <div className="kpi-grid">
          <div className="kpi success"><div className="label">Tổng thu</div><div className="value">{fmt(data.totalIncome)}</div></div>
          <div className="kpi danger"><div className="label">Tổng chi</div><div className="value">{fmt(data.totalExpense)}</div></div>
          <div className="kpi"><div className="label">Số dư</div><div className="value">{fmt(data.balance)}</div></div>
          <div className="kpi primary">
            <div className="label">
              {data.pricingMode === 'EqualPerHead' ? 'Mỗi người'
                : data.pricingMode === 'FixedAmount' ? 'Chế độ' : 'Phí/slot'}
            </div>
            <div className="value">
              {data.pricingMode === 'FixedAmount' ? 'Cố định' : fmt(data.feePerSlot)}
            </div>
          </div>
          <div className="kpi"><div className="label">Tổng suất</div><div className="value">{data.totalSlots}</div></div>
          <div className="kpi"><div className="label">Người chơi</div><div className="value">{data.participants.length}</div></div>
        </div>

        <div className="tabs">
          {([
            ['overview', 'Tổng quan'],
            ['players', `Người chơi (${data.participants.length})`],
            ['transactions', `Thu chi (${data.transactions.length})`],
            ['payments', 'Thanh toán'],
            ['debts', `Công nợ (${debts.length})`],
            ['history', 'Lịch sử thay đổi']
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="panel">
            <p><b>Ngày:</b> {new Date(data.playDate).toLocaleDateString('vi-VN')}</p>
            <p><b>Sân:</b> {data.courtName}</p>
            <p><b>Số sân:</b> {data.courtCount}</p>
            <p><b>Khung giờ:</b> {data.startTime} – {data.endTime}</p>
            <p><b>Ghi chú:</b> {data.note || '—'}</p>
          </div>
        )}

        {tab === 'players' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <button className="btn" disabled={locked} onClick={() => setAddSheet(true)}>+ Thêm người chơi</button>
            </div>
            <DataTable
              columns={[
                { key: 'name', header: 'Tên', accessor: r => r.playerName,
                  render: r => <><b>{r.playerName}</b>{r.isGuest && <span className="card-sub"> (vãng lai)</span>}</> },
                { key: 'group', header: 'Vào qua',
                  accessor: r => r.joinedViaGroupName || '',
                  render: r => r.joinedViaGroupName
                    ? <span className={'badge ' + (r.joinedViaGroupType ? GROUP_TYPE_BADGE_CLS[r.joinedViaGroupType] : 'draft')}
                        title={r.joinedViaGroupType ? GROUP_TYPE_LABEL[r.joinedViaGroupType] : ''}>
                        {r.joinedViaGroupName}
                      </span>
                    : <span className="card-sub">Cá nhân</span> },
                { key: 'phone', header: 'SĐT', accessor: r => r.playerPhone || '' },
                { key: 'slots', header: 'Suất', className: 'num', accessor: r => r.slotCount },
                { key: 'mult',
                  header: data.pricingMode === 'FixedAmount' ? 'Tiền/slot'
                        : data.pricingMode === 'EqualPerHead' ? 'Chia đều' : 'Hệ số',
                  className: 'num',
                  accessor: r => data.pricingMode === 'FixedAmount' ? r.fixedAmount : r.multiplier,
                  render: r =>
                    data.pricingMode === 'EqualPerHead' ? '—'
                    : data.pricingMode === 'FixedAmount' ? fmt(r.fixedAmount)
                    : (r.multiplier === 1 ? '—' : `× ${r.multiplier}`) },
                { key: 'due', header: 'Phải trả', className: 'num', accessor: r => r.amountDue, render: r => fmt(r.amountDue) },
                { key: 'paid', header: 'Đã trả', className: 'num', accessor: r => r.amountPaid, render: r => fmt(r.amountPaid) },
                { key: 'debt', header: 'Còn', className: 'num', accessor: r => r.debt,
                  render: r => r.debt > 0 ? <b style={{ color: 'var(--c-danger)' }}>{fmt(r.debt)}</b> : '—' },
                { key: 'status', header: 'Trạng thái', render: r => <PaymentBadge status={r.paymentStatus} /> },
                { key: 'act', header: '', className: 'actions',
                  render: r => (
                    <>
                      <button className="btn btn-sm" onClick={() => setPaySheet(r)}>Thu</button>
                      {!locked && r.amountPaid === 0 && (
                        <button className="btn btn-sm btn-ghost" onClick={async () => {
                          if (confirm('Xóa người chơi này?')) { await removeParticipant(r.id); await load(); }
                        }}>Xóa</button>
                      )}
                    </>
                  )}
              ] as Column<Participant>[]}
              rows={data.participants} rowKey={r => r.id}
            />
          </>
        )}

        {tab === 'transactions' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <button className="btn" disabled={locked} onClick={() => setExpenseOpen(true)}>+ Chi phí</button>
            </div>
            <DataTable
              columns={[
                { key: 'date', header: 'Thời điểm', accessor: r => r.transactionDate,
                  render: r => new Date(r.transactionDate).toLocaleString('vi-VN') },
                { key: 'type', header: 'Loại', accessor: r => r.transactionType,
                  render: r => r.transactionType === 'Income'
                    ? <span style={{ color: 'var(--c-success)' }}>Thu</span>
                    : <span style={{ color: 'var(--c-danger)' }}>Chi</span> },
                { key: 'desc', header: 'Mô tả', accessor: r => r.description },
                { key: 'player', header: 'Người', accessor: r => r.playerName || '' },
                { key: 'method', header: 'PT', accessor: r => r.paymentMethod },
                { key: 'amount', header: 'Số tiền', className: 'num', accessor: r => r.amount,
                  render: r => <b>{fmt(r.amount)}</b> }
              ] as Column<TransactionDto>[]}
              rows={data.transactions} rowKey={r => r.id}
            />
          </>
        )}

        {tab === 'payments' && (
          <div className="panel">
            <p className="card-sub">Bấm nút <b>Thu</b> trên dòng người chơi để ghi nhận thanh toán nhanh.</p>
            {data.participants.filter(p => p.amountPaid > 0).map(p => (
              <div key={p.id} className="card-row" style={{ padding: 8, borderBottom: '1px solid var(--c-border)' }}>
                <div>
                  <b>{p.playerName}</b>
                  <div className="card-sub">{fmt(p.amountPaid)} / {fmt(p.amountDue)}</div>
                </div>
                <PaymentBadge status={p.paymentStatus} />
              </div>
            ))}
            {data.participants.every(p => p.amountPaid === 0) && <p>Chưa có thanh toán nào.</p>}
          </div>
        )}

        {tab === 'debts' && (
          debts.length === 0
            ? <div className="panel">🎉 Không còn ai nợ.</div>
            : <DataTable
                columns={[
                  { key: 'name', header: 'Tên', accessor: r => r.playerName, render: r => <b>{r.playerName}</b> },
                  { key: 'phone', header: 'SĐT', accessor: r => r.playerPhone || '' },
                  { key: 'due', header: 'Phải trả', className: 'num', accessor: r => r.amountDue, render: r => fmt(r.amountDue) },
                  { key: 'paid', header: 'Đã trả', className: 'num', accessor: r => r.amountPaid, render: r => fmt(r.amountPaid) },
                  { key: 'debt', header: 'Còn nợ', className: 'num', accessor: r => r.debt,
                    render: r => <b style={{ color: 'var(--c-danger)' }}>{fmt(r.debt)}</b> },
                  { key: 'act', header: '', className: 'actions',
                    render: r => <button className="btn btn-sm" onClick={() => setPaySheet(r)}>Thu nợ</button> }
                ] as Column<Participant>[]}
                rows={debts} rowKey={r => r.id} />
        )}

        {tab === 'history' && (
          <div className="panel">
            <p className="card-sub">Xem audit log toàn hệ thống tại <a onClick={() => nav('/admin/audit')} style={{ color: 'var(--c-primary)', cursor: 'pointer' }}>Quản trị → Audit log</a>.</p>
            <p>Số lần mở lại: <b>{(data as any).reopenCount || 0}</b></p>
            {(data as any).reopenReason && <p>Lý do mở lại lần gần nhất: {(data as any).reopenReason}</p>}
          </div>
        )}

        <ExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} sessionId={data.id} onDone={load} />
        <PaymentSheet participant={paySheet} onClose={() => setPaySheet(null)} onDone={(w: string[]) => { setWarn(w); load(); }} />
        <AddParticipantSheet open={addSheet} onClose={() => setAddSheet(false)} sessionId={data.id} onDone={(w: string[]) => { setWarn(w); load(); }} />
      </div>
    );
  }

  // ============= Mobile =============
  return (
    <>
      <AppBar title={data.title} />
      <div className="page">
        <div className="card">
          <div className="card-row">
            <div>
              <div className="card-sub">{new Date(data.playDate).toLocaleDateString('vi-VN')} · {data.courtName}</div>
              <div className="card-title">Phí/slot: {fmt(data.feePerSlot)}</div>
            </div>
            <SessionStatusBadge status={data.status} />
          </div>
          <div className="card-row" style={{ marginTop: 8 }}>
            <div className="card-sub">Thu: <b style={{ color: 'var(--c-success)' }}>{fmt(data.totalIncome)}</b></div>
            <div className="card-sub">Chi: <b style={{ color: 'var(--c-danger)' }}>{fmt(data.totalExpense)}</b></div>
            <div className="card-sub">Dư: <b>{fmt(data.balance)}</b></div>
          </div>
        </div>

        {warn.length > 0 && (
          <div className="card" style={{ background: '#fef3c7' }}>
            {warn.map((w, i) => <div key={i}>⚠️ {w}</div>)}
          </div>
        )}

        <div className="btn-row">
          <button className="btn secondary" disabled={locked} onClick={() => setExpenseOpen(true)}>+ Chi phí</button>
          <button className="btn secondary" disabled={locked} onClick={() => setAddSheet(true)}>+ Người chơi</button>
        </div>

        <h3 style={{ marginTop: 16 }}>Người tham gia ({data.participants.length})</h3>
        {data.participants.map(p => (
          <div key={p.id} className="card">
            <div className="card-row">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {p.playerName}
                  {p.joinedViaGroupName && (
                    <span className={'badge ' + (p.joinedViaGroupType ? GROUP_TYPE_BADGE_CLS[p.joinedViaGroupType] : 'draft')}
                      style={{ fontSize: 10 }}
                      title={p.joinedViaGroupType ? GROUP_TYPE_LABEL[p.joinedViaGroupType] : ''}>
                      {p.joinedViaGroupName}
                    </span>
                  )}
                </div>
                <div className="card-sub">
                  {p.slotCount} suất
                  {data.pricingMode === 'WeightedSlot' && p.multiplier !== 1 &&
                    <span style={{ color: 'var(--c-primary)' }}> · × {p.multiplier}</span>}
                  {data.pricingMode === 'FixedAmount' && p.fixedAmount > 0 &&
                    <span style={{ color: 'var(--c-primary)' }}> · {fmt(p.fixedAmount)}/slot</span>}
                  {data.pricingMode === 'EqualPerHead' &&
                    <span style={{ color: 'var(--c-primary)' }}> · chia đều</span>}
                  {' · '}{fmt(p.amountDue)} / đã trả {fmt(p.amountPaid)}
                </div>
                {p.debt > 0 && <div style={{ color: 'var(--c-danger)', fontWeight: 600 }}>Còn: {fmt(p.debt)}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <PaymentBadge status={p.paymentStatus} />
                <button className="btn" style={{ minHeight: 36, padding: '0 14px' }} onClick={() => setPaySheet(p)}>Thu</button>
                {!locked && p.amountPaid === 0 && (
                  <button className="btn secondary" style={{ minHeight: 30, padding: '0 10px', fontSize: 12 }}
                    onClick={async () => { if (confirm('Xóa người chơi này?')) { await removeParticipant(p.id); await load(); }}}>
                    Xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 24 }}>
          {!locked && (
            <button className="btn full" onClick={async () => {
              try { await closeSession(data.id); await load(); }
              catch (e: any) { alert(e?.response?.data?.message || 'Không thể chốt buổi'); }
            }}>🔒 Chốt buổi</button>
          )}
          {closed && (
            <button className="btn secondary full" onClick={async () => {
              const reason = prompt('Lý do mở lại?'); if (!reason || reason.length < 5) return;
              await reopenSession(data.id, reason); await load();
            }}>🔓 Mở lại buổi</button>
          )}
        </div>
      </div>

      <ExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} sessionId={data.id} onDone={load} />
      <PaymentSheet participant={paySheet} onClose={() => setPaySheet(null)} onDone={(w: string[]) => { setWarn(w); load(); }} />
      <AddParticipantSheet open={addSheet} onClose={() => setAddSheet(false)} sessionId={data.id} onDone={(w: string[]) => { setWarn(w); load(); }} />
    </>
  );
}

function ExpenseSheet({ open, onClose, sessionId, onDone }: any) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('Tiền sân');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await addExpense(sessionId, Number(amount), desc); setAmount(''); setDesc('Tiền sân'); onClose(); onDone(); }
    finally { setBusy(false); }
  }
  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Thêm chi phí">
      <div className="form-field"><label>Số tiền (đ)</label>
        <input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} autoFocus /></div>
      <div className="form-field"><label>Mô tả</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <button className="btn full" disabled={busy || !amount} onClick={save}>Lưu</button>
    </ResponsiveSheet>
  );
}

function PaymentSheet({ participant, onClose, onDone }: {
  participant: Participant | null; onClose: () => void; onDone: (w: string[]) => void;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setAmount(participant ? String(Math.max(0, participant.debt)) : ''); }, [participant]);
  if (!participant) return null;
  async function save() {
    setBusy(true);
    try {
      const r = await quickPayment(participant!.sessionId, participant!.playerId, Number(amount), method);
      onClose(); onDone(r.warnings || []);
    } finally { setBusy(false); }
  }
  const quick = [50000, 100000, participant.debt].filter(x => x > 0);
  return (
    <ResponsiveSheet open={!!participant} onClose={onClose} title={`Thu tiền: ${participant.playerName}`}>
      <p className="card-sub">Còn nợ: <b>{fmt(participant.debt)}</b></p>
      <div className="form-field"><label>Số tiền (đ)</label>
        <input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} autoFocus /></div>
      <div className="btn-row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {quick.map(q => (
          <button key={q} className="btn secondary btn-sm" onClick={() => setAmount(String(q))}>{fmt(q)}</button>
        ))}
      </div>
      <div className="form-field"><label>Phương thức</label>
        <select value={method} onChange={e => setMethod(e.target.value)}>
          <option value="Cash">Tiền mặt</option>
          <option value="BankTransfer">Chuyển khoản</option>
          <option value="Momo">Momo</option>
          <option value="ZaloPay">ZaloPay</option>
          <option value="Other">Khác</option>
        </select>
      </div>
      <button className="btn full" disabled={busy || !amount} onClick={save}>Xác nhận thu</button>
    </ResponsiveSheet>
  );
}

function AddParticipantSheet({ open, onClose, sessionId, onDone }: {
  open: boolean; onClose: () => void; sessionId: string; onDone: (warnings: string[]) => void;
}) {
  const [tab, setTab] = useState<'single' | 'groups'>('single');
  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Thêm vào buổi">
      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={tab === 'single' ? 'active' : ''} onClick={() => setTab('single')}>Thêm cá nhân</button>
        <button className={tab === 'groups' ? 'active' : ''} onClick={() => setTab('groups')}>Thêm theo nhóm</button>
      </div>
      {tab === 'single'
        ? <SingleAddPanel sessionId={sessionId} onClose={onClose} onDone={onDone} />
        : <GroupAddPanel sessionId={sessionId} onClose={onClose} onDone={onDone} />}
    </ResponsiveSheet>
  );
}

const GENDER_LABEL: Record<string, { label: string; cls: string }> = {
  Male: { label: 'Nam', cls: 'male' },
  Female: { label: 'Nữ', cls: 'female' },
  Other: { label: 'Khác', cls: 'other' }
};
const SKILL_LABEL: Record<string, { label: string; cls: string }> = {
  Beginner: { label: 'Yếu', cls: 'skill-beginner' },
  Intermediate: { label: 'TB', cls: 'skill-intermediate' },
  Advanced: { label: 'Khá', cls: 'skill-advanced' }
};

function SingleAddPanel({ sessionId, onClose, onDone }: {
  sessionId: string; onClose: () => void; onDone: (warnings: string[]) => void;
}) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listPlayers(search).then(r => setPlayers(r.data.items));
  }, [search]);

  function toggle(id: string) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  }

  function selectAllVisible() {
    const active = players.filter(p => p.isActive).map(p => p.id);
    setSelected(new Set(active));
  }
  function clearAll() { setSelected(new Set()); }

  async function confirm() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      if (selected.size === 1) {
        const id = Array.from(selected)[0];
        const r = await addParticipant(sessionId, id, 1);
        onClose(); onDone(r.warnings || []);
      } else {
        const r = await addParticipantsBulk(sessionId, Array.from(selected), { slotCount: 1 });
        const warnings = r.warnings || [];
        warnings.unshift(`Đã thêm ${r.data.added} người${r.data.skippedDuplicate > 0 ? `, bỏ qua trùng ${r.data.skippedDuplicate}` : ''}.`);
        onClose(); onDone(warnings);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Thêm người chơi thất bại.');
    } finally { setBusy(false); }
  }

  const debtCount = players.filter(p => selected.has(p.id) && p.currentDebt > 0).length;

  return (
    <>
      <input placeholder="Tìm tên / SĐT" value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--c-border)', fontSize: 16, marginBottom: 8 }} />

      <div className="card-row" style={{ marginBottom: 10, fontSize: 13 }}>
        <div>
          Đã chọn: <b style={{ color: 'var(--c-primary)' }}>{selected.size}</b> / {players.length}
          {debtCount > 0 && <span style={{ color: 'var(--c-warn)', marginLeft: 8 }}>⚠ {debtCount} người nợ</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-ghost" onClick={selectAllVisible}>Chọn tất cả</button>
          {selected.size > 0 && <button className="btn btn-sm btn-ghost" onClick={clearAll}>Bỏ chọn</button>}
        </div>
      </div>

      <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', paddingRight: 4 }}>
        {players.length === 0 && <p className="card-sub">Không có người chơi.</p>}
        {players.map(p => {
          const isSel = selected.has(p.id);
          const g = p.gender ? GENDER_LABEL[p.gender] : null;
          const s = p.skillLevel ? SKILL_LABEL[p.skillLevel] : null;
          return (
            <label key={p.id} className={'player-pick' + (isSel ? ' selected' : '')}>
              <input type="checkbox" checked={isSel} onChange={() => toggle(p.id)} />
              <div className="pp-main">
                <div className="pp-title">
                  {p.fullName}
                  {p.nickName && <span className="pp-sub" style={{ marginLeft: 6 }}>({p.nickName})</span>}
                  {!p.isActive && <span className="badge inactive" style={{ marginLeft: 6 }}>Ngưng</span>}
                </div>
                <div className="pp-sub">{p.phoneNumber || 'Không SĐT'}</div>
                <div className="pp-tags">
                  {g && <span className={'badge ' + g.cls}>{g.label}</span>}
                  {s && <span className={'badge ' + s.cls}>{s.label}</span>}
                  <span className={'badge ' + (p.playerType === 'Member' ? 'paid' : 'draft')}>
                    {p.playerType === 'Member' ? 'Thành viên' : 'Vãng lai'}
                  </span>
                </div>
              </div>
              <div className="pp-right">
                {p.currentDebt > 0 && <span className="badge unpaid">Nợ {fmt(p.currentDebt)}</span>}
              </div>
            </label>
          );
        })}
      </div>

      <button className="btn full" disabled={busy || selected.size === 0} onClick={confirm} style={{ marginTop: 12 }}>
        {busy ? 'Đang thêm…' : selected.size <= 1 ? 'Thêm vào buổi' : `Thêm ${selected.size} người`}
      </button>
    </>
  );
}

function GroupAddPanel({ sessionId, onClose, onDone }: {
  sessionId: string; onClose: () => void; onDone: (warnings: string[]) => void;
}) {
  type Step = 'pick' | 'review';
  const [step, setStep] = useState<Step>('pick');
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<PreviewAddGroupsResult | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [skipIds, setSkipIds] = useState<Set<string>>(new Set());

  useEffect(() => { listPlayerGroups().then(r => setGroups(r.data.items)); }, []);

  function toggleGroup(id: string) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  }

  async function goReview() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const r = await previewAddGroupsToSession(sessionId, Array.from(selected), includeInactive);
      setPreview(r.data);
      setSkipIds(new Set());
      setStep('review');
    } finally { setBusy(false); }
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    try {
      const eligibleIds = preview.playersToAdd.map(p => p.playerId);
      const selectedIds = eligibleIds.filter(id => !skipIds.has(id));
      if (selectedIds.length === 0) {
        alert('Chưa chọn người nào để thêm.');
        return;
      }
      const r = await addGroupsToSession(sessionId, Array.from(selected), {
        includeInactive, slotCount: 1,
        // Only pass selectedPlayerIds if some are skipped — empty means "add all eligible"
        selectedPlayerIds: skipIds.size > 0 ? selectedIds : []
      });
      const warnings = r.warnings || [];
      warnings.unshift(`Đã thêm ${r.data.added} người. Bỏ qua: trùng ${r.data.skippedDuplicate}, inactive ${r.data.skippedInactive}.`);
      onClose(); onDone(warnings);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Thêm nhóm thất bại.');
    } finally { setBusy(false); }
  }

  function togglePlayerSkip(id: string) {
    const n = new Set(skipIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSkipIds(n);
  }

  if (step === 'pick') {
    return (
      <>
        <p className="card-sub">Chọn nhóm cần thêm vào buổi.</p>
        <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input id="incl-inactive" type="checkbox" checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)} />
          <label htmlFor="incl-inactive" style={{ margin: 0 }}>Bao gồm cả người không hoạt động</label>
        </div>
        {groups.length === 0 && (
          <p className="card-sub">Chưa có nhóm nào. Tạo nhóm tại menu Nhóm người chơi.</p>
        )}
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {groups.map(g => (
            <label key={g.id} className="card" style={{ cursor: 'pointer', display: 'block' }}>
              <div className="card-row">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggleGroup(g.id)} />
                  {g.color && <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: g.color, border: '1px solid var(--c-border)'
                  }} />}
                  <div>
                    <div className="card-title">{g.name}</div>
                    <div className="card-sub">{g.description || '—'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{g.memberCount}</div>
                  <div className="card-sub" style={{ fontSize: 11 }}>người</div>
                </div>
              </div>
            </label>
          ))}
        </div>
        <button className="btn full" disabled={busy || selected.size === 0} onClick={goReview}>
          Xem trước ({selected.size})
        </button>
      </>
    );
  }

  // ========== review ==========
  if (!preview) return <p>Đang tải…</p>;

  const finalCount = preview.playersToAdd.length - skipIds.size;

  return (
    <>
      <div className="card">
        <div className="card-row">
          <div><div className="card-title">{preview.uniquePlayers}</div><div className="card-sub">Tổng người (lọc trùng)</div></div>
          <div><div className="card-title" style={{ color: 'var(--c-success)' }}>{preview.newToAdd}</div><div className="card-sub">Sẽ thêm</div></div>
          <div><div className="card-title">{preview.alreadyInSession}</div><div className="card-sub">Đã trong buổi</div></div>
          {preview.inactiveSkipped > 0 && (
            <div><div className="card-title">{preview.inactiveSkipped}</div><div className="card-sub">Inactive (bỏ qua)</div></div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer', padding: 0, fontSize: 14 }} onClick={() => setStep('pick')}>← Đổi nhóm</button>
      </div>

      <h4 style={{ marginTop: 8 }}>Sẽ thêm ({finalCount}/{preview.playersToAdd.length}):</h4>
      <p className="card-sub" style={{ fontSize: 12 }}>Bỏ chọn người không muốn thêm.</p>
      <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
        {preview.playersToAdd.map(p => (
          <PreviewRow key={p.playerId} p={p} checked={!skipIds.has(p.playerId)}
            onToggle={() => togglePlayerSkip(p.playerId)} />
        ))}
        {preview.playersToAdd.length === 0 && <p className="card-sub">Không có người nào để thêm.</p>}
      </div>

      {preview.debtPlayers.length > 0 && (
        <div className="panel" style={{ background: '#fef3c7', marginBottom: 12, padding: 10, borderRadius: 8 }}>
          ⚠️ Có {preview.debtPlayers.length} người còn nợ — vẫn thêm vào nhưng nên kiểm tra:
          <ul style={{ margin: '4px 0 0 0', paddingLeft: 20 }}>
            {preview.debtPlayers.map(p => (
              <li key={p.playerId}>{p.fullName} — nợ <b>{fmt(p.currentDebt)}</b></li>
            ))}
          </ul>
        </div>
      )}

      {preview.inactivePlayers.length > 0 && !includeInactive && (
        <div className="panel" style={{ background: '#fee2e2', marginBottom: 12, padding: 10, borderRadius: 8 }}>
          🚫 Bỏ qua {preview.inactivePlayers.length} người inactive:
          {' '}{preview.inactivePlayers.map(p => p.fullName).join(', ')}
          <div style={{ marginTop: 6 }}>
            <button style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer', padding: 0, fontSize: 14 }} onClick={async () => {
              setIncludeInactive(true);
              setBusy(true);
              try {
                const r = await previewAddGroupsToSession(sessionId, Array.from(selected), true);
                setPreview(r.data); setSkipIds(new Set());
              } finally { setBusy(false); }
            }}>Bao gồm cả người inactive →</button>
          </div>
        </div>
      )}

      {preview.alreadyPlayers.length > 0 && (
        <div className="card-sub" style={{ fontSize: 12, marginBottom: 8 }}>
          Đã có trong buổi: {preview.alreadyPlayers.map(p => p.fullName).join(', ')}
        </div>
      )}

      <button className="btn full" disabled={busy || finalCount === 0} onClick={confirm}>
        Xác nhận thêm {finalCount}
      </button>
    </>
  );
}

function PreviewRow({ p, checked, onToggle }: {
  p: PreviewGroupPlayer; checked: boolean; onToggle: () => void;
}) {
  return (
    <label className="card-row" style={{
      padding: 8, borderBottom: '1px solid var(--c-border)',
      cursor: 'pointer', alignItems: 'center'
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <div>
          <div><b>{p.fullName}</b>{!p.isActive && <span className="card-sub"> (ngưng)</span>}</div>
          <div className="card-sub">{p.phoneNumber || '—'}</div>
        </div>
      </div>
      {p.currentDebt > 0 && <span className="badge unpaid">Nợ {fmt(p.currentDebt)}</span>}
    </label>
  );
}
