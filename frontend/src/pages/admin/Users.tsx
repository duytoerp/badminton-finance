import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/Shell';
import DataTable, { Column } from '../../components/common/DataTable';
import ResponsiveSheet from '../../components/common/ResponsiveSheet';
import { createUser, deleteUser, listRoles, listUsers, updateUser } from '../../api/endpoints';

export default function UsersAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const r = await listUsers({ page, pageSize: 20, search: search || undefined });
    setItems(r.data.items); setTotal(r.data.total);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, search]);
  useEffect(() => { listRoles().then(r => setRoles(r.data)); }, []);

  const cols: Column<any>[] = [
    { key: 'username', header: 'Username', sortable: true, accessor: r => r.userName, render: r => <b>{r.userName}</b> },
    { key: 'name', header: 'Họ tên', accessor: r => r.fullName },
    { key: 'email', header: 'Email', accessor: r => r.email },
    { key: 'roles', header: 'Vai trò', render: r => (r.roles || []).join(', ') || '—' },
    { key: 'active', header: 'Hoạt động', render: r => r.isActive ? '✅' : '🚫' },
    { key: 'last', header: 'Đăng nhập cuối', accessor: r => r.lastLoginAt,
      render: r => r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString('vi-VN') : '—' },
    { key: 'act', header: '', className: 'actions',
      render: r => (
        <>
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(r)}>Sửa</button>
          <button className="btn btn-sm" style={{ background: 'var(--c-danger)' }}
            onClick={async () => { if (confirm(`Vô hiệu hóa ${r.userName}?`)) { await deleteUser(r.id); await load(); } }}>
            Khóa
          </button>
        </>
      )}
  ];

  return (
    <div className="page">
      <PageHeader title="Quản lý người dùng" subtitle={`${total} tài khoản`}
        actions={<button className="btn" onClick={() => setCreating(true)}>+ Tạo tài khoản</button>} />
      <DataTable columns={cols} rows={items} total={total} page={page} onPage={setPage} rowKey={r => r.id}
        toolbar={<input className="grow" placeholder="Tìm theo username / email / tên" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />} />

      <UserSheet open={creating} onClose={() => setCreating(false)} roles={roles} onDone={load} />
      <UserSheet open={!!editing} edit={editing} onClose={() => setEditing(null)} roles={roles} onDone={load} />
    </div>
  );
}

function UserSheet({ open, onClose, onDone, roles, edit }: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    setForm(edit ?
      { fullName: edit.fullName, phoneNumber: edit.phoneNumber, isActive: edit.isActive, roles: edit.roles || [] }
      : { userName: '', email: '', password: '', fullName: '', phoneNumber: '', roles: ['User'] });
  }, [edit, open]);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      if (edit) await updateUser(edit.id, form);
      else await createUser(form);
      onClose(); onDone();
    } catch (e: any) { alert(e?.response?.data?.message || 'Lỗi'); }
    finally { setBusy(false); }
  }
  function toggleRole(name: string) {
    const list: string[] = form.roles || [];
    setForm({ ...form, roles: list.includes(name) ? list.filter(r => r !== name) : [...list, name] });
  }
  return (
    <ResponsiveSheet open={open} onClose={onClose} title={edit ? `Sửa: ${edit.userName}` : 'Tạo tài khoản'}>
      {!edit && (
        <>
          <div className="form-field"><label>Username *</label>
            <input value={form.userName || ''} onChange={e => setForm({ ...form, userName: e.target.value })} /></div>
          <div className="form-field"><label>Email *</label>
            <input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div className="form-field"><label>Mật khẩu *</label>
            <input type="password" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
        </>
      )}
      <div className="form-field"><label>Họ tên *</label>
        <input value={form.fullName || ''} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
      <div className="form-field"><label>Số điện thoại</label>
        <input value={form.phoneNumber || ''} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} /></div>
      <div className="form-field"><label>Vai trò</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {roles.map((r: string) => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={(form.roles || []).includes(r)} onChange={() => toggleRole(r)} />
              {r}
            </label>
          ))}
        </div>
      </div>
      {edit && (
        <div className="form-field"><label>
          <input type="checkbox" checked={!!form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
          {' '}Đang hoạt động
        </label></div>
      )}
      <button className="btn full" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
    </ResponsiveSheet>
  );
}
