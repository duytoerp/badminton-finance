import { useEffect, useState } from 'react';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import BarChart from '../components/common/BarChart';
import DataTable, { Column } from '../components/common/DataTable';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { useAuth } from '../store/auth';
import { getReport, getDebts, getDashboardStats } from '../api/endpoints';
import { downloadCsv } from '../utils/download';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

export default function Reports() {
  const desktop = useIsDesktop();
  const canExport = useAuth(s => s.canExport)();
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [debts, setDebts] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);

  async function run() {
    const r = await getReport(from, to);
    setData(r.data);
    const d = await getDebts();
    setDebts(d.data);
    const s = await getDashboardStats();
    setSeries(s.data.incomeExpenseSeries || []);
  }
  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  if (desktop) {
    return (
      <div className="page">
        <PageHeader title="Báo cáo thu chi"
          subtitle={data ? `${data.sessionCount} buổi · ${from} → ${to}` : undefined}
          actions={
            canExport ? (
              <>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => downloadCsv(`/admin/export/finance.csv?from=${from}&to=${to}`,
                    `finance_${from}_${to}.csv`)}>
                  ⬇ Xuất CSV
                </button>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => downloadCsv('/admin/export/debts.csv', `debts.csv`)}>
                  ⬇ Xuất công nợ
                </button>
              </>
            ) : undefined
          } />

        <div className="filter-bar">
          <div className="form-field"><label>Từ ngày</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div className="form-field"><label>Đến ngày</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          <div className="form-field"><label>&nbsp;</label>
            <button className="btn" onClick={run}>Xem báo cáo</button></div>
        </div>

        {data && (
          <div className="kpi-grid">
            <div className="kpi success"><div className="label">Tổng thu</div><div className="value">{fmt(data.totalIncome)}</div></div>
            <div className="kpi danger"><div className="label">Tổng chi</div><div className="value">{fmt(data.totalExpense)}</div></div>
            <div className="kpi"><div className="label">Lãi/lỗ</div><div className="value">{fmt(data.netBalance)}</div></div>
            <div className="kpi primary"><div className="label">Quỹ hiện tại</div><div className="value">{fmt(data.fundBalance)}</div></div>
            <div className="kpi"><div className="label">Số buổi</div><div className="value">{data.sessionCount}</div></div>
          </div>
        )}

        <div className="dash-2col">
          <div className="panel">
            <h3>Thu chi 6 tháng</h3>
            <BarChart
              data={series.map((p: any) => ({ label: p.label, values: [p.income, p.expense] }))}
              series={[{ name: 'Thu', color: '#16a34a' }, { name: 'Chi', color: '#dc2626' }]}
              formatY={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
            />
          </div>

          <div className="panel">
            <h3>Top công nợ</h3>
            {debts.slice(0, 8).map(d => (
              <div key={d.playerId} className="card-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}>
                <div>
                  <b>{d.playerName}</b>
                  <div className="card-sub">{d.phoneNumber || '—'} · {d.unpaidSessionCount} buổi</div>
                </div>
                <b style={{ color: 'var(--c-danger)' }}>{fmt(d.totalDebt)}</b>
              </div>
            ))}
            {debts.length === 0 && <p className="card-sub">Không có công nợ.</p>}
          </div>
        </div>

        {data && (
          <div style={{ marginTop: 16 }}>
            <h3>Chi tiết các buổi</h3>
            <DataTable
              columns={[
                { key: 'date', header: 'Ngày', sortable: true, accessor: r => r.playDate,
                  render: r => new Date(r.playDate).toLocaleDateString('vi-VN') },
                { key: 'title', header: 'Buổi', accessor: r => r.title, render: r => <b>{r.title}</b> },
                { key: 'court', header: 'Sân', accessor: r => r.courtName || '' },
                { key: 'income', header: 'Thu', className: 'num', sortable: true, accessor: r => r.totalIncome,
                  render: r => fmt(r.totalIncome) },
                { key: 'expense', header: 'Chi', className: 'num', sortable: true, accessor: r => r.totalExpense,
                  render: r => fmt(r.totalExpense) },
                { key: 'balance', header: 'Lãi/lỗ', className: 'num', sortable: true, accessor: r => r.balance,
                  render: r => <b style={{ color: r.balance >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>{fmt(r.balance)}</b> }
              ] as Column<any>[]}
              rows={data.sessions} rowKey={r => r.id}
            />
          </div>
        )}
      </div>
    );
  }

  // Mobile
  return (
    <>
      <AppBar title="Báo cáo" />
      <div className="page">
        <div className="card">
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-field" style={{ flex: 1 }}><label>Từ</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div className="form-field" style={{ flex: 1 }}><label>Đến</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          </div>
          <button className="btn full" onClick={run}>Xem báo cáo</button>
        </div>
        {data && (
          <div className="card">
            <div className="card-row"><span>Tổng thu</span><b style={{ color: 'var(--c-success)' }}>{fmt(data.totalIncome)}</b></div>
            <div className="card-row"><span>Tổng chi</span><b style={{ color: 'var(--c-danger)' }}>{fmt(data.totalExpense)}</b></div>
            <div className="card-row"><span>Lãi/lỗ</span><b>{fmt(data.netBalance)}</b></div>
            <div className="card-row"><span>Quỹ</span><b>{fmt(data.fundBalance)}</b></div>
            <div className="card-row"><span>Số buổi</span><b>{data.sessionCount}</b></div>
          </div>
        )}
        <h3>Công nợ hiện tại</h3>
        {debts.length === 0 && <p className="card-sub">Không còn ai nợ 🎉</p>}
        {debts.map(d => (
          <div className="card" key={d.playerId}>
            <div className="card-row">
              <div>
                <div className="card-title">{d.playerName}</div>
                <div className="card-sub">{d.phoneNumber || 'Không SĐT'} · {d.unpaidSessionCount} buổi</div>
              </div>
              <b style={{ color: 'var(--c-danger)' }}>{fmt(d.totalDebt)}</b>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
