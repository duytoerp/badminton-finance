import { useEffect, useState } from 'react';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import DataTable, { Column } from '../components/common/DataTable';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { getMainFund } from '../api/endpoints';
import { api } from '../api/client';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

export default function Fund() {
  const desktop = useIsDesktop();
  const [balance, setBalance] = useState(0);
  const [fundId, setFundId] = useState<string>('');
  const [name, setName] = useState('Quỹ chung');
  const [txs, setTxs] = useState<any[]>([]);

  async function load() {
    const f = await getMainFund();
    setBalance(f.data.currentBalance); setFundId(f.data.id); setName(f.data.name);
    const r = await api.get(`/funds/${f.data.id}/transactions?take=100`);
    setTxs(r.data.data || []);
  }
  useEffect(() => { load(); }, []);

  if (desktop) {
    const cols: Column<any>[] = [
      { key: 'date', header: 'Thời gian', sortable: true, accessor: r => r.transactionDate,
        render: r => new Date(r.transactionDate).toLocaleString('vi-VN') },
      { key: 'desc', header: 'Mô tả', accessor: r => r.description, render: r => <b>{r.description}</b> },
      { key: 'amt', header: 'Thay đổi', className: 'num', sortable: true, accessor: r => r.amount,
        render: r => <b style={{ color: r.amount >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>
          {r.amount >= 0 ? '+' : ''}{fmt(r.amount)}
        </b> },
      { key: 'before', header: 'Trước', className: 'num', render: r => fmt(r.balanceBefore) },
      { key: 'after', header: 'Sau', className: 'num', render: r => <b>{fmt(r.balanceAfter)}</b> }
    ];
    return (
      <div className="page">
        <PageHeader title={name} subtitle="Biến động quỹ chung" />
        <div className="kpi-grid">
          <div className="kpi primary"><div className="label">Số dư hiện tại</div>
            <div className="value">{fmt(balance)}</div></div>
          <div className="kpi"><div className="label">Số giao dịch</div>
            <div className="value">{txs.length}</div></div>
        </div>
        <DataTable columns={cols} rows={txs} rowKey={r => r.id} />
      </div>
    );
  }

  return (
    <>
      <AppBar title="Quỹ" />
      <div className="page">
        <div className="card" style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white' }}>
          <div className="card-sub" style={{ color: '#bbf7d0' }}>Số dư quỹ</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{fmt(balance)}</div>
        </div>
        <h3>Lịch sử quỹ</h3>
        {txs.length === 0 && <p className="card-sub">Chưa có giao dịch.</p>}
        {txs.map(t => (
          <div className="card" key={t.id}>
            <div className="card-row">
              <div>
                <div className="card-title">{t.description}</div>
                <div className="card-sub">{new Date(t.transactionDate).toLocaleString('vi-VN')}</div>
              </div>
              <div style={{ fontWeight: 700, color: t.amount >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>
                {t.amount >= 0 ? '+' : ''}{fmt(t.amount)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
