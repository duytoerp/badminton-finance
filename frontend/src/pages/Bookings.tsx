import { useEffect, useMemo, useState } from 'react';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import DataTable, { Column } from '../components/common/DataTable';
import ResponsiveSheet from '../components/common/ResponsiveSheet';
import {
  BookingRecurrenceType, Court, CourtBooking, CreateCourtBookingBody, PricingTemplate,
  createCourtBooking, deleteCourtBooking, listCourtBookings, listCourts, listPricingTemplates, previewCourtBooking
} from '../api/endpoints';
import { useIsDesktop } from '../hooks/useBreakpoint';

const WEEKDAYS = [
  { v: 1, label: 'T2' }, { v: 2, label: 'T3' }, { v: 3, label: 'T4' },
  { v: 4, label: 'T5' }, { v: 5, label: 'T6' }, { v: 6, label: 'T7' }, { v: 0, label: 'CN' }
];

const RECURRENCE_LABEL: Record<BookingRecurrenceType, string> = {
  SingleDates: 'Theo ngày',
  MonthlyByWeekday: 'Theo tháng – theo thứ',
  MonthlyByDayOfMonth: 'Theo tháng – theo ngày'
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export default function Bookings() {
  const desktop = useIsDesktop();
  const [items, setItems] = useState<CourtBooking[]>([]);
  const [open, setOpen] = useState(false);

  async function load() { const r = await listCourtBookings(); setItems(r.data); }
  useEffect(() => { load(); }, []);

  async function onDelete(id: string) {
    if (!confirm('Xoá lịch đặt này? (các buổi đã tạo sẽ giữ nguyên)')) return;
    await deleteCourtBooking(id); await load();
  }

  const cols: Column<CourtBooking>[] = [
    { key: 'title', header: 'Tên lịch', accessor: r => r.title, render: r => <b>{r.title}</b> },
    { key: 'court', header: 'Sân', accessor: r => r.courtName || '' },
    { key: 'type', header: 'Kiểu lặp', render: r => RECURRENCE_LABEL[r.recurrenceType] },
    { key: 'range', header: 'Khoảng',
      render: r => `${new Date(r.fromDate).toLocaleDateString('vi-VN')} → ${new Date(r.toDate).toLocaleDateString('vi-VN')}` },
    { key: 'time', header: 'Giờ', render: r => `${r.startTime.slice(0,5)}–${r.endTime.slice(0,5)}` },
    { key: 'count', header: 'Số buổi', className: 'num', accessor: r => r.generatedSessionCount,
      render: r => <b>{r.generatedSessionCount}</b> },
    { key: 'actions', header: '', className: 'actions',
      render: r => <button className="btn btn-sm" style={{ background: 'var(--c-danger)' }} onClick={() => onDelete(r.id)}>Xoá</button> }
  ];

  const desktopView = (
    <>
      <PageHeader title="Đặt sân (lịch lặp)" subtitle={`${items.length} lịch`}
        actions={<button className="btn" onClick={() => setOpen(true)}>+ Tạo lịch đặt</button>} />
      <DataTable columns={cols} rows={items} rowKey={r => r.id} />
    </>
  );

  const mobileView = (
    <>
      <AppBar title="Đặt sân" />
      {items.length === 0 && <p className="card-sub">Chưa có lịch nào. Bấm + để tạo.</p>}
      {items.map(b => (
        <div className="card" key={b.id}>
          <div className="card-row">
            <div>
              <div className="card-title">{b.title}</div>
              <div className="card-sub">{b.courtName} · {RECURRENCE_LABEL[b.recurrenceType]}</div>
              <div className="card-sub">
                {new Date(b.fromDate).toLocaleDateString('vi-VN')} → {new Date(b.toDate).toLocaleDateString('vi-VN')} ·
                {' '}{b.startTime.slice(0,5)}–{b.endTime.slice(0,5)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ fontSize: 18 }}>{b.generatedSessionCount}</b>
              <div className="card-sub">buổi</div>
              <button className="btn btn-sm btn-ghost" onClick={() => onDelete(b.id)}>Xoá</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="page">
      {desktop ? desktopView : mobileView}
      {!desktop && <button className="fab" onClick={() => setOpen(true)}>+</button>}
      <BookingSheet open={open} onClose={() => setOpen(false)} onDone={load} />
    </div>
  );
}

function BookingSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('Lịch đặt sân');
  const [courts, setCourts] = useState<Court[]>([]);
  const [templates, setTemplates] = useState<PricingTemplate[]>([]);
  const [courtId, setCourtId] = useState('');
  const [type, setType] = useState<BookingRecurrenceType>('SingleDates');

  // SingleDates
  const [singleDates, setSingleDates] = useState<string[]>([todayIso()]);
  // Monthly
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(plusDays(todayIso(), 30));
  const [weekdays, setWeekdays] = useState<number[]>([2, 4]); // T3, T5
  const [daysOfMonth, setDaysOfMonth] = useState('5, 20');

  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('21:00');
  const [courtCount, setCourtCount] = useState(1);
  const [templateId, setTemplateId] = useState('');
  const [note, setNote] = useState('');

  const [preview, setPreview] = useState<{ count: number; dates: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (courts.length === 0) listCourts().then(r => { setCourts(r.data); if (r.data[0] && !courtId) setCourtId(r.data[0].id); });
    if (templates.length === 0) listPricingTemplates().then(r => setTemplates(r.data));
  }, [open]); // eslint-disable-line

  const body: CreateCourtBookingBody | null = useMemo(() => {
    if (!courtId) return null;
    const base = {
      title: title.trim() || 'Lịch đặt sân',
      courtId,
      recurrenceType: type,
      startTime: start + ':00',
      endTime: end + ':00',
      courtCount,
      pricingTemplateId: templateId || undefined,
      note: note || undefined
    };
    if (type === 'SingleDates') {
      const pat = singleDates.filter(Boolean).join(',');
      return { ...base, pattern: pat } as CreateCourtBookingBody;
    }
    if (type === 'MonthlyByWeekday') {
      return { ...base, pattern: weekdays.join(','), fromDate, toDate } as CreateCourtBookingBody;
    }
    return { ...base, pattern: daysOfMonth, fromDate, toDate } as CreateCourtBookingBody;
  }, [title, courtId, type, singleDates, weekdays, daysOfMonth, fromDate, toDate, start, end, courtCount, templateId, note]);

  // auto-preview when inputs change
  useEffect(() => {
    if (!open || !body) { setPreview(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await previewCourtBooking(body);
        if (!cancelled) setPreview(r.data);
      } catch { if (!cancelled) setPreview(null); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, body]);

  async function save() {
    if (!body) return;
    setBusy(true);
    try {
      const r = await createCourtBooking(body);
      alert(`Đã tạo ${r.data.generatedSessionCount} buổi.`);
      onClose(); onDone();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Lỗi khi tạo lịch.');
    } finally { setBusy(false); }
  }

  function toggleWeekday(v: number) {
    setWeekdays(ws => ws.includes(v) ? ws.filter(x => x !== v) : [...ws, v].sort());
  }

  function updateSingleDate(idx: number, v: string) {
    setSingleDates(arr => arr.map((d, i) => i === idx ? v : d));
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Tạo lịch đặt sân">
      <div className="form-field"><label>Tên lịch</label>
        <input value={title} onChange={e => setTitle(e.target.value)} /></div>

      <div className="form-field"><label>Sân</label>
        <select value={courtId} onChange={e => setCourtId(e.target.value)}>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="form-field"><label>Kiểu lặp</label>
        <select value={type} onChange={e => setType(e.target.value as BookingRecurrenceType)}>
          <option value="SingleDates">Theo ngày (chọn từng ngày)</option>
          <option value="MonthlyByWeekday">Theo tháng – theo thứ</option>
          <option value="MonthlyByDayOfMonth">Theo tháng – theo ngày</option>
        </select>
      </div>

      {type === 'SingleDates' && (
        <div className="form-field">
          <label>Các ngày chơi</label>
          {singleDates.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input type="date" value={d} onChange={e => updateSingleDate(i, e.target.value)} style={{ flex: 1 }} />
              {singleDates.length > 1 && (
                <button className="btn btn-sm btn-ghost" onClick={() => setSingleDates(arr => arr.filter((_, k) => k !== i))}>×</button>
              )}
            </div>
          ))}
          <button className="btn btn-sm btn-ghost" onClick={() => setSingleDates(arr => [...arr, todayIso()])}>+ Thêm ngày</button>
        </div>
      )}

      {(type === 'MonthlyByWeekday' || type === 'MonthlyByDayOfMonth') && (
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-field" style={{ flex: 1 }}><label>Từ ngày</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
          <div className="form-field" style={{ flex: 1 }}><label>Đến ngày</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        </div>
      )}

      {type === 'MonthlyByWeekday' && (
        <div className="form-field">
          <label>Thứ trong tuần</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {WEEKDAYS.map(w => (
              <button key={w.v} type="button"
                className={'btn btn-sm ' + (weekdays.includes(w.v) ? '' : 'btn-ghost')}
                onClick={() => toggleWeekday(w.v)}>{w.label}</button>
            ))}
          </div>
        </div>
      )}

      {type === 'MonthlyByDayOfMonth' && (
        <div className="form-field">
          <label>Ngày trong tháng (1–31, cách nhau dấu phẩy)</label>
          <input value={daysOfMonth} onChange={e => setDaysOfMonth(e.target.value)} placeholder="VD: 5, 20" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <div className="form-field" style={{ flex: 1 }}><label>Bắt đầu</label>
          <input type="time" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div className="form-field" style={{ flex: 1 }}><label>Kết thúc</label>
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} /></div>
        <div className="form-field" style={{ width: 80 }}><label>Số sân</label>
          <input type="number" min={1} value={courtCount} onChange={e => setCourtCount(Number(e.target.value) || 1)} /></div>
      </div>

      <div className="form-field"><label>Template thu tiền</label>
        <select value={templateId} onChange={e => setTemplateId(e.target.value)}>
          <option value="">— Mặc định ({templates.find(t => t.isDefault)?.name || 'không có'}) —</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="form-field"><label>Ghi chú</label>
        <input value={note} onChange={e => setNote(e.target.value)} /></div>

      <div className="card" style={{ background: 'var(--c-bg-soft, #f5f7fb)' }}>
        {preview === null && <div className="card-sub">Đang tính số buổi…</div>}
        {preview && preview.count === 0 && <div className="card-sub" style={{ color: 'var(--c-danger)' }}>Không có ngày nào khớp.</div>}
        {preview && preview.count > 0 && (
          <>
            <div><b>Sẽ tạo {preview.count} buổi</b></div>
            <div className="card-sub" style={{ marginTop: 4, lineHeight: 1.5 }}>
              {preview.dates.slice(0, 8).map(d => new Date(d).toLocaleDateString('vi-VN')).join(' · ')}
              {preview.dates.length > 8 ? ` … (+${preview.dates.length - 8})` : ''}
            </div>
          </>
        )}
      </div>

      <button className="btn full" disabled={busy || !preview || preview.count === 0} onClick={save}>
        {busy ? 'Đang tạo…' : `Tạo ${preview?.count ?? 0} buổi`}
      </button>
    </ResponsiveSheet>
  );
}
