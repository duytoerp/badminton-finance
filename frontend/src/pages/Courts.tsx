import { useEffect, useState } from 'react';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import DataTable, { Column } from '../components/common/DataTable';
import ResponsiveSheet from '../components/common/ResponsiveSheet';
import { createCourt, listCourts, Court } from '../api/endpoints';
import { useIsDesktop } from '../hooks/useBreakpoint';

export default function Courts() {
  const desktop = useIsDesktop();
  const [items, setItems] = useState<Court[]>([]);
  const [open, setOpen] = useState(false);

  async function load() { const r = await listCourts(); setItems(r.data); }
  useEffect(() => { load(); }, []);

  const cols: Column<Court>[] = [
    { key: 'name', header: 'Tên sân', sortable: true, accessor: r => r.name, render: r => <b>{r.name}</b> },
    { key: 'addr', header: 'Địa chỉ', accessor: r => r.address || '' },
    { key: 'rate', header: 'Giá/giờ', className: 'num', sortable: true, accessor: r => r.defaultHourlyRate,
      render: r => r.defaultHourlyRate.toLocaleString('vi-VN') + 'đ' },
    { key: 'active', header: 'Hoạt động', render: r => r.isActive ? '✅' : '🚫' }
  ];

  const content = desktop ? (
    <>
      <PageHeader title="Quản lý sân" subtitle={`${items.length} sân`}
        actions={<button className="btn" onClick={() => setOpen(true)}>+ Thêm sân</button>} />
      <DataTable columns={cols} rows={items} rowKey={r => r.id} />
    </>
  ) : (
    <>
      <AppBar title="Sân" />
      {items.map(c => (
        <div className="card" key={c.id}>
          <div className="card-row">
            <div>
              <div className="card-title">{c.name}</div>
              <div className="card-sub">{c.address || '—'}</div>
            </div>
            <b>{c.defaultHourlyRate.toLocaleString('vi-VN')}đ/h</b>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="page">
      {content}
      {!desktop && <button className="fab" onClick={() => setOpen(true)}>+</button>}
      <CourtSheet open={open} onClose={() => setOpen(false)} onDone={load} />
    </div>
  );
}

function CourtSheet({ open, onClose, onDone }: any) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCourt({ name: name.trim(), address: address || undefined, defaultHourlyRate: Number(rate) || 0 } as any);
      setName(''); setAddress(''); setRate(''); onClose(); onDone();
    } finally { setBusy(false); }
  }
  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Thêm sân">
      <div className="form-field"><label>Tên sân *</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      <div className="form-field"><label>Địa chỉ</label>
        <input value={address} onChange={e => setAddress(e.target.value)} /></div>
      <div className="form-field"><label>Giá/giờ (đ)</label>
        <input inputMode="numeric" value={rate} onChange={e => setRate(e.target.value.replace(/\D/g, ''))} /></div>
      <button className="btn full" disabled={busy || !name.trim()} onClick={save}>Lưu</button>
    </ResponsiveSheet>
  );
}
