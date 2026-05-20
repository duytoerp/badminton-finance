import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/layout/AppBar';
import { getMainFund, listSessions, Session } from '../api/endpoints';
import { SessionStatusBadge } from '../components/common/StatusBadge';

export default function Home() {
  const [fund, setFund] = useState<number>(0);
  const [recent, setRecent] = useState<Session[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const f = await getMainFund();
        setFund(f.data.currentBalance);
      } catch {}
      try {
        const s = await listSessions(1);
        setRecent(s.data.items.slice(0, 5));
      } catch {}
    })();
  }, []);

  return (
    <>
      <AppBar title="🏸 Quỹ Cầu Lông" />
      <div className="page">
        <div className="card" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: 'white' }}>
          <div className="card-sub" style={{ color: '#bae6fd' }}>Quỹ chung</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{fund.toLocaleString('vi-VN')} đ</div>
        </div>

        <h3>Buổi gần đây</h3>
        {recent.length === 0 && <p className="card-sub">Chưa có buổi nào.</p>}
        {recent.map(s => (
          <div key={s.id} className="card" onClick={() => nav(`/sessions/${s.id}`)}>
            <div className="card-row">
              <div>
                <div className="card-title">{s.title}</div>
                <div className="card-sub">
                  {new Date(s.playDate).toLocaleDateString('vi-VN')} · {s.courtName} · {s.participantCount} người
                </div>
              </div>
              <SessionStatusBadge status={s.status} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
