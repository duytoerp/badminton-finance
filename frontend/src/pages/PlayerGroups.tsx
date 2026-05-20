import { useEffect, useMemo, useState } from 'react';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import DataTable, { Column } from '../components/common/DataTable';
import ResponsiveSheet from '../components/common/ResponsiveSheet';
import Modal from '../components/common/Modal';
import { useIsDesktop } from '../hooks/useBreakpoint';
import {
  addGroupMembers, createPlayerGroup, deletePlayerGroup, getGroupUsageHistory,
  getPlayerGroup, listPlayerGroups, listPlayers, removeGroupMembers, updatePlayerGroup,
  GROUP_TYPE_LABEL, GROUP_TYPE_BADGE_CLS,
  Player, PlayerGroup, PlayerGroupDetail, PlayerGroupType, SessionGroupHistory
} from '../api/endpoints';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

export default function PlayerGroups() {
  const desktop = useIsDesktop();
  const [items, setItems] = useState<PlayerGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PlayerGroup | 'new' | null>(null);
  const [membersFor, setMembersFor] = useState<PlayerGroup | null>(null);
  const [historyFor, setHistoryFor] = useState<PlayerGroup | null>(null);

  async function load() {
    const r = await listPlayerGroups(search, 1, 100);
    setItems(r.data.items); setTotal(r.data.total);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `player-groups-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    const text = await file.text();
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { alert('File JSON không hợp lệ.'); return; }
    if (!Array.isArray(parsed)) { alert('File phải là một mảng nhóm.'); return; }
    let ok = 0, skip = 0;
    for (const g of parsed) {
      if (!g?.name) { skip++; continue; }
      try {
        await createPlayerGroup({
          name: String(g.name), description: g.description, color: g.color,
          groupType: (g.groupType as PlayerGroupType) ?? 'Fixed',
          isActive: g.isActive ?? true, playerIds: []
        });
        ok++;
      } catch { skip++; }
    }
    alert(`Đã import ${ok} nhóm, bỏ qua ${skip}.`);
    load();
  }

  if (desktop) {
    const cols: Column<PlayerGroup>[] = [
      { key: 'name', header: 'Tên nhóm', sortable: true, accessor: r => r.name,
        render: r => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {r.color && <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: r.color, border: '1px solid var(--c-border)'
            }} />}
            <b>{r.name}</b>
          </span>
        ) },
      { key: 'type', header: 'Loại', accessor: r => r.groupType,
        render: r => <span className={'badge ' + GROUP_TYPE_BADGE_CLS[r.groupType]}>{GROUP_TYPE_LABEL[r.groupType]}</span> },
      { key: 'desc', header: 'Mô tả', accessor: r => r.description || '' },
      { key: 'count', header: 'Thành viên', className: 'num', sortable: true,
        accessor: r => r.memberCount, render: r => <b>{r.memberCount}</b> },
      { key: 'active', header: 'Hoạt động', render: r => r.isActive ? '✅' : '🚫' },
      { key: 'act', header: '', className: 'actions',
        render: r => (
          <>
            <button className="btn btn-sm" onClick={() => setMembersFor(r)}>Thành viên</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(r)}>Sửa</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setHistoryFor(r)}>Lịch sử</button>
            <button className="btn btn-sm btn-ghost"
              style={{ color: 'var(--c-danger)' }}
              onClick={async () => {
                if (!confirm(`Xóa nhóm "${r.name}"?`)) return;
                await deletePlayerGroup(r.id); load();
              }}>Xóa</button>
          </>
        ) }
    ];

    return (
      <div className="page">
        <PageHeader title="Nhóm người chơi" subtitle={`${total} nhóm`}
          actions={
            <>
              <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                Import JSON
                <input type="file" accept="application/json" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
              </label>
              <button className="btn btn-ghost" onClick={exportJson}>Export JSON</button>
              <button className="btn" onClick={() => setEditing('new')}>+ Thêm nhóm</button>
            </>
          } />
        <DataTable
          columns={cols} rows={items} rowKey={r => r.id}
          toolbar={
            <input placeholder="Tìm theo tên nhóm" className="grow"
              value={search} onChange={e => setSearch(e.target.value)} />
          }
        />
        <GroupEditSheet
          open={editing !== null}
          group={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={load}
        />
        <MembersDrawer group={membersFor} onClose={() => setMembersFor(null)} onDone={load} />
        <UsageHistoryModal group={historyFor} onClose={() => setHistoryFor(null)} />
      </div>
    );
  }

  // ========== Mobile ==========
  return (
    <>
      <AppBar title="Nhóm người chơi" />
      <div className="page">
        <input
          style={{ width: '100%', height: 48, padding: '0 12px', borderRadius: 10, border: '1px solid var(--c-border)', fontSize: 16, marginBottom: 12 }}
          placeholder="Tìm theo tên nhóm" value={search} onChange={e => setSearch(e.target.value)} />
        {items.length === 0 && <p className="card-sub">Chưa có nhóm nào. Bấm + để thêm.</p>}
        {items.map(g => (
          <div className="card" key={g.id} onClick={() => setMembersFor(g)}>
            <div className="card-row">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {g.color && <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: g.color, border: '1px solid var(--c-border)'
                  }} />}
                  {g.name}
                  <span className={'badge ' + GROUP_TYPE_BADGE_CLS[g.groupType]}>{GROUP_TYPE_LABEL[g.groupType]}</span>
                  {!g.isActive && <span className="card-sub" style={{ marginLeft: 6 }}>(tạm ngưng)</span>}
                </div>
                <div className="card-sub">{g.description || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{g.memberCount}</div>
                <div className="card-sub" style={{ fontSize: 11 }}>người</div>
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button className="btn secondary btn-sm" onClick={(e) => { e.stopPropagation(); setEditing(g); }}>Sửa</button>
              <button className="btn secondary btn-sm" onClick={(e) => { e.stopPropagation(); setHistoryFor(g); }}>Lịch sử</button>
            </div>
          </div>
        ))}
      </div>
      <button className="fab" onClick={() => setEditing('new')}>+</button>
      <GroupEditSheet
        open={editing !== null}
        group={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onDone={load}
      />
      <MembersDrawer group={membersFor} onClose={() => setMembersFor(null)} onDone={load} />
      <UsageHistoryModal group={historyFor} onClose={() => setHistoryFor(null)} />
    </>
  );
}

function GroupEditSheet({ open, group, onClose, onDone }: {
  open: boolean; group: PlayerGroup | null; onClose: () => void; onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [groupType, setGroupType] = useState<PlayerGroupType>('Fixed');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (group) {
      setName(group.name); setDesc(group.description || '');
      setColor(group.color || '#2563eb'); setGroupType(group.groupType);
      setActive(group.isActive);
    } else {
      setName(''); setDesc(''); setColor('#2563eb'); setGroupType('Fixed'); setActive(true);
    }
  }, [open, group]);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const body = {
        name: name.trim(), description: desc.trim() || undefined,
        color, groupType, isActive: active, playerIds: [] as string[]
      };
      if (group) await updatePlayerGroup(group.id, body);
      else await createPlayerGroup(body);
      onClose(); onDone();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Lưu thất bại.');
    } finally { setBusy(false); }
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={group ? `Sửa nhóm: ${group.name}` : 'Thêm nhóm'}>
      <div className="form-field"><label>Tên nhóm *</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      <div className="form-field"><label>Loại nhóm *</label>
        <select value={groupType} onChange={e => setGroupType(e.target.value as PlayerGroupType)}>
          {(Object.keys(GROUP_TYPE_LABEL) as PlayerGroupType[]).map(t =>
            <option key={t} value={t}>{GROUP_TYPE_LABEL[t]}</option>
          )}
        </select>
        <div className="card-sub" style={{ fontSize: 12, marginTop: 4 }}>
          Loại được lưu vào lịch sử khi thêm nhóm vào buổi — dùng để lọc cố định / vãng lai.
        </div>
      </div>
      <div className="form-field"><label>Mô tả</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="form-field"><label>Màu</label>
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          style={{ width: 60, height: 40, padding: 0, border: '1px solid var(--c-border)', borderRadius: 6 }} />
      </div>
      <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input id="grp-active" type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        <label htmlFor="grp-active" style={{ margin: 0 }}>Đang hoạt động</label>
      </div>
      <button className="btn full" disabled={busy || !name.trim()} onClick={save}>Lưu</button>
    </ResponsiveSheet>
  );
}

function MembersDrawer({ group, onClose, onDone }: {
  group: PlayerGroup | null; onClose: () => void; onDone: () => void;
}) {
  const [detail, setDetail] = useState<PlayerGroupDetail | null>(null);
  const [picking, setPicking] = useState(false);

  async function reload() {
    if (!group) return;
    const r = await getPlayerGroup(group.id);
    setDetail(r.data);
  }
  useEffect(() => { setDetail(null); if (group) reload(); /* eslint-disable-next-line */ }, [group]);

  async function remove(playerId: string) {
    if (!group) return;
    if (!confirm('Xóa khỏi nhóm?')) return;
    await removeGroupMembers(group.id, [playerId]);
    reload(); onDone();
  }

  if (!group) return null;
  return (
    <>
      <ResponsiveSheet open={!!group} onClose={onClose} title={`Thành viên: ${group.name}`}>
        {!detail ? <p>Đang tải…</p> : (
          <>
            <p className="card-sub">{detail.members.length} thành viên</p>
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <button className="btn" onClick={() => setPicking(true)}>+ Thêm thành viên</button>
            </div>
            {detail.members.length === 0 && <p className="card-sub">Chưa có thành viên.</p>}
            {detail.members.map(m => (
              <div className="card" key={m.playerId}>
                <div className="card-row">
                  <div>
                    <div className="card-title">{m.fullName}{!m.isActive && <span className="card-sub"> (ngưng)</span>}</div>
                    <div className="card-sub">{m.phoneNumber || '—'}</div>
                    {m.currentDebt > 0 && (
                      <div style={{ color: 'var(--c-danger)', fontWeight: 600 }}>Nợ {fmt(m.currentDebt)}</div>
                    )}
                  </div>
                  <button className="btn btn-sm btn-ghost"
                    style={{ color: 'var(--c-danger)' }}
                    onClick={() => remove(m.playerId)}>Xóa</button>
                </div>
              </div>
            ))}
          </>
        )}
      </ResponsiveSheet>
      <PickPlayersSheet
        open={picking}
        excludeIds={(detail?.members ?? []).map(m => m.playerId)}
        onClose={() => setPicking(false)}
        onPick={async (ids) => {
          if (!group || ids.length === 0) { setPicking(false); return; }
          await addGroupMembers(group.id, ids);
          setPicking(false); reload(); onDone();
        }}
      />
    </>
  );
}

function PickPlayersSheet({ open, excludeIds, onClose, onPick }: {
  open: boolean; excludeIds: string[]; onClose: () => void; onPick: (ids: string[]) => void;
}) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    listPlayers(search).then(r => setPlayers(r.data.items));
  }, [open, search]);

  const visible = useMemo(
    () => players.filter(p => !excludeIds.includes(p.id)),
    [players, excludeIds]
  );

  function toggle(id: string) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Chọn người chơi">
      <input placeholder="Tìm tên / SĐT" value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--c-border)', fontSize: 16, marginBottom: 12 }} />
      <p className="card-sub">Đã chọn: <b>{selected.size}</b></p>
      <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        {visible.map(p => (
          <label key={p.id} className="card" style={{ cursor: 'pointer', display: 'block' }}>
            <div className="card-row">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <div>
                  <div className="card-title">{p.fullName}{!p.isActive && <span className="card-sub"> (ngưng)</span>}</div>
                  <div className="card-sub">{p.phoneNumber || '—'}</div>
                </div>
              </div>
              {p.currentDebt > 0 && <span className="badge unpaid">Nợ {fmt(p.currentDebt)}</span>}
            </div>
          </label>
        ))}
        {visible.length === 0 && <p className="card-sub">Không có người chơi để chọn.</p>}
      </div>
      <button className="btn full" disabled={selected.size === 0}
        onClick={() => onPick(Array.from(selected))}>
        Thêm {selected.size > 0 ? `(${selected.size})` : ''}
      </button>
    </ResponsiveSheet>
  );
}

function UsageHistoryModal({ group, onClose }: { group: PlayerGroup | null; onClose: () => void; }) {
  const [rows, setRows] = useState<SessionGroupHistory[]>([]);
  useEffect(() => {
    if (!group) { setRows([]); return; }
    getGroupUsageHistory(group.id).then(r => setRows(r.data));
  }, [group]);
  if (!group) return null;
  return (
    <Modal open={!!group} onClose={onClose} title={`Lịch sử sử dụng: ${group.name}`}>
      {rows.length === 0
        ? <p className="card-sub">Chưa được dùng cho buổi nào.</p>
        : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Thời điểm</th>
                <th style={{ textAlign: 'left' }}>Buổi</th>
                <th className="num">Tổng</th>
                <th className="num">Thêm</th>
                <th className="num">Trùng</th>
                <th className="num">Inactive</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.appliedAt).toLocaleString('vi-VN')}</td>
                  <td>{r.sessionTitle || r.sessionId.slice(0, 8)}</td>
                  <td className="num">{r.membersTotal}</td>
                  <td className="num"><b style={{ color: 'var(--c-success)' }}>{r.membersAdded}</b></td>
                  <td className="num">{r.membersSkippedDuplicate}</td>
                  <td className="num">{r.membersSkippedInactive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </Modal>
  );
}
