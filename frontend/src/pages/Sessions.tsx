import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import ResponsiveSheet from '../components/common/ResponsiveSheet';
import { SessionStatusBadge } from '../components/common/StatusBadge';
import DataTable, { Column } from '../components/common/DataTable';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { useAuth } from '../store/auth';
import {
  cancelSession, closeSession, createSession, filterSessions, listCourts,
  listPricingTemplates, reopenSession,
  Court, PricingTemplate, Session, SessionStatus
} from '../api/endpoints';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);
const fmtVnDate = (iso: string) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('vi-VN') : 'dd/mm/yyyy';

export default function Sessions() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const canManage = useAuth(s => s.canManageSessions)();
  const [items, setItems] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [courtId, setCourtId] = useState('');
  const [status, setStatus] = useState<SessionStatus | ''>('');
  const [search, setSearch] = useState('');
  // mobile-only time-of-day filter (applied client-side to s.startTime)
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  const [courts, setCourts] = useState<Court[]>([]);
  const [open, setOpen] = useState(false);
  const [mobileDefaultsApplied, setMobileDefaultsApplied] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // On mobile, default the date filter to TODAY. Only runs once on first mobile render
  // (and only if user hasn't manually picked dates yet).
  useEffect(() => {
    if (!desktop && !mobileDefaultsApplied && !from && !to) {
      const t = TODAY_ISO();
      setFrom(t); setTo(t);
      setMobileDefaultsApplied(true);
    }
  }, [desktop, mobileDefaultsApplied, from, to]);

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

  // Client-side time-of-day filter for mobile (backend doesn't support time-range filtering).
  // Compares against the session's StartTime ("HH:MM:SS" string).
  const visibleItems = !desktop && (timeFrom || timeTo)
    ? items.filter(s => {
        const st = (s.startTime || '').slice(0, 5);
        if (timeFrom && st < timeFrom) return false;
        if (timeTo   && st > timeTo)   return false;
        return true;
      })
    : items;

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
            {canManage && r.status !== 'Closed' && r.status !== 'Cancelled' && (
              <button className="btn btn-sm" onClick={async (e) => {
                e.stopPropagation();
                try { await closeSession(r.id); await load(); }
                catch (err: any) { alert(err?.response?.data?.message || 'Không thể chốt'); }
              }}>Chốt</button>
            )}
            {canManage && r.status === 'Closed' && (
              <button className="btn btn-sm btn-ghost" onClick={async (e) => {
                e.stopPropagation();
                const reason = prompt('Lý do mở lại?');
                if (!reason || reason.length < 5) return;
                await reopenSession(r.id, reason); await load();
              }}>Mở lại</button>
            )}
            {canManage && r.status !== 'Cancelled' && r.status !== 'Closed' && (
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
          actions={canManage ? <button className="btn" onClick={() => setOpen(true)}>+ Tạo buổi</button> : undefined} />
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
  // Treat dates as a single "day" picker when from == to (the default + most common case).
  const isSingleDay = !!from && from === to;
  const isToday = isSingleDay && from === TODAY_ISO();
  const extraActive = [courtId, status, timeFrom, timeTo].filter(Boolean).length;
  const filterActive = !isToday || extraActive > 0;

  function pickDay(iso: string) {
    setFrom(iso); setTo(iso); setPage(1);
  }
  function shiftRange(delta: number) {
    const base = from || TODAY_ISO();
    const baseTo = to || base;
    const d1 = new Date(base   + 'T00:00:00'); d1.setDate(d1.getDate() + delta);
    const d2 = new Date(baseTo + 'T00:00:00'); d2.setDate(d2.getDate() + delta);
    setFrom(d1.toISOString().slice(0, 10));
    setTo(d2.toISOString().slice(0, 10));
    setPage(1);
  }
  function setFromDate(iso: string) {
    setFrom(iso);
    // If user picks a "from" later than current "to", snap "to" up to keep range valid.
    if (iso && to && iso > to) setTo(iso);
    setPage(1);
  }
  function setToDate(iso: string) {
    setTo(iso);
    if (iso && from && iso < from) setFrom(iso);
    setPage(1);
  }
  function clearAll() {
    pickDay(TODAY_ISO());
    setCourtId(''); setStatus(''); setSearch(''); setTimeFrom(''); setTimeTo('');
  }

  const dayLabel = isSingleDay
    ? (from === TODAY_ISO() ? 'Hôm nay' : new Date(from + 'T00:00:00').toLocaleDateString('vi-VN'))
    : (from || to ? `${fmtVnDate(from)} → ${fmtVnDate(to)}` : 'Tất cả');

  return (
    <>
      <AppBar title="Buổi đánh" />
      <div className="page">
        {/* ---- Tiny status line — info only, all controls live in the filter FAB sheet ---- */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, color: 'var(--c-muted, #888)', padding: '6px 4px 10px'
        }}>
          <span>
            <b style={{ color: 'var(--c-text)' }}>{dayLabel}</b>
            {courtId && ` · ${courts.find(c => c.id === courtId)?.name}`}
            {status && ` · ${status === 'Draft' ? 'Nháp' : status === 'Open' ? 'Đang mở' : status === 'Closed' ? 'Đã chốt' : 'Đã hủy'}`}
            {(timeFrom || timeTo) && ` · ${timeFrom || '…'}–${timeTo || '…'}`}
          </span>
          <span><b>{visibleItems.length}</b> buổi</span>
        </div>

        {visibleItems.length === 0 && (
          <p className="card-sub" style={{ textAlign: 'center', padding: 16 }}>
            {items.length === 0 ? (canManage ? 'Chưa có buổi nào. Bấm + để tạo mới.' : 'Chưa có buổi nào.') : 'Không có buổi nào khớp lọc.'}
          </p>
        )}
        {visibleItems.map(s => (
          <div key={s.id} className="card" onClick={() => nav(`/sessions/${s.id}`)}>
            <div className="card-row">
              <div>
                <div className="card-title">{s.title}</div>
                <div className="card-sub">
                  {new Date(s.playDate).toLocaleDateString('vi-VN')} · {s.courtName}
                  {' · '}{s.startTime.slice(0,5)}–{s.endTime.slice(0,5)}
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
      {/* Filter FAB — stacked above the create FAB on the right edge. */}
      <button className="fab" onClick={() => setMobileFilterOpen(true)} aria-label="Lọc"
        style={{
          bottom: 'calc(var(--bn-height) + var(--safe-bottom) + 16px + 68px)',
          background: filterActive ? 'var(--c-primary)' : 'var(--c-bg, #fff)',
          color: filterActive ? 'white' : 'var(--c-text)',
          border: '1px solid var(--c-border)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
          fontSize: 22
        }}>
        🔍
        {(extraActive > 0 || !isToday) && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            background: 'var(--c-danger)', color: 'white',
            borderRadius: 999, padding: '0 6px',
            fontSize: 11, lineHeight: '16px', fontWeight: 700
          }}>
            {(isToday ? 0 : 1) + extraActive}
          </span>
        )}
      </button>

      {canManage && <button className="fab" onClick={() => setOpen(true)} aria-label="Tạo buổi">+</button>}

      <MobileFilterSheet
        open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)}
        from={from} to={to} courtId={courtId} status={status}
        timeFrom={timeFrom} timeTo={timeTo} courts={courts}
        isToday={isToday} filterActive={filterActive}
        setFromDate={setFromDate} setToDate={setToDate}
        setCourtId={(v) => { setCourtId(v); setPage(1); }}
        setStatus={(v) => { setStatus(v); setPage(1); }}
        setTimeFrom={setTimeFrom} setTimeTo={setTimeTo}
        shiftRange={shiftRange} pickToday={() => pickDay(TODAY_ISO())}
        clearAll={clearAll} />

      <CreateSessionSheet open={open} onClose={() => setOpen(false)} courts={courts}
        onCreated={(id) => nav(`/sessions/${id}`)} />
    </>
  );
}

// Native <input type="date"> overlaid on a span showing the value in dd/mm/yyyy format.
// Click opens the native picker (best UX on mobile) while the visible text is locale-formatted.
function DateField({ value, onChange, ariaLabel }: {
  value: string; onChange: (iso: string) => void; ariaLabel: string;
}) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{
        padding: '7px 8px', borderRadius: 8, border: '1px solid var(--c-border)',
        fontSize: 13, textAlign: 'center', background: 'var(--c-bg, #fff)',
        color: value ? 'var(--c-text)' : 'var(--c-muted, #888)'
      }}>
        {fmtVnDate(value)}
      </div>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
        style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
    </div>
  );
}

// Filter sheet opened from the floating filter button on mobile.
function MobileFilterSheet(props: {
  open: boolean; onClose: () => void;
  from: string; to: string; courtId: string; status: SessionStatus | '';
  timeFrom: string; timeTo: string; courts: Court[];
  isToday: boolean; filterActive: boolean;
  setFromDate: (iso: string) => void; setToDate: (iso: string) => void;
  setCourtId: (id: string) => void;
  setStatus: (s: SessionStatus | '') => void;
  setTimeFrom: (t: string) => void; setTimeTo: (t: string) => void;
  shiftRange: (delta: number) => void; pickToday: () => void; clearAll: () => void;
}) {
  const {
    open, onClose, from, to, courtId, status, timeFrom, timeTo, courts,
    isToday, filterActive,
    setFromDate, setToDate, setCourtId, setStatus, setTimeFrom, setTimeTo,
    shiftRange, pickToday, clearAll
  } = props;

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="🔍 Lọc buổi đánh">
      <div className="form-field">
        <label>Ngày</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="card-sub" style={{ fontSize: 12, minWidth: 26 }}>Từ</span>
          <DateField value={from} onChange={setFromDate} ariaLabel="Từ ngày" />
          <span className="card-sub" style={{ fontSize: 12, minWidth: 36 }}>→ Đến</span>
          <DateField value={to} onChange={setToDate} ariaLabel="Đến ngày" />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => shiftRange(-1)}
            style={{ flex: 1 }}>‹ Hôm trước</button>
          <button className={'btn btn-sm ' + (isToday ? '' : 'btn-ghost')} onClick={pickToday}
            style={{ flex: 1 }}>Hôm nay</button>
          <button className="btn btn-sm btn-ghost" onClick={() => shiftRange(1)}
            style={{ flex: 1 }}>Hôm sau ›</button>
        </div>
      </div>

      <div className="form-field">
        <label>Sân</label>
        <select value={courtId} onChange={e => setCourtId(e.target.value)}>
          <option value="">🏸 Tất cả sân</option>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label>Trạng thái</label>
        <select value={status} onChange={e => setStatus(e.target.value as any)}>
          <option value="">Tất cả</option>
          <option value="Draft">Nháp</option>
          <option value="Open">Đang mở</option>
          <option value="Closed">Đã chốt</option>
          <option value="Cancelled">Đã hủy</option>
        </select>
      </div>

      <div className="form-field">
        <label>Giờ bắt đầu (trong khoảng)</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)}
            style={{ flex: 1 }} />
          <span className="card-sub">→</span>
          <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)}
            style={{ flex: 1 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }}
          disabled={!filterActive} onClick={clearAll}>✕ Xoá lọc</button>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Xong</button>
      </div>
    </ResponsiveSheet>
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
