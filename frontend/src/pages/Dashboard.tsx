import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { getDashboardStats } from '../api/endpoints';
import { SessionStatusBadge } from '../components/common/StatusBadge';
import BarChart from '../components/common/BarChart';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + ' đ';

export default function Dashboard() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => { getDashboardStats().then(r => setStats(r.data)).catch(() => {}); }, []);

  if (!stats) {
    return (
      <>
        {!desktop && <AppBar title="🏸 Quỹ Cầu Lông" />}
        <div className="page">Đang tải dashboard…</div>
      </>
    );
  }

  return (
    <>
      {!desktop && <AppBar title="🏸 Quỹ Cầu Lông" />}
      <div className="page">
        {desktop && <PageHeader title="Dashboard" subtitle="Tổng quan thu chi tháng hiện tại" />}

        <div className="kpi-grid">
          <Kpi label="Quỹ chung" value={fmt(stats.fundBalance)} variant="primary" />
          <Kpi label="Thu tháng" value={fmt(stats.monthIncome)} variant="success" />
          <Kpi label="Chi tháng" value={fmt(stats.monthExpense)} variant="danger" />
          <Kpi label="Lãi/lỗ tháng" value={fmt(stats.monthNet)} variant={stats.monthNet >= 0 ? 'success' : 'danger'} />
          <Kpi label="Buổi tháng" value={String(stats.monthSessionCount)} />
          <Kpi label="Người còn nợ" value={String(stats.totalDebtors)} />
          <Kpi label="Tổng nợ" value={fmt(stats.totalDebt)} variant="danger" />
        </div>

        <div className="dash-2col">
          <div className="panel">
            <h3>Thu chi 6 tháng gần đây</h3>
            <BarChart
              data={stats.incomeExpenseSeries.map((p: any) => ({
                label: p.label, values: [p.income, p.expense]
              }))}
              series={[
                { name: 'Thu', color: '#16a34a' },
                { name: 'Chi', color: '#dc2626' }
              ]}
              formatY={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
            />
          </div>

          <div className="panel">
            <h3>Top công nợ</h3>
            {stats.topDebtors.length === 0 && <p className="card-sub">Không còn ai nợ 🎉</p>}
            {stats.topDebtors.map((d: any) => (
              <div key={d.playerId} className="card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}>
                <div>
                  <div className="card-title">{d.playerName}</div>
                  <div className="card-sub">{d.phoneNumber || '—'} · {d.unpaidSessionCount} buổi</div>
                </div>
                <b style={{ color: 'var(--c-danger)' }}>{fmt(d.totalDebt)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Buổi gần đây</h3>
          {stats.recentSessions.map((s: any) => (
            <div key={s.id} className="card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--c-border)', cursor: 'pointer' }}
                 onClick={() => nav(`/sessions/${s.id}`)}>
              <div>
                <div className="card-title">{s.title}</div>
                <div className="card-sub">
                  {new Date(s.playDate).toLocaleDateString('vi-VN')} · {s.courtName} · {s.participantCount} người
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span className="card-sub">Thu: <b style={{ color: 'var(--c-success)' }}>{fmt(s.totalIncome)}</b></span>
                <span className="card-sub">Chi: <b style={{ color: 'var(--c-danger)' }}>{fmt(s.totalExpense)}</b></span>
                <SessionStatusBadge status={s.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, variant }: { label: string; value: string; variant?: 'primary'|'success'|'danger' }) {
  return (
    <div className={`kpi ${variant || ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
