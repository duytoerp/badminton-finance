import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/Shell';
import DataTable, { Column } from '../../components/common/DataTable';
import ResponsiveSheet from '../../components/common/ResponsiveSheet';
import {
  createPricingTemplate, deletePricingTemplate, listPricingTemplates, updatePricingTemplate,
  Gender, SkillLevel, PricingMode, PricingTemplate, PricingTemplateRule
} from '../../api/endpoints';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';
const genderLabel = (g?: Gender | null) =>
  g === 'Male' ? 'Nam' : g === 'Female' ? 'Nữ' : g === 'Other' ? 'Khác' : 'Tất cả';
const skillLabel = (s?: SkillLevel | null) =>
  s === 'Beginner' ? 'Yếu' : s === 'Intermediate' ? 'TB' : s === 'Advanced' ? 'Khá' : 'Tất cả';
const modeLabel = (m: PricingMode) =>
  m === 'WeightedSlot' ? 'Chia theo tỷ lệ'
  : m === 'FixedAmount' ? 'Thu tiền cố định'
  : 'Chia đều theo người';

export default function PricingTemplatesAdmin() {
  const [items, setItems] = useState<PricingTemplate[]>([]);
  const [editing, setEditing] = useState<PricingTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const r = await listPricingTemplates();
    setItems(r.data);
  }
  useEffect(() => { load(); }, []);

  const cols: Column<PricingTemplate>[] = [
    { key: 'name', header: 'Tên', sortable: true, accessor: r => r.name,
      render: r => <><b>{r.name}</b>{r.isDefault && <span className="badge open" style={{ marginLeft: 8 }}>Mặc định</span>}</> },
    { key: 'mode', header: 'Chế độ', accessor: r => r.mode,
      render: r => <span className="badge open">{modeLabel(r.mode)}</span> },
    { key: 'desc', header: 'Mô tả', accessor: r => r.description || '' },
    { key: 'rules', header: 'Số rule', className: 'num', accessor: r => r.rules.length },
    { key: 'preview', header: 'Tóm tắt', render: r =>
        r.mode === 'EqualPerHead'
          ? <span className="card-sub">Tổng chi / số người</span>
          : <span className="card-sub">
              {r.rules.slice(0, 3).map((rule, i) =>
                <span key={i}>
                  {genderLabel(rule.gender)}/{skillLabel(rule.skillLevel)}:
                  {' '}{r.mode === 'FixedAmount' ? fmt(rule.fixedAmount) : `×${rule.multiplier}`}
                  {i < Math.min(2, r.rules.length - 1) ? ' · ' : ''}
                </span>
              )}
              {r.rules.length > 3 && <span> · …</span>}
            </span>
      },
    { key: 'act', header: '', className: 'actions',
      render: r => (
        <>
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(r)}>Sửa</button>
          <button className="btn btn-sm" style={{ background: 'var(--c-danger)' }}
            disabled={r.isDefault}
            onClick={async () => {
              if (!confirm(`Xóa template "${r.name}"?`)) return;
              try { await deletePricingTemplate(r.id); await load(); }
              catch (e: any) { alert(e?.response?.data?.message || 'Không xóa được'); }
            }}>Xóa</button>
        </>
      ) }
  ];

  return (
    <div className="page">
      <PageHeader title="Template thu tiền"
        subtitle="3 chế độ: Chia theo tỷ lệ (Hệ số), Thu tiền cố định, hoặc Chia đều theo người"
        actions={<button className="btn" onClick={() => setCreating(true)}>+ Thêm template</button>} />
      <DataTable columns={cols} rows={items} rowKey={r => r.id} />
      <TemplateSheet open={creating} onClose={() => setCreating(false)} onDone={load} />
      <TemplateSheet open={!!editing} edit={editing ?? undefined} onClose={() => setEditing(null)} onDone={load} />
    </div>
  );
}

function TemplateSheet({ open, onClose, onDone, edit }: {
  open: boolean; onClose: () => void; onDone: () => void; edit?: PricingTemplate;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<PricingMode>('WeightedSlot');
  const [isDefault, setIsDefault] = useState(false);
  const [rules, setRules] = useState<PricingTemplateRule[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setName(edit.name); setDescription(edit.description || '');
      setMode(edit.mode); setIsDefault(edit.isDefault);
      setRules(edit.rules.map(r => ({ ...r })));
    } else {
      setName(''); setDescription(''); setMode('WeightedSlot'); setIsDefault(false);
      setRules([{ gender: 'Female', skillLevel: null, multiplier: 0.7, fixedAmount: 0 }]);
    }
  }, [open, edit]);

  function addRule() {
    setRules([...rules, { gender: null, skillLevel: null, multiplier: 1.0, fixedAmount: 0 }]);
  }
  function updateRule(i: number, patch: Partial<PricingTemplateRule>) {
    setRules(rules.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function removeRule(i: number) { setRules(rules.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        description: description || undefined,
        mode,
        isDefault,
        rules: mode === 'EqualPerHead' ? [] : rules.map(r => ({
          gender: r.gender || undefined,
          skillLevel: r.skillLevel || undefined,
          multiplier: Number(r.multiplier) || 1,
          fixedAmount: Number(r.fixedAmount) || 0
        }))
      } as any;
      if (edit) await updatePricingTemplate(edit.id, body);
      else await createPricingTemplate(body);
      onClose(); onDone();
    } catch (e: any) { alert(e?.response?.data?.message || 'Lỗi'); }
    finally { setBusy(false); }
  }

  const showRules = mode !== 'EqualPerHead';
  const isFixed = mode === 'FixedAmount';

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={edit ? `Sửa: ${edit.name}` : 'Tạo template'}>
      <div className="form-field"><label>Tên *</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>

      <div className="form-field"><label>Chế độ tính tiền</label>
        <select value={mode} onChange={e => setMode(e.target.value as PricingMode)}>
          <option value="WeightedSlot">Chia theo tỷ lệ (Hệ số × số suất)</option>
          <option value="FixedAmount">Thu tiền cố định (mỗi rule định 1 mức / slot)</option>
          <option value="EqualPerHead">Chia đều theo số người (bỏ qua slot/gender/skill)</option>
        </select>
        <p className="card-sub" style={{ fontSize: 12, marginTop: 4 }}>
          {mode === 'WeightedSlot' && 'AmountDue = FeePerSlot × số suất × hệ số. Tổng = chi.'}
          {mode === 'FixedAmount' && 'AmountDue = số tiền cố định × số suất. Chênh lệch so với chi do quỹ chịu.'}
          {mode === 'EqualPerHead' && 'AmountDue = Tổng chi / số người. Bỏ qua mọi rule khác.'}
        </p>
      </div>

      <div className="form-field"><label>Mô tả</label>
        <input value={description} onChange={e => setDescription(e.target.value)} /></div>

      <div className="form-field">
        <label>
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
          {' '}Đặt làm template mặc định
        </label>
      </div>

      {showRules && (
        <>
          <h4 style={{ margin: '16px 0 8px' }}>Rules</h4>
          <p className="card-sub" style={{ fontSize: 12, marginBottom: 8 }}>
            Để trống Giới tính / Trình độ = "tất cả". Rule chi tiết hơn (match cả 2) sẽ thắng rule chỉ match 1.
          </p>
          {rules.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px auto', gap: 8, marginBottom: 8 }}>
              <select value={r.gender ?? ''} onChange={e => updateRule(i, { gender: (e.target.value || null) as any })}
                      style={{ height: 40, padding: '0 8px', borderRadius: 8, border: '1px solid var(--c-border)' }}>
                <option value="">— mọi giới tính —</option>
                <option value="Male">Nam</option>
                <option value="Female">Nữ</option>
                <option value="Other">Khác</option>
              </select>
              <select value={r.skillLevel ?? ''} onChange={e => updateRule(i, { skillLevel: (e.target.value || null) as any })}
                      style={{ height: 40, padding: '0 8px', borderRadius: 8, border: '1px solid var(--c-border)' }}>
                <option value="">— mọi trình độ —</option>
                <option value="Beginner">Yếu</option>
                <option value="Intermediate">TB</option>
                <option value="Advanced">Khá</option>
              </select>
              {isFixed
                ? <input type="number" step="1000" min="0" placeholder="đ/slot" value={r.fixedAmount}
                         onChange={e => updateRule(i, { fixedAmount: Number(e.target.value) })}
                         style={{ height: 40, padding: '0 8px', borderRadius: 8, border: '1px solid var(--c-border)', textAlign: 'right' }} />
                : <input type="number" step="0.01" min="0" max="10" placeholder="× hệ số" value={r.multiplier}
                         onChange={e => updateRule(i, { multiplier: Number(e.target.value) })}
                         style={{ height: 40, padding: '0 8px', borderRadius: 8, border: '1px solid var(--c-border)', textAlign: 'right' }} />}
              <button className="btn btn-sm" style={{ background: 'var(--c-danger)' }} onClick={() => removeRule(i)}>×</button>
            </div>
          ))}
          <button className="btn secondary btn-sm" onClick={addRule} style={{ marginBottom: 16 }}>+ Thêm rule</button>
        </>
      )}

      {mode === 'EqualPerHead' && (
        <div className="card" style={{ background: '#f1f5f9', fontSize: 13 }}>
          Chế độ này không cần rule. Hệ thống tự chia <b>Tổng chi / Số người</b> đều cho mọi người tham gia.
        </div>
      )}

      <button className="btn full" disabled={busy || !name.trim()} onClick={save} style={{ marginTop: 16 }}>
        {busy ? 'Đang lưu…' : 'Lưu'}
      </button>
    </ResponsiveSheet>
  );
}
