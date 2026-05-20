import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import PlayerCard from '../components/common/PlayerCard';
import ResponsiveSheet from '../components/common/ResponsiveSheet';
import DataTable, { Column } from '../components/common/DataTable';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { createPlayer, listPlayers, quickAddPlayer, Player, Gender, SkillLevel } from '../api/endpoints';

export default function Players() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [items, setItems] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  async function load() {
    const r = await listPlayers(search, page);
    setItems(r.data.items); setTotal(r.data.total);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, page]);

  if (desktop) {
    const cols: Column<Player>[] = [
      { key: 'fullName', header: 'Họ tên', sortable: true, accessor: r => r.fullName,
        render: r => <><b>{r.fullName}</b>{r.nickName && <span className="card-sub"> ({r.nickName})</span>}</> },
      { key: 'phone', header: 'SĐT', accessor: r => r.phoneNumber || '' },
      { key: 'email', header: 'Email', accessor: r => r.email || '' },
      { key: 'type', header: 'Loại', accessor: r => r.playerType,
        render: r => r.playerType === 'Member' ? 'Thành viên' : 'Vãng lai' },
      { key: 'active', header: 'Hoạt động', accessor: r => r.isActive ? 1 : 0,
        render: r => r.isActive ? '✅' : '🚫' },
      { key: 'debt', header: 'Còn nợ', className: 'num', sortable: true, accessor: r => r.currentDebt,
        render: r => r.currentDebt > 0
          ? <b style={{ color: 'var(--c-danger)' }}>{r.currentDebt.toLocaleString('vi-VN')}đ</b>
          : <span className="card-sub">—</span> },
      { key: 'actions', header: '', className: 'actions',
        render: r => <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); nav(`/players/${r.id}`); }}>Lịch sử</button> }
    ];

    return (
      <div className="page">
        <PageHeader title="Quản lý người chơi"
          subtitle={`${total} người`}
          actions={<button className="btn" onClick={() => setOpen(true)}>+ Thêm người chơi</button>} />
        <DataTable
          columns={cols} rows={items} total={total} page={page} pageSize={50}
          onPage={setPage} rowKey={r => r.id}
          onRowClick={r => nav(`/players/${r.id}`)}
          toolbar={
            <input placeholder="Tìm theo tên hoặc SĐT" value={search}
              className="grow"
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          }
        />
        <QuickAddSheet open={open} onClose={() => setOpen(false)} onDone={load} desktop />
      </div>
    );
  }

  // Mobile
  return (
    <>
      <AppBar title="Người chơi" />
      <div className="page">
        <input
          style={{ width: '100%', height: 48, padding: '0 12px', borderRadius: 10, border: '1px solid var(--c-border)', fontSize: 16, marginBottom: 12 }}
          placeholder="Tìm theo tên hoặc SĐT" value={search} onChange={e => setSearch(e.target.value)} />
        {items.length === 0 && <p className="card-sub">Chưa có người chơi. Bấm nút + để thêm.</p>}
        {items.map(p => <PlayerCard key={p.id} player={p} onClick={() => nav(`/players/${p.id}`)} />)}
      </div>
      <button className="fab" aria-label="Thêm người chơi" onClick={() => setOpen(true)}>+</button>
      <QuickAddSheet open={open} onClose={() => setOpen(false)} onDone={load} />
    </>
  );
}

function QuickAddSheet({ open, onClose, onDone, desktop }: { open: boolean; onClose: () => void; onDone: () => void; desktop?: boolean }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'Guest' | 'Member'>('Guest');
  const [gender, setGender] = useState<Gender | ''>('');
  const [skill, setSkill] = useState<SkillLevel | ''>('');
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const body: any = {
        fullName: name.trim(),
        phoneNumber: phone.trim() || undefined,
        gender: gender || undefined,
        skillLevel: skill || undefined
      };
      if (desktop) await createPlayer({ ...body, playerType: type });
      else if (gender || skill) await createPlayer(body);
      else await quickAddPlayer(name.trim(), phone.trim() || undefined);
      setName(''); setPhone(''); setType('Guest'); setGender(''); setSkill('');
      onClose(); onDone();
    } finally { setBusy(false); }
  }
  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Thêm người chơi">
      <div className="form-field"><label>Họ tên *</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      <div className="form-field"><label>Số điện thoại</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="form-field" style={{ flex: 1 }}><label>Giới tính</label>
          <select value={gender} onChange={e => setGender(e.target.value as Gender | '')}>
            <option value="">—</option>
            <option value="Male">Nam</option>
            <option value="Female">Nữ</option>
            <option value="Other">Khác</option>
          </select>
        </div>
        <div className="form-field" style={{ flex: 1 }}><label>Trình độ</label>
          <select value={skill} onChange={e => setSkill(e.target.value as SkillLevel | '')}>
            <option value="">—</option>
            <option value="Beginner">Yếu</option>
            <option value="Intermediate">Trung bình</option>
            <option value="Advanced">Khá</option>
          </select>
        </div>
      </div>
      {desktop && (
        <div className="form-field"><label>Loại</label>
          <select value={type} onChange={e => setType(e.target.value as any)}>
            <option value="Guest">Vãng lai</option>
            <option value="Member">Thành viên</option>
          </select>
        </div>
      )}
      <p className="card-sub" style={{ fontSize: 12 }}>
        Giới tính + trình độ dùng để áp dụng template thu tiền (xem Quản trị → Template).
      </p>
      <button className="btn full" onClick={save} disabled={busy || !name.trim()}>
        {busy ? 'Đang lưu…' : 'Lưu'}
      </button>
    </ResponsiveSheet>
  );
}
