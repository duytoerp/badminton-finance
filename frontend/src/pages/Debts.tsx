import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import DataTable, { Column } from '../components/common/DataTable';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { getDebts } from '../api/endpoints';
import { downloadCsv } from '../utils/download';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

export default function Debts() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { getDebts().then(r => setItems(r.data)); }, []);
  const filtered = items.filter(d =>
    !search || d.playerName.toLowerCase().includes(search.toLowerCase()) ||
    (d.phoneNumber || '').includes(search));
  const total = filtered.reduce((s, d) => s + (d.totalDebt || 0), 0);

  const cols: Column<any>[] = [
    { key: 'name', header: 'Người chơi', sortable: true, accessor: r => r.playerName,
      render: r => <b>{r.playerName}</b> },
    { key: 'phone', header: 'SĐT', accessor: r => r.phoneNumber || '' },
    { key: 'sessions', header: 'Buổi nợ', className: 'num', sortable: true, accessor: r => r.unpaidSessionCount },
    { key: 'debt', header: 'Tổng nợ', className: 'num', sortable: true, accessor: r => r.totalDebt,
      render: r => <b style={{ color: 'var(--c-danger)' }}>{fmt(r.totalDebt)}</b> },
    { key: 'act', header: '', className: 'actions',
      render: r => <button className="btn btn-sm btn-ghost" onClick={() => nav(`/players/${r.playerId}`)}>Chi tiết</button> }
  ];

  if (desktop) {
    return (
      <div className="page">
        <PageHeader title="Quản lý công nợ"
          subtitle={`${filtered.length} người · Tổng: ${fmt(total)}`}
          actions={
            <button className="btn btn-ghost btn-sm"
              onClick={() => downloadCsv('/admin/export/debts.csv', `debts_${new Date().toISOString().slice(0,10)}.csv`)}>
              ⬇ Xuất CSV
            </button>
          } />
        <DataTable columns={cols} rows={filtered} rowKey={r => r.playerId}
          toolbar={<input className="grow" placeholder="Tìm tên / SĐT" value={search}
            onChange={e => setSearch(e.target.value)} />} />
      </div>
    );
  }

  return (
    <>
      <AppBar title="Công nợ" />
      <div className="page">
        <div className="card" style={{ background: '#fee2e2' }}>
          <div className="card-sub">Tổng nợ toàn nhóm</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--c-danger)' }}>{fmt(total)}</div>
        </div>
        {filtered.map(d => (
          <div className="card" key={d.playerId} onClick={() => nav(`/players/${d.playerId}`)}>
            <div className="card-row">
              <div>
                <div className="card-title">{d.playerName}</div>
                <div className="card-sub">{d.phoneNumber || 'Không SĐT'} · {d.unpaidSessionCount} buổi</div>
              </div>
              <b style={{ color: 'var(--c-danger)' }}>{fmt(d.totalDebt)}</b>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="card-sub">🎉 Không còn ai nợ.</p>}
      </div>
    </>
  );
}
