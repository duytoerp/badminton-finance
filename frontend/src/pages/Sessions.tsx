import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import ResponsiveSheet from '../components/common/ResponsiveSheet';
import { SessionStatusBadge } from '../components/common/StatusBadge';
import DataTable, { Column } from '../components/common/DataTable';
import { useIsDesktop } from '../hooks/useBreakpoint';
import {
  cancelSession, closeSession, createSession, filterSessions, listCourts,
  listPricingTemplates, reopenSession,
  Court, PricingTemplate, Session, SessionStatus
} from '../api/endpoints';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

export default function Sessions() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [items, setItems] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [courtId, setCourtId] = useState('');
  const [status, setStatus] = useState<SessionStatus | ''>('');
  const [search, setSearch] = useState('');

  const [courts, setCourts] = useState<Court[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const r = await filterSessions({
      page, pageSize: desktop ? 20 : 50,
      from: from || undefined, to: to || undefined,
      courtId: courtId || undefined, status: status || undefined,
      search: search || undefined, sortBy: 'playDate', sortDir: 'desc'
    });
    setItems(r.data.items); setTotal(r.data.total);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, from, to, courtId, status, search, desktop]);
  useEffect(() => { listCourts().then(r => setCourts(r.data)); }, []);

  if (desktop) {
    const cols: Column<Session>[] = [
      { key: 'date', header: 'Ngày', sortable: true, accessor: r => r.playDate,
        render: r => new Date(r.playDate).toLocaleDateString('vi-VN') },
      { key: 'title', header: 'Buổi', accessor: r => r.title,
        render: r => <b>{r.title}</b> },
      { key: 'court', header: 'Sân', accessor: r => r.courtName || '' },
      { key: 'time', header: 'Giờ', render: r => `${r.startTime.slice(0,5)}–${r.endTime.slice(0,5)}` },
      { key: 'players', header: 'Người', className: 'num', accessor: r => r.participantCount },
      { key: 'income', header: 'Thu', className: 'num', sortable: true, accessor: r => r.totalIncome,
        render: r => <span style={{ color: 'var(--c-success)' }}>{fmt(r.totalIncome)}</span> },
      { key: 'expense', header: 'Chi', className: 'num', sortable: true, accessor: r => r.totalExpense,
        render: r => <span style={{ color: 'var(--c-danger)' }}>{fmt(r.totalExpense)}</span> },
      { key: 'balance', header: 'Lãi/lỗ', className: 'num', sortable: true, accessor: r => r.balance,
        render: r => <b style={{ color: r.balance >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>{fmt(r.balance)}</b> },
      { key: 'status', header: 'Trạng thái', render: r => <SessionStatusBadge status={r.status} /> },
      { key: 'actions', header: '', className: 'actions',
        render: r => (
          <>
            <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); nav(`/sessions/${r.id}`); }}>Chi tiết</button>
            {r.status !== 'Closed' && r.status !== 'Cancelled' && (
              <button className="btn btn-sm" onClick={async (e) => {
                e.stopPropagation();
                try { await closeSession(r.id); await load(); }
                catch (err: any) { alert(err?.response?.data?.message || 'Không thể chốt'); }
              }}>Chốt</button>
            )}
            {r.status === 'Closed' && (
              <button className="btn btn-sm btn-ghost" onClick={async (e) => {
                e.stopPropagation();
                const reason = prompt('Lý do mở lại?');
                if (!reason || reason.length < 5) return;
                await reopenSession(r.id, reason); await load();
              }}>Mở lại</button>
            )}
            {r.status !== 'Cancelled' && r.status !== 'Closed' && (
              <button className="btn btn-sm" style={{ background: 'var(--c-danger)' }} onClick={async (e) => {
                e.stopPropagation();
                const reason = prompt('Lý do hủy?'); if (!reason || reason.length < 3) return;
                await cancelSession(r.id, reason); await load();
              }}>Hủy</button>
            )}
          </>
        )}
    ];

    return (
      <div className="page">
        <PageHeader title="Buổi đánh" subtitle={`${total} buổi`}
          actions={<button className="btn" onClick={() => setOpen(true)}>+ Tạo buổi</button>} />
        <div className="filter-bar">
          <div className="form-field"><label>Từ ngày</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div>
          <div className="form-field"><label>Đến ngày</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></div>
          <div className="form-field"><label>Sân</label>
            <select value={courtId} onChange={e => { setCourtId(e.target.value); setPage(1); }}>
              <option value="">Tất cả</option>
              {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Trạng thái</label>
            <select value={status} onChange={e => { setStatus(e.target.value as any); setPage(1); }}>
              <option value="">Tất cả</option>
              <option value="Draft">Nháp</option>
              <option value="Open">Đang mở</option>
              <option value="Closed">Đã chốt</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        <DataTable columns={cols} rows={items} total={total} page={page}
          onPage={setPage} rowKey={r => r.id}
          onRowClick={r => nav(`/sessions/${r.id}`)}
          toolbar={<input className="grow" placeholder="Tìm theo tên buổi"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />} />

        <CreateSessionSheet open={open} onClose={() => setOpen(false)} courts={courts}
          onCreated={(id) => nav(`/sessions/${id}`)} />
      </div>
    );
  }

  // ------ Mobile (card list) ------
  return (
    <>
      <AppBar title="Buổi đánh" />
      <div className="page">
        {items.length === 0 && <p className="card-sub">Chưa có buổi nào. Bấm + để tạo mới.</p>}
        {items.map(s => (
          <div key={s.id} className="card" onClick={() => nav(`/sessions/${s.id}`)}>
            <div className="card-row">
              <div>
                <div className="card-title">{s.title}</div>
                <div className="card-sub">
                  {new Date(s.playDate).toLocaleDateString('vi-VN')} · {s.courtName}
                </div>
                <div className="card-sub">
                  {s.participantCount} người · Phí/slot: {fmt(s.feePerSlot)}
                </div>
              </div>
              <SessionStatusBadge status={s.status} />
            </div>
          </div>
        ))}
      </div>
      <button className="fab" onClick={() => setOpen(true)} aria-label="Tạo buổi">+</button>
      <CreateSessionSheet open={open} onClose={() => setOpen(false)} courts={courts}
        onCreated={(id) => nav(`/sessions/${id}`)} />
    </>
  );
}

function CreateSessionSheet({ open, onClose, courts, onCreated }: {
  open: boolean; onClose: () => void; courts: Court[]; onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('Buổi cầu lông');
  const [courtId, setCourtId] = useState('');
  const [playDate, setPlayDate] = useState(new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('21:00');
  const [templates, setTemplates] = useState<PricingTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>('');   // '' = auto-use default
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && !courtId && courts[0]) setCourtId(courts[0].id);
    if (open && templates.length === 0) {
      listPricingTemplates().then(r => setTemplates(r.data));
    }
  }, [open, courts, courtId, templates.length]);

  async function save() {
    if (!courtId) return;
    setBusy(true);
    try {
      const r = await createSession({
        title, courtId, playDate,
        startTime: start + ':00', endTime: end + ':00', courtCount: 1,
        pricingTemplateId: templateId || undefined
      } as any);
      onClose(); onCreated(r.data.id);
    } finally { setBusy(false); }
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Tạo buổi mới">
      <div className="form-field"><label>Tên buổi</label>
        <input value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div className="form-field"><label>Sân</label>
        <select value={courtId} onChange={e => setCourtId(e.target.value)}>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="form-field"><label>Ngày chơi</label>
        <input type="date" value={playDate} onChange={e => setPlayDate(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="form-field" style={{ flex: 1 }}><label>Bắt đầu</label>
          <input type="time" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div className="form-field" style={{ flex: 1 }}><label>Kết thúc</label>
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} /></div>
      </div>
      <div className="form-field"><label>Template thu tiền</label>
        <select value={templateId} onChange={e => setTemplateId(e.target.value)}>
          <option value="">— Mặc định ({templates.find(t => t.isDefault)?.name || 'không có'}) —</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.mode === 'WeightedSlot' ? 'Tỷ lệ' : t.mode === 'FixedAmount' ? 'Cố định' : 'Chia đều'})
            </option>
          ))}
        </select>
      </div>
      <button className="btn full" onClick={save} disabled={busy || !courtId}>Tạo buổi</button>
    </ResponsiveSheet>
  );
}
