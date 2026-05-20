import { useEffect, useState } from 'react';
import AppBar from '../../components/layout/AppBar';
import { PageHeader } from '../../components/layout/Shell';
import DataTable, { Column } from '../../components/common/DataTable';
import ResponsiveSheet from '../../components/common/ResponsiveSheet';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import {
  createExpenseTemplate, deleteExpenseTemplate, listExpenseTemplates, updateExpenseTemplate,
  ExpenseTemplate, ExpenseTemplateItem, ExpenseCalcType
} from '../../api/endpoints';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

const CALC_LABEL: Record<ExpenseCalcType, string> = {
  FixedAmount: 'Cố định',
  CourtHourlyRate: 'Theo giá giờ sân',
  PerHour: '× giờ',
  PerCourt: '× số sân',
  PerHourPerCourt: '× giờ × số sân'
};

const CALC_HINT: Record<ExpenseCalcType, string> = {
  FixedAmount: 'Lấy số tiền ở ô Số tiền',
  CourtHourlyRate: 'Số giờ × giá/giờ của sân × số sân (bỏ qua Số tiền)',
  PerHour: 'Số tiền × số giờ',
  PerCourt: 'Số tiền × số sân',
  PerHourPerCourt: 'Số tiền × số giờ × số sân'
};

export default function ExpenseTemplatesPage() {
  const desktop = useIsDesktop();
  const [items, setItems] = useState<ExpenseTemplate[]>([]);
  const [editing, setEditing] = useState<ExpenseTemplate | 'new' | null>(null);

  async function load() { const r = await listExpenseTemplates(); setItems(r.data); }
  useEffect(() => { load(); }, []);

  async function onDelete(t: ExpenseTemplate) {
    if (!confirm(`Xoá template "${t.name}"?`)) return;
    await deleteExpenseTemplate(t.id); load();
  }

  if (desktop) {
    const cols: Column<ExpenseTemplate>[] = [
      { key: 'name', header: 'Tên', accessor: r => r.name,
        render: r => <><b>{r.name}</b>{r.isDefault && <span className="badge paid" style={{ marginLeft: 6 }}>Mặc định</span>}</> },
      { key: 'desc', header: 'Mô tả', accessor: r => r.description || '' },
      { key: 'items', header: 'Khoản chi', className: 'num',
        render: r => <b>{r.items.length}</b> },
      { key: 'active', header: 'Hoạt động', render: r => r.isActive ? '✅' : '🚫' },
      { key: 'act', header: '', className: 'actions',
        render: r => (
          <>
            <button className="btn btn-sm" onClick={() => setEditing(r)}>Sửa</button>
            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--c-danger)' }} onClick={() => onDelete(r)}>Xoá</button>
          </>
        ) }
    ];
    return (
      <div className="page">
        <PageHeader title="Template chi phí đặt sân" subtitle={`${items.length} template`}
          actions={<button className="btn" onClick={() => setEditing('new')}>+ Thêm template</button>} />
        <DataTable columns={cols} rows={items} rowKey={r => r.id} />
        <EditSheet open={editing !== null} value={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)} onDone={load} />
      </div>
    );
  }

  return (
    <>
      <AppBar title="Template chi phí" />
      <div className="page">
        {items.length === 0 && <p className="card-sub">Chưa có template nào.</p>}
        {items.map(t => (
          <div className="card" key={t.id} onClick={() => setEditing(t)}>
            <div className="card-row">
              <div>
                <div className="card-title">{t.name}{t.isDefault && <span className="badge paid" style={{ marginLeft: 6 }}>Mặc định</span>}</div>
                <div className="card-sub">{t.description || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{t.items.length}</div>
                <div className="card-sub" style={{ fontSize: 11 }}>khoản</div>
              </div>
            </div>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: 20 }}>
              {t.items.slice(0, 4).map((i, k) => (
                <li key={k} className="card-sub" style={{ fontSize: 12 }}>
                  {i.name} — <span style={{ color: 'var(--c-primary)' }}>{CALC_LABEL[i.calculationType]}</span>
                  {i.calculationType !== 'CourtHourlyRate' && i.amount > 0 && <> · {fmt(i.amount)}</>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button className="fab" onClick={() => setEditing('new')}>+</button>
      <EditSheet open={editing !== null} value={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)} onDone={load} />
    </>
  );
}

function EditSheet({ open, value, onClose, onDone }: {
  open: boolean; value: ExpenseTemplate | null; onClose: () => void; onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<ExpenseTemplateItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (value) {
      setName(value.name); setDesc(value.description || '');
      setIsDefault(value.isDefault); setIsActive(value.isActive);
      setItems(value.items.map(i => ({ ...i })));
    } else {
      setName(''); setDesc(''); setIsDefault(false); setIsActive(true);
      setItems([
        { name: 'Tiền sân', calculationType: 'CourtHourlyRate', amount: 0, sortOrder: 0 }
      ]);
    }
  }, [open, value]);

  function updateItem(idx: number, patch: Partial<ExpenseTemplateItem>) {
    setItems(arr => arr.map((it, k) => k === idx ? { ...it, ...patch } : it));
  }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const body = {
        name: name.trim(), description: desc.trim() || undefined,
        isDefault, isActive,
        items: items.map((i, k) => ({ ...i, sortOrder: k }))
      };
      if (value) await updateExpenseTemplate(value.id, body);
      else await createExpenseTemplate(body);
      onClose(); onDone();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Lưu thất bại.');
    } finally { setBusy(false); }
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={value ? `Sửa: ${value.name}` : 'Thêm template'}>
      <div className="form-field"><label>Tên *</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      <div className="form-field"><label>Mô tả</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="form-field" style={{ display: 'flex', gap: 16 }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
          Mặc định
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          Đang hoạt động
        </label>
      </div>

      <h4 style={{ margin: '12px 0 8px 0' }}>Các khoản chi</h4>
      {items.map((it, idx) => (
        <div key={idx} className="card" style={{ padding: 10 }}>
          <div className="form-field" style={{ marginBottom: 6 }}>
            <label>Tên khoản chi *</label>
            <input value={it.name} onChange={e => updateItem(idx, { name: e.target.value })} placeholder="VD: Tiền sân, Tiền cầu" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-field" style={{ flex: 2 }}>
              <label>Cách tính</label>
              <select value={it.calculationType}
                onChange={e => updateItem(idx, { calculationType: e.target.value as ExpenseCalcType })}>
                {(Object.keys(CALC_LABEL) as ExpenseCalcType[]).map(k =>
                  <option key={k} value={k}>{CALC_LABEL[k]}</option>
                )}
              </select>
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label>Số tiền (đ)</label>
              <input inputMode="numeric" value={String(it.amount || 0)}
                disabled={it.calculationType === 'CourtHourlyRate'}
                onChange={e => updateItem(idx, { amount: Number(e.target.value.replace(/\D/g, '') || 0) })} />
            </div>
          </div>
          <div className="card-sub" style={{ fontSize: 12 }}>{CALC_HINT[it.calculationType]}</div>
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--c-danger)' }}
              onClick={() => setItems(arr => arr.filter((_, k) => k !== idx))}>Xoá khoản</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() =>
        setItems(arr => [...arr, { name: '', calculationType: 'FixedAmount', amount: 0, sortOrder: arr.length }])
      }>+ Thêm khoản chi</button>

      <button className="btn full" disabled={busy || !name.trim()} onClick={save} style={{ marginTop: 12 }}>
        Lưu
      </button>
    </ResponsiveSheet>
  );
}
