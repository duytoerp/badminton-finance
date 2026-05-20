import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/Shell';
import DataTable, { Column } from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { listAuditLogs } from '../../api/endpoints';

export default function AuditLog() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<any | null>(null);

  async function load() {
    const r = await listAuditLogs({
      page, pageSize: 30,
      entityName: entity || undefined, action: action || undefined,
      from: from || undefined, to: to || undefined,
      search: search || undefined
    });
    setItems(r.data.items); setTotal(r.data.total);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, entity, action, from, to, search]);

  const cols: Column<any>[] = [
    { key: 'date', header: 'Thời gian', sortable: true, accessor: r => r.createdAt,
      render: r => new Date(r.createdAt).toLocaleString('vi-VN') },
    { key: 'user', header: 'User', accessor: r => r.userName || '—' },
    { key: 'entity', header: 'Đối tượng', accessor: r => r.entityName, render: r => <code>{r.entityName}</code> },
    { key: 'eid', header: 'ID', accessor: r => r.entityId, render: r => <code style={{ fontSize: 11 }}>{r.entityId.slice(0, 8)}…</code> },
    { key: 'action', header: 'Hành động', accessor: r => r.action,
      render: r => <span className={`badge ${r.action === 'Reopen' || r.action === 'Cancel' ? 'partial' : 'open'}`}>{r.action}</span> },
    { key: 'reason', header: 'Lý do', accessor: r => r.reason || '' },
    { key: 'ip', header: 'IP', accessor: r => r.ipAddress || '' },
    { key: 'act', header: '', className: 'actions',
      render: r => <button className="btn btn-sm btn-ghost" onClick={() => setViewing(r)}>Xem</button> }
  ];

  return (
    <div className="page">
      <PageHeader title="Audit log" subtitle={`${total} bản ghi`} />
      <div className="filter-bar">
        <div className="form-field"><label>Đối tượng</label>
          <select value={entity} onChange={e => { setEntity(e.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="BadmintonSession">BadmintonSession</option>
            <option value="BadmintonTransaction">BadmintonTransaction</option>
            <option value="BadmintonFund">BadmintonFund</option>
          </select>
        </div>
        <div className="form-field"><label>Hành động</label>
          <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="Close">Close</option>
            <option value="Reopen">Reopen</option>
            <option value="Cancel">Cancel</option>
            <option value="Payment">Payment</option>
            <option value="Adjust">Adjust</option>
          </select>
        </div>
        <div className="form-field"><label>Từ</label>
          <input type="datetime-local" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div>
        <div className="form-field"><label>Đến</label>
          <input type="datetime-local" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></div>
      </div>
      <DataTable columns={cols} rows={items} total={total} page={page} pageSize={30}
        onPage={setPage} rowKey={r => r.id}
        toolbar={<input className="grow" placeholder="Tìm user / reason / id" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />} />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Chi tiết audit log">
        {viewing && (
          <div>
            <p><b>Thời gian:</b> {new Date(viewing.createdAt).toLocaleString('vi-VN')}</p>
            <p><b>User:</b> {viewing.userName || '—'} ({viewing.ipAddress || '—'})</p>
            <p><b>Đối tượng:</b> {viewing.entityName} / <code>{viewing.entityId}</code></p>
            <p><b>Hành động:</b> {viewing.action}</p>
            <p><b>Lý do:</b> {viewing.reason || '—'}</p>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
              <div>
                <b>Old</b>
                <pre style={{ background: '#f1f5f9', padding: 8, borderRadius: 6, fontSize: 12, overflow: 'auto', maxHeight: 240 }}>
                  {viewing.oldValue || '—'}
                </pre>
              </div>
              <div>
                <b>New</b>
                <pre style={{ background: '#f1f5f9', padding: 8, borderRadius: 6, fontSize: 12, overflow: 'auto', maxHeight: 240 }}>
                  {viewing.newValue || '—'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
