import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import ResponsiveSheet from '../components/common/ResponsiveSheet';
import DataTable, { Column } from '../components/common/DataTable';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { useAuth } from '../store/auth';
import { createPlayer, listPlayers, quickAddPlayer, updatePlayer, Player, Gender, SkillLevel } from '../api/endpoints';

export default function Players() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const canManage = useAuth(s => s.canManagePlayers)();
  const [items, setItems] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Player | 'new' | null>(null);

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
      { key: 'gender', header: 'Giới tính', accessor: r => r.gender || '',
        render: r => r.gender === 'Male' ? 'Nam' : r.gender === 'Female' ? 'Nữ' : r.gender === 'Other' ? 'Khác' : '—' },
      { key: 'skill', header: 'Trình độ', accessor: r => r.skillLevel || '',
        render: r => r.skillLevel === 'Beginner' ? 'Yếu' : r.skillLevel === 'Intermediate' ? 'TB' : r.skillLevel === 'Advanced' ? 'Khá' : '—' },
      { key: 'type', header: 'Loại', accessor: r => r.playerType,
        render: r => r.playerType === 'Member' ? 'Thành viên' : 'Vãng lai' },
      { key: 'active', header: 'Hoạt động', accessor: r => r.isActive ? 1 : 0,
        render: r => r.isActive ? '✅' : '🚫' },
      { key: 'debt', header: 'Còn nợ', className: 'num', sortable: true, accessor: r => r.currentDebt,
        render: r => r.currentDebt > 0
          ? <b style={{ color: 'var(--c-danger)' }}>{r.currentDebt.toLocaleString('vi-VN')}đ</b>
          : <span className="card-sub">—</span> },
      { key: 'actions', header: '', className: 'actions',
        render: r => (
          <>
            {canManage && <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setEditing(r); }}>Sửa</button>}
            <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); nav(`/players/${r.id}`); }}>Lịch sử</button>
          </>
        ) }
    ];

    return (
      <div className="page">
        <PageHeader title="Quản lý người chơi"
          subtitle={`${total} người`}
          actions={canManage ? <button className="btn" onClick={() => setEditing('new')}>+ Thêm người chơi</button> : undefined} />
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
        <PlayerSheet open={editing !== null} player={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)} onDone={load} desktop />
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
        {items.map(p => (
          <div className="card" key={p.id} onClick={() => nav(`/players/${p.id}`)}>
            <div className="card-row">
              <div>
                <div className="card-title">{p.fullName}{p.nickName && <span className="card-sub"> ({p.nickName})</span>}</div>
                <div className="card-sub">{p.phoneNumber || 'Không SĐT'}</div>
                <div className="card-sub" style={{ marginTop: 2 }}>
                  {p.playerType === 'Member' ? 'Thành viên' : 'Vãng lai'}
                  {p.gender && <> · {p.gender === 'Male' ? 'Nam' : p.gender === 'Female' ? 'Nữ' : 'Khác'}</>}
                  {p.skillLevel && <> · {p.skillLevel === 'Beginner' ? 'Yếu' : p.skillLevel === 'Intermediate' ? 'TB' : 'Khá'}</>}
                  {!p.isActive && <> · Ngưng</>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {p.currentDebt > 0 && <span className="badge unpaid">Nợ {p.currentDebt.toLocaleString('vi-VN')}đ</span>}
                {canManage && <button className="btn btn-sm btn-ghost"
                  onClick={(e) => { e.stopPropagation(); setEditing(p); }}>Sửa</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {canManage && <button className="fab" aria-label="Thêm người chơi" onClick={() => setEditing('new')}>+</button>}
      <PlayerSheet open={editing !== null} player={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)} onDone={load} />
    </>
  );
}

function PlayerSheet({ open, player, onClose, onDone, desktop }: {
  open: boolean; player: Player | null;
  onClose: () => void; onDone: () => void; desktop?: boolean;
}) {
  const [name, setName] = useState('');
  const [nick, setNick] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'Guest' | 'Member'>('Guest');
  const [gender, setGender] = useState<Gender | ''>('');
  const [skill, setSkill] = useState<SkillLevel | ''>('');
  const [active, setActive] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const isEdit = !!player;

  useEffect(() => {
    if (!open) return;
    if (player) {
      setName(player.fullName);
      setNick(player.nickName || '');
      setPhone(player.phoneNumber || '');
      setEmail(player.email || '');
      setType(player.playerType);
      setGender(player.gender || '');
      setSkill(player.skillLevel || '');
      setActive(player.isActive);
      setNote((player as any).note || '');
    } else {
      setName(''); setNick(''); setPhone(''); setEmail('');
      setType('Guest'); setGender(''); setSkill(''); setActive(true); setNote('');
    }
  }, [open, player]);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const body: any = {
        fullName: name.trim(),
        nickName: nick.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
        email: email.trim() || undefined,
        playerType: type,
        gender: gender || undefined,
        skillLevel: skill || undefined,
        note: note.trim() || undefined,
        isActive: active
      };
      if (isEdit && player) {
        await updatePlayer(player.id, body);
      } else if (desktop || gender || skill || nick || email) {
        await createPlayer(body);
      } else {
        await quickAddPlayer(name.trim(), phone.trim() || undefined);
      }
      onClose(); onDone();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Lưu thất bại.');
    } finally { setBusy(false); }
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={isEdit ? `Sửa: ${player?.fullName}` : 'Thêm người chơi'}>
      <div className="form-field"><label>Họ tên *</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="form-field" style={{ flex: 1 }}><label>Nickname</label>
          <input value={nick} onChange={e => setNick(e.target.value)} /></div>
        <div className="form-field" style={{ flex: 1 }}><label>SĐT</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" /></div>
      </div>
      <div className="form-field"><label>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} inputMode="email" /></div>
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
      <div className="form-field"><label>Loại</label>
        <select value={type} onChange={e => setType(e.target.value as any)}>
          <option value="Guest">Vãng lai</option>
          <option value="Member">Thành viên</option>
        </select>
      </div>
      <div className="form-field"><label>Ghi chú</label>
        <input value={note} onChange={e => setNote(e.target.value)} /></div>
      {isEdit && (
        <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input id="pl-active" type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          <label htmlFor="pl-active" style={{ margin: 0 }}>Đang hoạt động</label>
        </div>
      )}
      <p className="card-sub" style={{ fontSize: 12 }}>
        Giới tính + trình độ dùng để áp dụng template thu tiền (Quản trị → Template thu tiền).
      </p>
      <button className="btn full" onClick={save} disabled={busy || !name.trim()}>
        {busy ? 'Đang lưu…' : isEdit ? 'Cập nhật' : 'Lưu'}
      </button>
    </ResponsiveSheet>
  );
}
