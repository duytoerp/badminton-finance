import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import ResponsiveSheet from '../components/common/ResponsiveSheet';
import { PaymentBadge, SessionStatusBadge } from '../components/common/StatusBadge';
import DataTable, { Column } from '../components/common/DataTable';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { useAuth } from '../store/auth';
import {
  addExpense, addGroupsToSession, addParticipant, addParticipantsBulk,
  cancelSession, checkInAll, closeSession, deleteMatchHistory, deleteMatchPlanHistory,
  finishMatch,
  generateMatchPlan, getMatchPlanHistory, getSession, listMatchHistory, listMatchPlanHistory,
  listPlayerGroups, listPlayers, previewAddGroupsToSession,
  recordMatch, saveMatchPlan, setCheckIn,
  GROUP_TYPE_LABEL, GROUP_TYPE_BADGE_CLS,
  MatchHistory, MatchPlan, MatchPlanHistoryFull, MatchPlanHistorySummary, MatchSkillMode,
  Participant, PlayerGroup, PreviewAddGroupsResult, PreviewGroupPlayer,
  quickPayment, reopenSession, removeParticipant,
  SessionDetail as TSession, Player, SkillLevel, TransactionDto
} from '../api/endpoints';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';
const modeLabel = (m?: string) =>
  m === 'FixedAmount' ? 'Cố định'
  : m === 'EqualPerHead' ? 'Chia đều'
  : 'Tỷ lệ';
type Tab = 'overview' | 'players' | 'transactions' | 'payments' | 'debts' | 'matches' | 'plans' | 'history';

export default function SessionDetail() {
  const { id } = useParams();
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const canManage = useAuth(s => s.canManageSessions)();
  const [data, setData] = useState<TSession | null>(null);
  const [warn, setWarn] = useState<string[]>([]);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [paySheet, setPaySheet] = useState<Participant | null>(null);
  const [addSheet, setAddSheet] = useState(false);
  const [matchSheet, setMatchSheet] = useState(false);
  const [manualSheet, setManualSheet] = useState(false);
  const [matchesTick, setMatchesTick] = useState(0);
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
  const locked = closed || cancelled || !canManage;
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
              {canManage && closed && <button className="btn btn-ghost" onClick={async () => {
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

        <LiveMatchesBanner sessionId={data.id} participants={data.participants}
          refreshTick={matchesTick} onChanged={() => setMatchesTick(t => t + 1)} />

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
            ['matches', '🏸 Lịch sử ván'],
            ['plans', '📋 Lịch sử chia set'],
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
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {canManage && <button className="btn" disabled={locked} onClick={() => setAddSheet(true)}>+ Thêm người chơi</button>}
              {canManage && <button className="btn secondary" disabled={data.participants.length < 4}
                title={data.participants.length < 4 ? 'Cần tối thiểu 4 người' : ''}
                onClick={() => setMatchSheet(true)}>🎾 Chia set</button>}
              {canManage && <button className="btn secondary" disabled={data.participants.length < 2 || locked}
                title={data.participants.length < 2 ? 'Cần tối thiểu 2 người' : 'Tự chọn người + nhập tỉ số'}
                onClick={() => setManualSheet(true)}>➕ Chia thủ công</button>}
              <CheckInSummary participants={data.participants} locked={locked} sessionId={data.id} onDone={load} />
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
                { key: 'checkin', header: 'Điểm danh',
                  accessor: r => r.checkedInAt ? 1 : 0,
                  render: r => <CheckInToggle p={r} locked={locked} onDone={load} /> },
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
                      {canManage && <button className="btn btn-sm" onClick={() => setPaySheet(r)}>Thu</button>}
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
              {canManage && <button className="btn" disabled={locked} onClick={() => setExpenseOpen(true)}>+ Chi phí</button>}
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
                    render: r => canManage ? <button className="btn btn-sm" onClick={() => setPaySheet(r)}>Thu nợ</button> : null }
                ] as Column<Participant>[]}
                rows={debts} rowKey={r => r.id} />
        )}

        {tab === 'matches' && (
          <MatchHistoryPanel session={data} locked={locked} refreshTick={matchesTick} />
        )}

        {tab === 'plans' && (
          <MatchPlanHistoryPanel session={data} locked={locked} />
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
        <MatchPlanSheet open={matchSheet} onClose={() => setMatchSheet(false)} session={data}
          onMatchChanged={() => setMatchesTick(t => t + 1)} />
        <ManualMatchSheet open={manualSheet} onClose={() => setManualSheet(false)} session={data}
          onSaved={() => setMatchesTick(t => t + 1)} />
      </div>
    );
  }

  // ============= Mobile =============
  const mobileTab: Tab = tab;
  const txCount = data.transactions.length;

  return (
    <>
      <AppBar title={data.title} />
      <div className="page">
        {/* compact always-visible header */}
        <div className="card" style={{ padding: 10 }}>
          <div className="card-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="card-sub" style={{ fontSize: 12 }}>
                {new Date(data.playDate).toLocaleDateString('vi-VN')} · {data.courtName}
                {' · '}{data.startTime.slice(0,5)}–{data.endTime.slice(0,5)}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', fontSize: 12 }}>
                <span><b style={{ color: 'var(--c-success)' }}>{fmt(data.totalIncome)}</b> thu</span>
                <span><b style={{ color: 'var(--c-danger)' }}>{fmt(data.totalExpense)}</b> chi</span>
                <span>Dư <b>{fmt(data.balance)}</b></span>
                <span>{data.participants.length} ng · {fmt(data.feePerSlot)}/slot</span>
              </div>
            </div>
            <SessionStatusBadge status={data.status} />
          </div>
        </div>

        {warn.length > 0 && (
          <div className="card" style={{ background: '#fef3c7' }}>
            {warn.map((w, i) => <div key={i}>⚠️ {w}</div>)}
          </div>
        )}

        <LiveMatchesBanner sessionId={data.id} participants={data.participants}
          refreshTick={matchesTick} onChanged={() => setMatchesTick(t => t + 1)} />

        {/* mobile tab bar — horizontally scrollable */}
        <MobileTabBar tab={mobileTab} onChange={setTab} items={[
          { v: 'players',      label: `👥 Người chơi (${data.participants.length})` },
          { v: 'transactions', label: `💵 Thu chi${txCount > 0 ? ` (${txCount})` : ''}` },
          { v: 'matches',      label: '🏸 Lịch sử ván' },
          { v: 'plans',        label: '📋 Phương án' },
          { v: 'overview',     label: '📊 Tổng quan' }
        ]} />

        {/* ===== tab content ===== */}

        {mobileTab === 'players' && (
          <>
            <div className="btn-row">
              {canManage && <button className="btn secondary" disabled={locked} onClick={() => setAddSheet(true)}>+ Người chơi</button>}
              {canManage && <button className="btn secondary" disabled={data.participants.length < 4}
                onClick={() => setMatchSheet(true)}>🎾 Chia set</button>}
              {canManage && <button className="btn secondary" disabled={data.participants.length < 2 || locked}
                onClick={() => setManualSheet(true)}>➕ Chia thủ công</button>}
            </div>

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <CheckInSummary participants={data.participants} locked={locked} sessionId={data.id} onDone={load} />
            </div>

            {data.participants.length === 0 && (
              <div className="panel" style={{ textAlign: 'center', padding: 16 }}>
                <p className="card-sub">Chưa có người chơi. Bấm <b>+ Người chơi</b> ở trên.</p>
              </div>
            )}

            {data.participants.map(p => (
              <div key={p.id} className="card" style={{ marginTop: 8 }}>
                <div className="card-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {p.playerName}
                      {p.checkedInAt && (
                        <span className="badge paid" style={{ fontSize: 10 }} title={`Điểm danh: ${new Date(p.checkedInAt).toLocaleTimeString('vi-VN')}`}>
                          ✓ Đã đến
                        </span>
                      )}
                      {p.joinedViaGroupName && (
                        <span className={'badge ' + (p.joinedViaGroupType ? GROUP_TYPE_BADGE_CLS[p.joinedViaGroupType] : 'draft')}
                          style={{ fontSize: 10 }}
                          title={p.joinedViaGroupType ? GROUP_TYPE_LABEL[p.joinedViaGroupType] : ''}>
                          {p.joinedViaGroupName}
                        </span>
                      )}
                    </div>
                    <div className="card-sub" style={{ fontSize: 12 }}>
                      {p.slotCount} suất
                      {data.pricingMode === 'WeightedSlot' && p.multiplier !== 1 &&
                        <span style={{ color: 'var(--c-primary)' }}> · × {p.multiplier}</span>}
                      {data.pricingMode === 'FixedAmount' && p.fixedAmount > 0 &&
                        <span style={{ color: 'var(--c-primary)' }}> · {fmt(p.fixedAmount)}/slot</span>}
                      {data.pricingMode === 'EqualPerHead' &&
                        <span style={{ color: 'var(--c-primary)' }}> · chia đều</span>}
                      {' · '}{fmt(p.amountDue)} / {fmt(p.amountPaid)}
                    </div>
                    {p.debt > 0 && <div style={{ color: 'var(--c-danger)', fontWeight: 600, fontSize: 13 }}>Còn: {fmt(p.debt)}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <PaymentBadge status={p.paymentStatus} />
                    <CheckInToggle p={p} locked={locked} onDone={load} compact />
                    {canManage && <button className="btn btn-sm" onClick={() => setPaySheet(p)} style={{ fontSize: 12 }}>Thu</button>}
                    {!locked && p.amountPaid === 0 && (
                      <button className="btn btn-sm btn-ghost" style={{ fontSize: 11 }}
                        onClick={async () => { if (confirm('Xóa người chơi này?')) { await removeParticipant(p.id); await load(); }}}>
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {mobileTab === 'transactions' && (
          <>
            <div className="btn-row">
              {canManage && <button className="btn secondary" disabled={locked} onClick={() => setExpenseOpen(true)}>+ Chi phí</button>}
            </div>
            {data.transactions.length === 0 && (
              <div className="panel" style={{ textAlign: 'center', padding: 16 }}>
                <p className="card-sub">Chưa có thu chi nào.</p>
              </div>
            )}
            {data.transactions.map(t => (
              <div key={t.id} className="card" style={{ marginTop: 6 }}>
                <div className="card-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-title" style={{ fontSize: 14 }}>
                      {t.transactionType === 'Income'
                        ? <span style={{ color: 'var(--c-success)' }}>Thu</span>
                        : <span style={{ color: 'var(--c-danger)' }}>Chi</span>}
                      {' · '}{t.description}
                    </div>
                    <div className="card-sub" style={{ fontSize: 12 }}>
                      {new Date(t.transactionDate).toLocaleString('vi-VN')}
                      {t.playerName && ' · ' + t.playerName}
                    </div>
                  </div>
                  <b style={{ fontSize: 15 }}>{fmt(t.amount)}</b>
                </div>
              </div>
            ))}
          </>
        )}

        {mobileTab === 'matches' && (
          <MatchHistoryPanel session={data} locked={locked} refreshTick={matchesTick} />
        )}

        {mobileTab === 'plans' && (
          <MatchPlanHistoryPanel session={data} locked={locked} />
        )}

        {mobileTab === 'overview' && (
          <>
            <div className="panel" style={{ padding: 12 }}>
              <p style={{ margin: '4px 0' }}><b>Ngày:</b> {new Date(data.playDate).toLocaleDateString('vi-VN')}</p>
              <p style={{ margin: '4px 0' }}><b>Sân:</b> {data.courtName} (×{data.courtCount})</p>
              <p style={{ margin: '4px 0' }}><b>Giờ:</b> {data.startTime.slice(0,5)} – {data.endTime.slice(0,5)}</p>
              {data.pricingTemplateName && <p style={{ margin: '4px 0' }}><b>Pricing:</b> {data.pricingTemplateName} ({modeLabel(data.pricingMode)})</p>}
              {data.note && <p style={{ margin: '4px 0' }}><b>Ghi chú:</b> {data.note}</p>}
              {(data as any).reopenCount > 0 && (
                <p style={{ margin: '4px 0' }} className="card-sub">
                  Mở lại {(data as any).reopenCount} lần
                  {(data as any).reopenReason && ` — lần gần nhất: ${(data as any).reopenReason}`}
                </p>
              )}
            </div>

            <div className="kpi-grid" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <div className="kpi success"><div className="label">Tổng thu</div><div className="value">{fmt(data.totalIncome)}</div></div>
              <div className="kpi danger"><div className="label">Tổng chi</div><div className="value">{fmt(data.totalExpense)}</div></div>
              <div className="kpi"><div className="label">Số dư</div><div className="value">{fmt(data.balance)}</div></div>
              <div className="kpi primary"><div className="label">Phí/slot</div><div className="value">{fmt(data.feePerSlot)}</div></div>
            </div>

            <div style={{ marginTop: 16 }}>
              {!locked && (
                <button className="btn full" onClick={async () => {
                  try { await closeSession(data.id); await load(); }
                  catch (e: any) { alert(e?.response?.data?.message || 'Không thể chốt buổi'); }
                }}>🔒 Chốt buổi</button>
              )}
              {canManage && closed && (
                <button className="btn secondary full" onClick={async () => {
                  const reason = prompt('Lý do mở lại?'); if (!reason || reason.length < 5) return;
                  await reopenSession(data.id, reason); await load();
                }}>🔓 Mở lại buổi</button>
              )}
              {!locked && (
                <button className="btn secondary full" style={{ marginTop: 8, background: 'var(--c-danger)' }}
                  onClick={async () => {
                    const reason = prompt('Lý do hủy?'); if (!reason || reason.length < 3) return;
                    await cancelSession(data.id, reason); await load();
                  }}>Hủy buổi</button>
              )}
            </div>
          </>
        )}
      </div>

      <ExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} sessionId={data.id} onDone={load} />
      <PaymentSheet participant={paySheet} onClose={() => setPaySheet(null)} onDone={(w: string[]) => { setWarn(w); load(); }} />
      <AddParticipantSheet open={addSheet} onClose={() => setAddSheet(false)} sessionId={data.id} onDone={(w: string[]) => { setWarn(w); load(); }} />
      <MatchPlanSheet open={matchSheet} onClose={() => setMatchSheet(false)} session={data}
          onMatchChanged={() => setMatchesTick(t => t + 1)} />
      <ManualMatchSheet open={manualSheet} onClose={() => setManualSheet(false)} session={data}
        onSaved={() => setMatchesTick(t => t + 1)} />
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

// ===================================================================
// MobileTabBar — horizontally scrollable tab bar for narrow viewports
// ===================================================================
function MobileTabBar({ tab, onChange, items }: {
  tab: Tab; onChange: (t: Tab) => void; items: { v: Tab; label: string }[];
}) {
  return (
    <div style={{
      display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0',
      margin: '12px -4px', whiteSpace: 'nowrap',
      borderBottom: '1px solid var(--c-border)',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    } as React.CSSProperties}>
      {items.map(it => {
        const active = tab === it.v;
        return (
          <button key={it.v} onClick={() => onChange(it.v)}
            style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 999,
              border: '1px solid ' + (active ? 'var(--c-primary)' : 'var(--c-border)'),
              background: active ? 'var(--c-primary)' : 'var(--c-bg, #fff)',
              color: active ? 'white' : 'var(--c-text)',
              fontSize: 13, fontWeight: active ? 600 : 400,
              cursor: 'pointer'
            }}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// ===================================================================
// CheckInToggle — small button that toggles a participant's CheckedInAt
// ===================================================================
function CheckInToggle({ p, locked, onDone, compact }: {
  p: Participant; locked: boolean; onDone: () => void; compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const isIn = !!p.checkedInAt;
  async function toggle() {
    if (locked || busy) return;
    setBusy(true);
    try { await setCheckIn(p.id, !isIn); onDone(); }
    catch (e: any) { alert(e?.response?.data?.message || 'Không đổi điểm danh được.'); }
    finally { setBusy(false); }
  }
  if (isIn) {
    return (
      <button onClick={toggle} disabled={locked || busy}
        title={`Điểm danh ${new Date(p.checkedInAt!).toLocaleTimeString('vi-VN')} — bấm để bỏ`}
        className="badge paid" style={{
          border: 'none', cursor: locked ? 'default' : 'pointer',
          fontSize: compact ? 11 : 12, padding: compact ? '3px 8px' : '4px 10px'
        }}>
        ✓ Đã đến
      </button>
    );
  }
  return (
    <button onClick={toggle} disabled={locked || busy}
      className="btn btn-sm btn-ghost" style={{
        fontSize: compact ? 11 : 12, padding: compact ? '3px 8px' : '4px 10px', minHeight: 0
      }}>
      ☐ Điểm danh
    </button>
  );
}

// ===================================================================
// CheckInSummary — counter + "Điểm danh tất cả" button
// ===================================================================
function CheckInSummary({ participants, locked, sessionId, onDone }: {
  participants: Participant[]; locked: boolean; sessionId: string; onDone: () => void;
}) {
  const checkedIn = participants.filter(p => p.checkedInAt).length;
  const total = participants.length;
  const [busy, setBusy] = useState(false);
  if (total === 0) return null;
  async function doAll() {
    if (locked || busy) return;
    setBusy(true);
    try { await checkInAll(sessionId); onDone(); }
    catch (e: any) { alert(e?.response?.data?.message || 'Không điểm danh được.'); }
    finally { setBusy(false); }
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
      <span className="card-sub">
        Điểm danh: <b style={{ color: checkedIn === total && total > 0 ? 'var(--c-success)' : 'var(--c-text)' }}>{checkedIn}/{total}</b>
      </span>
      {!locked && checkedIn < total && (
        <button className="btn btn-sm btn-ghost" disabled={busy} onClick={doAll}
          style={{ fontSize: 12, padding: '3px 8px', minHeight: 0 }}>
          {busy ? '…' : '✓ Tất cả'}
        </button>
      )}
    </span>
  );
}

// ===================================================================
// MatchPlanSheet — auto-divide players into doubles matches balanced by skill
// so everyone plays roughly the same number of games.
// ===================================================================
function MatchPlanSheet({ open, onClose, session, onMatchChanged }: {
  open: boolean; onClose: () => void; session: TSession; onMatchChanged?: () => void;
}) {
  const [rounds, setRounds] = useState(6);
  const [courts, setCourts] = useState(Math.max(1, session.courtCount || 1));
  const [mode, setMode] = useState<MatchSkillMode>('Mixed');
  const [onlyCheckedIn, setOnlyCheckedIn] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(session.participants.map(p => p.id)));
  const [plan, setPlan] = useState<MatchPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const checkedInCount = session.participants.filter(p => p.checkedInAt).length;

  useEffect(() => {
    if (open) {
      setPicked(new Set(session.participants.map(p => p.id)));
      setPlan(null);
      setError('');
      // If at least one has checked in, default ON; otherwise OFF so the user doesn't get stuck.
      setOnlyCheckedIn(checkedInCount > 0);
    }
  }, [open, session.participants]); // eslint-disable-line

  const playerById = useMemo(() => {
    const m = new Map<string, Participant>();
    session.participants.forEach(p => m.set(p.playerId, p));
    return m;
  }, [session.participants]);

  async function generate(reshuffle = false) {
    setBusy(true);
    setError('');
    try {
      const r = await generateMatchPlan(session.id, {
        rounds, courtCount: courts, skillMode: mode,
        onlyCheckedIn,
        participantIds: picked.size === session.participants.length ? undefined : Array.from(picked),
        seed: reshuffle ? Math.floor(Math.random() * 1_000_000) : 0
      });
      setPlan(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không thể chia set.');
    } finally { setBusy(false); }
  }

  function toggleParticipant(id: string) {
    const n = new Set(picked);
    if (n.has(id)) n.delete(id); else n.add(id);
    setPicked(n);
  }

  const eligibleCount = picked.size;

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="🎾 Tự động chia set">
      <p className="card-sub">
        Hệ thống sẽ chia người chơi vào các sân theo trình độ, cân bằng số ván giữa mọi người.
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <div className="form-field" style={{ flex: 1 }}>
          <label>Số ván</label>
          <input type="number" min={1} max={30} value={rounds}
            onChange={e => setRounds(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
        </div>
        <div className="form-field" style={{ flex: 1 }}>
          <label>Số sân/ván</label>
          <input type="number" min={1} max={20} value={courts}
            onChange={e => setCourts(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
        </div>
      </div>

      <div className="form-field">
        <label>Cách ghép đội trong mỗi ván</label>
        <select value={mode} onChange={e => setMode(e.target.value as MatchSkillMode)}>
          <option value="Mixed">Cân bằng (mạnh + yếu vs trung bình)</option>
          <option value="Similar">Cùng trình độ (mạnh ghép mạnh, yếu ghép yếu)</option>
        </select>
      </div>

      <label className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={onlyCheckedIn} onChange={e => setOnlyCheckedIn(e.target.checked)} />
        <div style={{ flex: 1 }}>
          <div>Chỉ chia người đã điểm danh</div>
          <div className="card-sub" style={{ fontSize: 12 }}>
            Đã điểm danh: <b>{checkedInCount}</b> / {session.participants.length} người
            {checkedInCount === 0 && ' — chưa ai điểm danh, sẽ chia tạm trên toàn bộ danh sách.'}
          </div>
        </div>
      </label>

      <div className="form-field">
        <label>Người tham gia ({eligibleCount}/{session.participants.length})</label>
        <div style={{
          maxHeight: 180, overflowY: 'auto', border: '1px solid var(--c-border)',
          borderRadius: 8, padding: 6
        }}>
          {session.participants.map(p => {
            const sel = picked.has(p.id);
            const s = p.skillLevel ? SKILL_LABEL[p.skillLevel] : null;
            return (
              <label key={p.id} style={{
                display: 'flex', gap: 8, alignItems: 'center', padding: '4px 6px',
                cursor: 'pointer', borderRadius: 6,
                background: sel ? 'transparent' : 'rgba(0,0,0,0.04)'
              }}>
                <input type="checkbox" checked={sel} onChange={() => toggleParticipant(p.id)} />
                <span style={{ flex: 1 }}>{p.playerName}</span>
                {s && <span className={'badge ' + s.cls} style={{ fontSize: 10 }}>{s.label}</span>}
              </label>
            );
          })}
        </div>
        <div className="card-sub" style={{ fontSize: 12, marginTop: 4 }}>
          Bỏ chọn người không tham gia (ví dụ đến muộn / về sớm).
        </div>
      </div>

      {error && <div className="panel" style={{ background: '#fee2e2', color: 'var(--c-danger)', padding: 8, borderRadius: 8, marginBottom: 12 }}>{error}</div>}

      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button className="btn" disabled={busy || eligibleCount < 4} onClick={() => generate(false)}>
          {busy ? 'Đang chia…' : (plan ? 'Chia lại' : 'Chia set')}
        </button>
        {plan && (
          <button className="btn secondary" disabled={busy} onClick={() => generate(true)}>
            🔀 Xáo ngẫu nhiên
          </button>
        )}
      </div>

      {plan && <MatchPlanView plan={plan} playerById={playerById} sessionId={session.id}
        onMatchChanged={onMatchChanged} />}
    </ResponsiveSheet>
  );
}

function MatchPlanView({ plan, playerById, sessionId, onMatchChanged }: {
  plan: MatchPlan; playerById: Map<string, Participant>; sessionId: string;
  onMatchChanged?: () => void;
}) {
  const nameOf = (pid: string) => playerById.get(pid)?.playerName || '(?)';
  const skillOf = (pid: string): SkillLevel | undefined => playerById.get(pid)?.skillLevel;
  const [saved, setSaved] = useState<Set<string>>(new Set());
  // key → matchId for courts started but not yet finished from this view
  const [liveMatch, setLiveMatch] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const keyOf = (r: number, c: number) => `${r}-${c}`;
  const [planSaved, setPlanSaved] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Reset per-render state when a new plan replaces the previous one.
  useEffect(() => { setPlanSaved(false); setSaved(new Set()); setEditing(null); setLiveMatch({}); }, [plan]);

  async function startCourt(k: string, court: { team1: string[]; team2: string[] }, label: string) {
    if (busyKey) return;
    setBusyKey(k);
    try {
      const r = await recordMatch(sessionId, {
        team1PlayerIds: court.team1, team2PlayerIds: court.team2,
        label, startOnly: true
      });
      setLiveMatch(m => ({ ...m, [k]: r.data.id }));
      onMatchChanged?.();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Không bắt đầu được.');
    } finally { setBusyKey(null); }
  }

  async function finishCourt(k: string, score1: string, score2: string, note: string) {
    const matchId = liveMatch[k]; if (!matchId) return;
    setBusyKey(k);
    try {
      await finishMatch(matchId, {
        team1Score: score1 === '' ? null : Number(score1),
        team2Score: score2 === '' ? null : Number(score2),
        note: note || undefined
      });
      setSaved(s => new Set(s).add(k));
      setLiveMatch(m => { const n = { ...m }; delete n[k]; return n; });
      setEditing(null);
      onMatchChanged?.();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Không hoàn tất được.');
    } finally { setBusyKey(null); }
  }

  async function savePlanSnapshot() {
    if (savingPlan || planSaved) return;
    const note = prompt('Ghi chú cho phương án này (tuỳ chọn):', '') ?? undefined;
    setSavingPlan(true);
    try {
      await saveMatchPlan(sessionId, plan, note || undefined);
      setPlanSaved(true);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Lưu phương án thất bại.');
    } finally { setSavingPlan(false); }
  }

  if (plan.roundsPlan.length === 0) {
    return (
      <div className="panel" style={{ background: '#fef3c7', padding: 10, borderRadius: 8 }}>
        {plan.notes.length > 0 ? plan.notes.map((n, i) => <div key={i}>⚠️ {n}</div>) : 'Chưa chia được.'}
      </div>
    );
  }

  // gamesPlayed spread — to show "công bằng" indicator
  const counts = plan.players.map(p => p.gamesPlayed);
  const minG = Math.min(...counts), maxG = Math.max(...counts);

  return (
    <>
      {plan.notes.length > 0 && (
        <div className="panel" style={{ background: '#fef3c7', padding: 8, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {plan.notes.map((n, i) => <div key={i}>ℹ️ {n}</div>)}
        </div>
      )}

      <div className="card-row" style={{ marginBottom: 8, fontSize: 13 }}>
        <div><b>{plan.rounds}</b> ván × <b>{plan.courtCount}</b> sân</div>
        <div>Số ván/người: <b>{minG === maxG ? minG : `${minG}–${maxG}`}</b></div>
      </div>
      <div style={{ marginBottom: 12 }}>
        {planSaved
          ? <span className="badge paid" style={{ fontSize: 12 }}>✓ Đã lưu vào lịch sử</span>
          : <button className="btn btn-sm" onClick={savePlanSnapshot} disabled={savingPlan}
              style={{ fontSize: 13 }}>
              {savingPlan ? 'Đang lưu…' : '📌 Lưu phương án này'}
            </button>}
      </div>

      {plan.roundsPlan.map(r => (
        <div key={r.index} className="card" style={{ marginBottom: 10 }}>
          <div className="card-row" style={{ marginBottom: 6 }}>
            <div className="card-title">Ván {r.index}</div>
            {r.resting.length > 0 && (
              <div className="card-sub" style={{ fontSize: 12 }}>
                💤 {r.resting.map(nameOf).join(', ')}
              </div>
            )}
          </div>
          {r.courts.map(c => {
            const k = keyOf(r.index, c.courtIndex);
            const isSaved = saved.has(k);
            const isLive = !!liveMatch[k];
            const isEditing = editing === k;
            const label = `Ván ${r.index} · sân ${c.courtIndex}`;
            const courtBg = isLive ? 'rgba(34,197,94,0.10)' : 'var(--c-bg-soft, #f5f7fb)';
            return (
              <div key={c.courtIndex} style={{
                padding: 10, marginBottom: 6, borderRadius: 8,
                background: courtBg,
                opacity: isSaved ? 0.75 : 1,
                borderLeft: isLive ? '3px solid #22c55e' : undefined
              }}>
                <div className="card-sub" style={{ fontSize: 11, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>Sân {c.courtIndex} · skill {c.team1Skill} vs {c.team2Skill}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {isSaved && <span className="badge paid" style={{ fontSize: 10 }}>✓ Đã lưu</span>}
                    {isLive && !isEditing && (
                      <>
                        <span className="badge" style={{ background: '#22c55e', color: 'white', fontSize: 10 }}>🟢 Đang đánh</span>
                        <button className="btn btn-sm"
                          style={{ fontSize: 11, padding: '2px 8px', minHeight: 0 }}
                          onClick={() => setEditing(k)}>✓ Nhập tỉ số</button>
                      </>
                    )}
                    {!isSaved && !isLive && !isEditing && (
                      <>
                        <button className="btn btn-sm btn-ghost" disabled={busyKey === k}
                          style={{ fontSize: 11, padding: '2px 8px', minHeight: 0 }}
                          onClick={() => startCourt(k, c, label)}>
                          ▶ Bắt đầu
                        </button>
                        <button className="btn btn-sm btn-ghost"
                          style={{ fontSize: 11, padding: '2px 8px', minHeight: 0 }}
                          onClick={() => setEditing(k)}>
                          💾 Lưu kết quả
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 8,
                  alignItems: 'center'
                }}>
                  <TeamCell players={c.team1} nameOf={nameOf} skillOf={skillOf} align="right" />
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--c-muted, #888)',
                    padding: '2px 6px', borderRadius: 10,
                    background: 'var(--c-bg, #fff)', border: '1px solid var(--c-border)'
                  }}>vs</span>
                  <TeamCell players={c.team2} nameOf={nameOf} skillOf={skillOf} align="left" />
                </div>
                {isEditing && !isLive && (
                  <RecordCourtForm
                    sessionId={plan.sessionId} court={c} label={label}
                    onCancel={() => setEditing(null)}
                    onSaved={() => { setSaved(s => new Set(s).add(k)); setEditing(null); onMatchChanged?.(); }}
                  />
                )}
                {isEditing && isLive && (
                  <CourtFinishForm
                    busy={busyKey === k}
                    onCancel={() => setEditing(null)}
                    onSave={(s1, s2, note) => finishCourt(k, s1, s2, note)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title" style={{ marginBottom: 6 }}>Số ván của mỗi người</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[...plan.players].sort((a, b) => a.gamesPlayed - b.gamesPlayed).map(p => (
            <span key={p.playerId} className="badge" style={{
              background: 'var(--c-bg, #fff)', border: '1px solid var(--c-border)',
              color: 'var(--c-text)', fontSize: 12, padding: '4px 8px'
            }}>
              {p.fullName}: <b>{p.gamesPlayed}</b>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function TeamCell({ players, nameOf, skillOf, align }: {
  players: string[];
  nameOf: (id: string) => string;
  skillOf: (id: string) => SkillLevel | undefined;
  align: 'left' | 'right';
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      minWidth: 0
    }}>
      {players.map(pid => {
        const sk = skillOf(pid);
        const s = sk ? SKILL_LABEL[sk] : null;
        return (
          <span key={pid} style={{
            display: 'inline-flex', gap: 4, alignItems: 'center', flexWrap: 'wrap',
            justifyContent: align === 'right' ? 'flex-end' : 'flex-start'
          }}>
            <b style={{ fontSize: 14 }}>{nameOf(pid)}</b>
            {s && <span className={'badge ' + s.cls} style={{ fontSize: 10 }}>{s.label}</span>}
          </span>
        );
      })}
    </div>
  );
}

// ===================================================================
// MatchHistoryPanel — list saved match results for a session
// ===================================================================
function MatchHistoryPanel({ session, locked, refreshTick = 0 }: {
  session: TSession; locked: boolean; refreshTick?: number;
}) {
  const [items, setItems] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { const r = await listMatchHistory(session.id); setItems(r.data); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [session.id, refreshTick]);

  async function onDelete(id: string) {
    if (!confirm('Xóa kết quả ván này?')) return;
    try { await deleteMatchHistory(id); await load(); }
    catch (e: any) { alert(e?.response?.data?.message || 'Xóa thất bại.'); }
  }

  if (loading) return <p className="card-sub">Đang tải…</p>;
  if (items.length === 0) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: 16 }}>
        <p className="card-sub" style={{ marginBottom: 4 }}>Chưa lưu ván nào.</p>
        <p className="card-sub" style={{ fontSize: 12 }}>
          Từ <b>🎾 Chia set</b> → bấm <b>▶ Bắt đầu</b> hoặc <b>💾 Lưu kết quả</b> trên mỗi sân.
        </p>
      </div>
    );
  }

  const inProgress = items.filter(m => m.status === 'InProgress');
  const finished = items.filter(m => m.status !== 'InProgress');

  return (
    <div>
      {inProgress.length > 0 && (
        <>
          <h4 style={{ margin: '4px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 0 4px rgba(34,197,94,0.2)',
              animation: 'pulse 1.5s infinite'
            }} />
            Đang diễn ra ({inProgress.length})
          </h4>
          {inProgress.map(m => (
            <MatchHistoryRow key={m.id} m={m} locked={locked}
              onDelete={() => onDelete(m.id)}
              onFinished={load} />
          ))}
        </>
      )}

      {finished.length > 0 && (
        <>
          {inProgress.length > 0 && (
            <h4 style={{ margin: '16px 0 8px' }}>🏸 Đã đánh xong ({finished.length})</h4>
          )}
          {finished.map(m => (
            <MatchHistoryRow key={m.id} m={m} locked={locked}
              onDelete={() => onDelete(m.id)} />
          ))}
        </>
      )}
    </div>
  );
}

function MatchHistoryRow({ m, locked, onDelete, onFinished }: {
  m: MatchHistory; locked: boolean; onDelete: () => void; onFinished?: () => void;
}) {
  const [finishing, setFinishing] = useState(false);
  const isLive = m.status === 'InProgress';
  const cardStyle: React.CSSProperties = {
    marginBottom: 8,
    ...(isLive ? { borderLeft: '3px solid #22c55e', background: 'rgba(34,197,94,0.06)' } : {})
  };

  return (
    <div className="card" style={cardStyle}>
      <div className="card-row">
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            Ván {m.matchNumber}
            {isLive && <span className="badge" style={{ background: '#22c55e', color: 'white', fontSize: 10 }}>🟢 Đang đánh</span>}
            {m.label && <span className="card-sub" style={{ fontSize: 12, fontWeight: 400 }}>· {m.label}</span>}
          </div>
          <div className="card-sub" style={{ fontSize: 12 }}>
            {isLive
              ? <>Bắt đầu {new Date(m.startedAt || m.playedAt).toLocaleTimeString('vi-VN')} · <LiveDuration since={m.startedAt || m.playedAt} /></>
              : new Date(m.finishedAt || m.playedAt).toLocaleString('vi-VN')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isLive && !locked && (
            <button className="btn btn-sm" onClick={() => setFinishing(true)} disabled={finishing}
              style={{ fontSize: 12 }}>✓ Nhập tỉ số</button>
          )}
          {!locked && (
            <button className="btn btn-sm btn-ghost" onClick={onDelete} style={{ fontSize: 12 }}>Xóa</button>
          )}
        </div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8,
        alignItems: 'center', marginTop: 8
      }}>
        <HistoryTeam players={m.team1} align="right" winner={m.winnerTeam === 1} />
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          {m.team1Score != null && m.team2Score != null
            ? <b style={{ fontSize: 20, color: 'var(--c-primary)' }}>{m.team1Score} – {m.team2Score}</b>
            : <span className="card-sub" style={{ fontSize: 12 }}>{isLive ? 'vs' : '—'}</span>}
        </div>
        <HistoryTeam players={m.team2} align="left" winner={m.winnerTeam === 2} />
      </div>
      {m.note && <div className="card-sub" style={{ fontSize: 12, marginTop: 4 }}>📝 {m.note}</div>}

      {finishing && (
        <FinishMatchForm matchId={m.id}
          onCancel={() => setFinishing(false)}
          onDone={() => { setFinishing(false); onFinished?.(); }} />
      )}
    </div>
  );
}

function FinishMatchForm({ matchId, onCancel, onDone }: {
  matchId: string; onCancel: () => void; onDone: () => void;
}) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await finishMatch(matchId, {
        team1Score: s1 === '' ? null : Number(s1),
        team2Score: s2 === '' ? null : Number(s2),
        note: note || undefined
      });
      onDone();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Cập nhật thất bại.');
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      marginTop: 10, padding: 8, borderRadius: 6,
      background: 'var(--c-bg, #fff)', border: '1px solid var(--c-border)'
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="number" inputMode="numeric" placeholder="Đội 1" value={s1}
          onChange={e => setS1(e.target.value.replace(/[^\d]/g, ''))}
          style={{ width: 60, textAlign: 'center', fontSize: 16, padding: 6, borderRadius: 6, border: '1px solid var(--c-border)' }} />
        <span style={{ fontWeight: 700 }}>:</span>
        <input type="number" inputMode="numeric" placeholder="Đội 2" value={s2}
          onChange={e => setS2(e.target.value.replace(/[^\d]/g, ''))}
          style={{ width: 60, textAlign: 'center', fontSize: 16, padding: 6, borderRadius: 6, border: '1px solid var(--c-border)' }} />
        <input placeholder="Ghi chú (tuỳ chọn)" value={note} onChange={e => setNote(e.target.value)}
          style={{ flex: 1, fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid var(--c-border)' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm btn-ghost" onClick={onCancel} disabled={busy}>Hủy</button>
        <button className="btn btn-sm" onClick={save} disabled={busy}>{busy ? '…' : '✓ Hoàn tất'}</button>
      </div>
    </div>
  );
}

// Renders a live ticking duration since a timestamp ("2 phút").
function LiveDuration({ since }: { since: string }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force(x => x + 1), 30000); // refresh every 30s
    return () => clearInterval(t);
  }, []);
  const ms = Date.now() - new Date(since).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 1) return <>vừa xong</>;
  if (mins < 60) return <>{mins} phút</>;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return <>{h}h {m}p</>;
}

// Similar to RecordCourtForm but used to finish an already-started match.
// The parent owns the API call so it can update local "liveMatch" state correctly.
function CourtFinishForm({ busy, onCancel, onSave }: {
  busy: boolean;
  onCancel: () => void;
  onSave: (s1: string, s2: string, note: string) => void;
}) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [note, setNote] = useState('');
  return (
    <div style={{
      marginTop: 8, padding: 8, borderRadius: 6,
      background: 'var(--c-bg, #fff)', border: '1px solid var(--c-border)'
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="number" inputMode="numeric" placeholder="Đội 1" value={s1}
          onChange={e => setS1(e.target.value.replace(/[^\d]/g, ''))}
          style={{ width: 60, textAlign: 'center', fontSize: 16, padding: 6, borderRadius: 6, border: '1px solid var(--c-border)' }} />
        <span style={{ fontWeight: 700 }}>:</span>
        <input type="number" inputMode="numeric" placeholder="Đội 2" value={s2}
          onChange={e => setS2(e.target.value.replace(/[^\d]/g, ''))}
          style={{ width: 60, textAlign: 'center', fontSize: 16, padding: 6, borderRadius: 6, border: '1px solid var(--c-border)' }} />
        <input placeholder="Ghi chú (tuỳ chọn)" value={note} onChange={e => setNote(e.target.value)}
          style={{ flex: 1, fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid var(--c-border)' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm btn-ghost" onClick={onCancel} disabled={busy}>Hủy</button>
        <button className="btn btn-sm" onClick={() => onSave(s1, s2, note)} disabled={busy}>{busy ? '…' : '✓ Hoàn tất'}</button>
      </div>
    </div>
  );
}

// Inline form rendered inside a planner court card. Two score inputs + Save/Cancel.
function RecordCourtForm({ sessionId, court, label, onSaved, onCancel }: {
  sessionId: string;
  court: { team1: string[]; team2: string[] };
  label: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const t1 = s1 === '' ? null : Number(s1);
      const t2 = s2 === '' ? null : Number(s2);
      await recordMatch(sessionId, {
        team1PlayerIds: court.team1, team2PlayerIds: court.team2,
        team1Score: t1, team2Score: t2,
        label, note: note || undefined
      });
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Lưu thất bại.');
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      marginTop: 8, padding: 8, borderRadius: 6,
      background: 'var(--c-bg, #fff)', border: '1px solid var(--c-border)'
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="number" inputMode="numeric" placeholder="Đội 1" value={s1}
          onChange={e => setS1(e.target.value.replace(/[^\d]/g, ''))}
          style={{ width: 60, textAlign: 'center', fontSize: 16, padding: 6, borderRadius: 6, border: '1px solid var(--c-border)' }} />
        <span style={{ fontWeight: 700 }}>:</span>
        <input type="number" inputMode="numeric" placeholder="Đội 2" value={s2}
          onChange={e => setS2(e.target.value.replace(/[^\d]/g, ''))}
          style={{ width: 60, textAlign: 'center', fontSize: 16, padding: 6, borderRadius: 6, border: '1px solid var(--c-border)' }} />
        <input placeholder="Ghi chú (tuỳ chọn)" value={note} onChange={e => setNote(e.target.value)}
          style={{ flex: 1, fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid var(--c-border)' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm btn-ghost" onClick={onCancel} disabled={busy}>Hủy</button>
        <button className="btn btn-sm" onClick={save} disabled={busy}>{busy ? '…' : '💾 Lưu'}</button>
      </div>
    </div>
  );
}

// ===================================================================
// LiveMatchesBanner — always-visible "trận đang diễn ra" at the top of
// the session page. Polls every 30s and refreshes when refreshTick changes.
// ===================================================================
function LiveMatchesBanner({ sessionId, participants, refreshTick, onChanged }: {
  sessionId: string; participants: Participant[]; refreshTick: number; onChanged: () => void;
}) {
  const [items, setItems] = useState<MatchHistory[]>([]);
  const playerById = useMemo(() => {
    const m = new Map<string, Participant>();
    participants.forEach(p => m.set(p.playerId, p));
    return m;
  }, [participants]);

  async function load() {
    try {
      const r = await listMatchHistory(sessionId);
      setItems(r.data.filter(m => m.status === 'InProgress'));
    } catch { /* ignore transient errors — keep prior items */ }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sessionId, refreshTick]);
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [sessionId]);

  if (items.length === 0) return null;

  return (
    <div style={{
      borderLeft: '4px solid #22c55e',
      background: 'rgba(34,197,94,0.08)',
      borderRadius: 8, padding: 12, marginBottom: 16
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: '#22c55e', boxShadow: '0 0 0 4px rgba(34,197,94,0.25)'
        }} />
        Đang diễn ra ({items.length})
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(m => (
          <LiveMatchCard key={m.id} m={m} playerById={playerById}
            onChanged={() => { load(); onChanged(); }} />
        ))}
      </div>
    </div>
  );
}

function LiveMatchCard({ m, playerById, onChanged }: {
  m: MatchHistory; playerById: Map<string, Participant>; onChanged: () => void;
}) {
  const [finishing, setFinishing] = useState(false);
  const nameOf = (pid: string) => playerById.get(pid)?.playerName || '(?)';
  return (
    <div style={{ background: 'var(--c-bg, #fff)', borderRadius: 6, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--c-muted, #888)' }}>
          Ván {m.matchNumber}{m.label ? ` · ${m.label}` : ''} · <LiveDuration since={m.startedAt || m.playedAt} />
        </div>
        {!finishing && (
          <button className="btn btn-sm" onClick={() => setFinishing(true)} style={{ fontSize: 12 }}>
            ✓ Nhập tỉ số
          </button>
        )}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center'
      }}>
        <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 600 }}>
          {m.team1.map(p => nameOf(p.playerId)).join(' + ')}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-muted, #888)' }}>vs</span>
        <div style={{ textAlign: 'left', fontSize: 14, fontWeight: 600 }}>
          {m.team2.map(p => nameOf(p.playerId)).join(' + ')}
        </div>
      </div>
      {finishing && (
        <FinishMatchForm matchId={m.id}
          onCancel={() => setFinishing(false)}
          onDone={() => { setFinishing(false); onChanged(); }} />
      )}
    </div>
  );
}

function HistoryTeam({ players, align, winner }: {
  players: { playerId: string; fullName: string; skillLevel?: SkillLevel }[];
  align: 'left' | 'right'; winner: boolean;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      minWidth: 0,
      fontWeight: winner ? 700 : 400,
      color: winner ? 'var(--c-success)' : 'inherit'
    }}>
      {winner && <span style={{ fontSize: 10 }}>🏆 Thắng</span>}
      {players.map(p => (
        <span key={p.playerId} style={{ fontSize: 14 }}>{p.fullName}</span>
      ))}
    </div>
  );
}

// ===================================================================
// MatchPlanHistoryPanel — list saved match-plan snapshots
// ===================================================================
const SKILL_MODE_LABEL: Record<MatchSkillMode, string> = {
  Mixed: 'Cân bằng',
  Similar: 'Cùng trình độ'
};

function MatchPlanHistoryPanel({ session, locked }: { session: TSession; locked: boolean }) {
  const [items, setItems] = useState<MatchPlanHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState<MatchPlanHistoryFull | null>(null);

  async function load() {
    setLoading(true);
    try { const r = await listMatchPlanHistory(session.id); setItems(r.data); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [session.id]);

  async function onOpen(id: string) {
    try { const r = await getMatchPlanHistory(id); setOpened(r.data); }
    catch (e: any) { alert(e?.response?.data?.message || 'Không tải được phương án.'); }
  }
  async function onDelete(id: string) {
    if (!confirm('Xóa phương án này khỏi lịch sử?')) return;
    try { await deleteMatchPlanHistory(id); await load(); }
    catch (e: any) { alert(e?.response?.data?.message || 'Xóa thất bại.'); }
  }

  if (loading) return <p className="card-sub">Đang tải…</p>;
  if (items.length === 0) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: 16 }}>
        <p className="card-sub" style={{ marginBottom: 4 }}>Chưa lưu phương án nào.</p>
        <p className="card-sub" style={{ fontSize: 12 }}>
          Mở <b>🎾 Chia set</b>, bấm <b>📌 Lưu phương án này</b> để giữ lại bản chia hôm nay.
        </p>
      </div>
    );
  }

  return (
    <>
      {items.map(h => (
        <div key={h.id} className="card" style={{ marginBottom: 8 }}>
          <div className="card-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="card-title">
                {new Date(h.generatedAt).toLocaleString('vi-VN')}
              </div>
              <div className="card-sub" style={{ fontSize: 12, marginTop: 2 }}>
                {h.rounds} ván × {h.courtCount} sân · {SKILL_MODE_LABEL[h.skillMode]}
                {' · '}{h.playerCount} người{h.onlyCheckedIn ? ` (điểm danh ${h.checkedInCount})` : ''}
              </div>
              {h.note && <div className="card-sub" style={{ fontSize: 12, marginTop: 2 }}>📝 {h.note}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={() => onOpen(h.id)}>Xem</button>
              {!locked && (
                <button className="btn btn-sm btn-ghost" onClick={() => onDelete(h.id)}>Xóa</button>
              )}
            </div>
          </div>
        </div>
      ))}

      <SavedPlanViewer entry={opened} session={session} onClose={() => setOpened(null)} />
    </>
  );
}

// ===================================================================
// ManualMatchSheet — pick players into Team 1 / Team 2 by hand, then record
// ===================================================================
function ManualMatchSheet({ open, onClose, session, onSaved }: {
  open: boolean; onClose: () => void; session: TSession; onSaved: () => void;
}) {
  // 'none' | 'team1' | 'team2' per playerId
  const [assign, setAssign] = useState<Record<string, 'none' | 'team1' | 'team2'>>({});
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (open) {
      const init: Record<string, 'none' | 'team1' | 'team2'> = {};
      session.participants.forEach(p => { init[p.playerId] = 'none'; });
      setAssign(init);
      setS1(''); setS2(''); setNote(''); setLabel('');
    }
  }, [open, session.participants]);

  function cycle(playerId: string) {
    setAssign(a => {
      const cur = a[playerId] || 'none';
      const next = cur === 'none' ? 'team1' : cur === 'team1' ? 'team2' : 'none';
      return { ...a, [playerId]: next };
    });
  }
  function setTeam(playerId: string, t: 'none' | 'team1' | 'team2') {
    setAssign(a => ({ ...a, [playerId]: t }));
  }
  function clearAll() {
    setAssign(a => {
      const n: typeof a = {};
      Object.keys(a).forEach(k => { n[k] = 'none'; });
      return n;
    });
  }
  function swapTeams() {
    setAssign(a => {
      const n: typeof a = {};
      Object.entries(a).forEach(([k, v]) => {
        n[k] = v === 'team1' ? 'team2' : v === 'team2' ? 'team1' : 'none';
      });
      return n;
    });
  }

  const team1Ids = Object.entries(assign).filter(([, v]) => v === 'team1').map(([k]) => k);
  const team2Ids = Object.entries(assign).filter(([, v]) => v === 'team2').map(([k]) => k);
  const canSave = team1Ids.length >= 1 && team2Ids.length >= 1 && !busy;

  async function persist(startOnly: boolean) {
    if (!canSave) return;
    setBusy(true);
    try {
      const t1 = s1 === '' ? null : Number(s1);
      const t2 = s2 === '' ? null : Number(s2);
      await recordMatch(session.id, {
        team1PlayerIds: team1Ids, team2PlayerIds: team2Ids,
        team1Score: t1, team2Score: t2,
        label: label.trim() || undefined,
        note: note.trim() || undefined,
        startOnly
      });
      onSaved(); onClose();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Lưu thất bại.');
    } finally { setBusy(false); }
  }

  const playerById = useMemo(() => {
    const m = new Map<string, Participant>();
    session.participants.forEach(p => m.set(p.playerId, p));
    return m;
  }, [session.participants]);

  function TeamColumn({ label, ids, color }: { label: string; ids: string[]; color: string }) {
    return (
      <div style={{
        flex: 1, minWidth: 0, padding: 8, borderRadius: 8,
        background: color, minHeight: 60
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{label} ({ids.length})</div>
        {ids.length === 0 && <div className="card-sub" style={{ fontSize: 12 }}>—</div>}
        {ids.map(pid => (
          <div key={pid} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '3px 0', fontSize: 13
          }}>
            <span>{playerById.get(pid)?.playerName || '(?)'}</span>
            <button onClick={() => setTeam(pid, 'none')} className="btn btn-sm btn-ghost"
              style={{ padding: '0 6px', minHeight: 0, fontSize: 11 }}>✕</button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="➕ Chia set thủ công">
      <p className="card-sub">Tự chọn người chơi cho từng đội. Bấm nhiều lần vào tên để chuyển giữa Đội 1 → Đội 2 → bỏ chọn.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <TeamColumn label="Đội 1" ids={team1Ids} color="#e0f2fe" />
        <TeamColumn label="Đội 2" ids={team2Ids} color="#fef3c7" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-ghost" onClick={swapTeams} disabled={team1Ids.length === 0 && team2Ids.length === 0}>
          🔄 Đổi 2 đội
        </button>
        <button className="btn btn-sm btn-ghost" onClick={clearAll} disabled={team1Ids.length === 0 && team2Ids.length === 0}>
          ↺ Xoá hết
        </button>
      </div>

      <div className="form-field">
        <label>Người chơi trong buổi ({session.participants.length})</label>
        <div style={{
          maxHeight: 240, overflowY: 'auto',
          border: '1px solid var(--c-border)', borderRadius: 8, padding: 6
        }}>
          {session.participants.map(p => {
            const t = assign[p.playerId] || 'none';
            const sk = p.skillLevel ? SKILL_LABEL[p.skillLevel] : null;
            const bg = t === 'team1' ? '#e0f2fe' : t === 'team2' ? '#fef3c7' : 'transparent';
            return (
              <div key={p.id} onClick={() => cycle(p.playerId)}
                style={{
                  display: 'flex', gap: 6, alignItems: 'center', padding: '6px 8px',
                  borderRadius: 6, marginBottom: 2, cursor: 'pointer',
                  background: bg
                }}>
                <span style={{ flex: 1, fontSize: 14 }}>
                  {p.playerName}
                  {p.checkedInAt && <span className="badge paid" style={{ marginLeft: 6, fontSize: 9 }}>✓</span>}
                  {sk && <span className={'badge ' + sk.cls} style={{ marginLeft: 6, fontSize: 9 }}>{sk.label}</span>}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={e => { e.stopPropagation(); setTeam(p.playerId, t === 'team1' ? 'none' : 'team1'); }}
                    className={'btn btn-sm ' + (t === 'team1' ? '' : 'btn-ghost')}
                    style={{ padding: '2px 8px', minHeight: 0, fontSize: 11 }}>Đ1</button>
                  <button onClick={e => { e.stopPropagation(); setTeam(p.playerId, t === 'team2' ? 'none' : 'team2'); }}
                    className={'btn btn-sm ' + (t === 'team2' ? '' : 'btn-ghost')}
                    style={{ padding: '2px 8px', minHeight: 0, fontSize: 11 }}>Đ2</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        <input type="number" inputMode="numeric" placeholder="Đội 1" value={s1}
          onChange={e => setS1(e.target.value.replace(/[^\d]/g, ''))}
          style={{ width: 80, textAlign: 'center', fontSize: 18, fontWeight: 700, padding: 8, borderRadius: 6, border: '1px solid var(--c-border)' }} />
        <span style={{ fontWeight: 700, fontSize: 20 }}>:</span>
        <input type="number" inputMode="numeric" placeholder="Đội 2" value={s2}
          onChange={e => setS2(e.target.value.replace(/[^\d]/g, ''))}
          style={{ width: 80, textAlign: 'center', fontSize: 18, fontWeight: 700, padding: 8, borderRadius: 6, border: '1px solid var(--c-border)' }} />
        <span className="card-sub" style={{ fontSize: 12, marginLeft: 6 }}>Để trống nếu chỉ ghi nhận</span>
      </div>

      <div className="form-field">
        <label>Nhãn (vd: "Ván 3 · sân 1 — sửa tay")</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Tuỳ chọn" />
      </div>

      <div className="form-field">
        <label>Ghi chú</label>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Tuỳ chọn" />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn secondary" style={{ flex: 1 }} disabled={!canSave} onClick={() => persist(true)}>
          {busy ? '…' : '▶ Bắt đầu trận'}
        </button>
        <button className="btn" style={{ flex: 1 }} disabled={!canSave} onClick={() => persist(false)}>
          {busy ? '…' : '💾 Lưu kết quả'}
        </button>
      </div>
      <div className="card-sub" style={{ fontSize: 12, marginTop: 6 }}>
        <b>Bắt đầu</b>: chưa có tỉ số, trận hiện ở "Đang diễn ra". <b>Lưu kết quả</b>: chốt luôn.
      </div>
    </ResponsiveSheet>
  );
}

function SavedPlanViewer({ entry, session, onClose }: {
  entry: MatchPlanHistoryFull | null; session: TSession; onClose: () => void;
}) {
  const playerById = useMemo(() => {
    const m = new Map<string, Participant>();
    session.participants.forEach(p => m.set(p.playerId, p));
    return m;
  }, [session.participants]);

  if (!entry) return null;
  return (
    <ResponsiveSheet open={!!entry} onClose={onClose}
      title={`Phương án lúc ${new Date(entry.generatedAt).toLocaleString('vi-VN')}`}>
      {!entry.plan
        ? <div className="panel" style={{ color: 'var(--c-danger)' }}>Dữ liệu phương án bị lỗi, không hiển thị được.</div>
        : <MatchPlanView plan={entry.plan} playerById={playerById} sessionId={entry.sessionId} />}
    </ResponsiveSheet>
  );
}
