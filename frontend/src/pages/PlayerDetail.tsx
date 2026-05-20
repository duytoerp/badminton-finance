import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { PageHeader } from '../components/layout/Shell';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { getPlayerHistory, GROUP_TYPE_LABEL, GROUP_TYPE_BADGE_CLS, PlayerGroupType } from '../api/endpoints';
import { PaymentBadge } from '../components/common/StatusBadge';
import DataTable, { Column } from '../components/common/DataTable';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

export default function PlayerDetail() {
  const { id } = useParams();
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    getPlayerHistory(id).then(r => setData(r.data));
  }, [id]);

  if (!data) return <><AppBar title="Lịch sử" /><div className="page">Đang tải…</div></>;

  const cols: Column<any>[] = [
    { key: 'date', header: 'Buổi (Session)', sortable: true,
      accessor: r => r.sessionId,
      render: r => <a href="#" onClick={(e) => { e.preventDefault(); nav(`/sessions/${r.sessionId}`); }}>{r.sessionId.slice(0, 8)}…</a> },
    { key: 'via', header: 'Vào qua', accessor: r => r.joinedViaGroupName || '',
      render: r => r.joinedViaGroupName
        ? <span className={'badge ' + (r.joinedViaGroupType ? GROUP_TYPE_BADGE_CLS[r.joinedViaGroupType as PlayerGroupType] : 'draft')}
            title={r.joinedViaGroupType ? GROUP_TYPE_LABEL[r.joinedViaGroupType as PlayerGroupType] : ''}>
            {r.joinedViaGroupName}
          </span>
        : <span className="card-sub">Cá nhân</span> },
    { key: 'slots', header: 'Suất', className: 'num', accessor: r => r.slotCount },
    { key: 'due', header: 'Phải trả', className: 'num', sortable: true, accessor: r => r.amountDue,
      render: r => fmt(r.amountDue) },
    { key: 'paid', header: 'Đã trả', className: 'num', sortable: true, accessor: r => r.amountPaid,
      render: r => fmt(r.amountPaid) },
    { key: 'debt', header: 'Còn', className: 'num', accessor: r => r.debt,
      render: r => r.debt > 0 ? <b style={{ color: 'var(--c-danger)' }}>{fmt(r.debt)}</b> : '—' },
    { key: 'status', header: 'Trạng thái', render: r => <PaymentBadge status={r.paymentStatus} /> }
  ];

  return (
    <>
      {!desktop && <AppBar title={data.playerName} />}
      <div className="page">
        {desktop && <PageHeader title={data.playerName} subtitle="Lịch sử tham gia & thanh toán"
          actions={<button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>← Quay lại</button>} />}
        <div className="kpi-grid">
          <div className="kpi"><div className="label">Số buổi tham gia</div><div className="value">{data.totalSessions}</div></div>
          <div className="kpi success"><div className="label">Tổng đã trả</div><div className="value">{fmt(data.totalPaid)}</div></div>
          <div className="kpi"><div className="label">Tổng phải trả</div><div className="value">{fmt(data.totalDue)}</div></div>
          <div className="kpi danger"><div className="label">Còn nợ</div><div className="value">{fmt(data.currentDebt)}</div></div>
        </div>

        {desktop ? (
          <DataTable columns={cols} rows={data.sessions} rowKey={r => r.id} />
        ) : (
          data.sessions.map((p: any) => (
            <div className="card" key={p.id} onClick={() => nav(`/sessions/${p.sessionId}`)}>
              <div className="card-row">
                <div>
                  <div className="card-title">Buổi {p.sessionId.slice(0, 8)}…</div>
                  <div className="card-sub">{p.slotCount} suất · {fmt(p.amountDue)}</div>
                  <div className="card-sub" style={{ marginTop: 4 }}>
                    {p.joinedViaGroupName
                      ? <>Vào qua: <span className={'badge ' + (p.joinedViaGroupType ? GROUP_TYPE_BADGE_CLS[p.joinedViaGroupType as PlayerGroupType] : 'draft')}>{p.joinedViaGroupName}</span></>
                      : 'Thêm cá nhân'}
                  </div>
                </div>
                <PaymentBadge status={p.paymentStatus} />
              </div>
              {p.debt > 0 && <div style={{ color: 'var(--c-danger)' }}>Còn nợ: {fmt(p.debt)}</div>}
            </div>
          ))
        )}
      </div>
    </>
  );
}
