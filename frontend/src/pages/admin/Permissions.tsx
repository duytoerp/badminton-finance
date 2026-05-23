import { useEffect, useState } from 'react';
import AppBar from '../../components/layout/AppBar';
import { PageHeader } from '../../components/layout/Shell';
import DataTable, { Column } from '../../components/common/DataTable';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { getPermissionMatrix, PermissionMatrix, PermissionRow } from '../../api/endpoints';

const INTRO =
  'Bảng phân quyền tính năng theo vai trò người dùng. Cấu hình được khai báo ' +
  'trong mã nguồn — nếu cần thay đổi, liên hệ developer.';

export default function PermissionsAdmin() {
  const desktop = useIsDesktop();
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPermissionMatrix()
      .then(r => { if (!cancelled) setMatrix(r.data); })
      .catch(e => { if (!cancelled) setError(e?.response?.data?.message || 'Không tải được ma trận quyền.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const roles = matrix?.roles ?? [];
  const rows = matrix?.permissions ?? [];

  // ---- Desktop: DataTable ----
  const cols: Column<PermissionRow>[] = [
    {
      key: 'feature', header: 'Tính năng', sortable: true,
      accessor: r => r.label,
      render: r => (
        <div>
          <b>{r.label}</b>
          <div style={{ color: 'var(--c-muted)', fontSize: 13, marginTop: 2 }}>{r.description}</div>
          <div style={{ color: 'var(--c-muted)', fontSize: 11, marginTop: 2, fontFamily: 'monospace' }}>{r.key}</div>
        </div>
      )
    },
    ...roles.map<Column<PermissionRow>>(role => ({
      key: role,
      header: role,
      className: 'num',
      render: r => r.allowedRoles.includes(role)
        ? <span title={`${role} có quyền này`} style={{ color: 'var(--c-success)', fontWeight: 600 }}>✅</span>
        : <span title={`${role} không có quyền này`} style={{ color: 'var(--c-muted)' }}>—</span>
    }))
  ];

  if (desktop) {
    return (
      <div className="page">
        <PageHeader title="Phân quyền" subtitle={`${rows.length} quyền / ${roles.length} vai trò`} />
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, color: 'var(--c-muted)' }}>{INTRO}</p>
        </div>
        {error && <div className="card" style={{ background: '#fef2f2', color: 'var(--c-danger)' }}>{error}</div>}
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={r => r.key}
          loading={loading}
          empty={loading ? 'Đang tải…' : 'Không có quyền nào được khai báo.'}
        />
      </div>
    );
  }

  // ---- Mobile: cards ----
  return (
    <>
      <AppBar title="Phân quyền" />
      <div className="page">
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, color: 'var(--c-muted)', fontSize: 14 }}>{INTRO}</p>
        </div>
        {error && <div className="card" style={{ background: '#fef2f2', color: 'var(--c-danger)' }}>{error}</div>}
        {loading && <div className="card">Đang tải…</div>}
        {!loading && rows.length === 0 && !error && <div className="card">Không có quyền nào được khai báo.</div>}
        {rows.map(r => (
          <div key={r.key} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b style={{ fontSize: 16 }}>{r.label}</b>
            </div>
            <div style={{ color: 'var(--c-muted)', fontSize: 14, marginTop: 4 }}>{r.description}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {roles.map(role => {
                const has = r.allowedRoles.includes(role);
                return (
                  <span
                    key={role}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: has ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.15)',
                      color: has ? 'var(--c-success)' : 'var(--c-muted)',
                      border: has ? '1px solid rgba(34,197,94,0.35)' : '1px solid transparent'
                    }}
                  >
                    {has ? '✓ ' : '— '}{role}
                  </span>
                );
              })}
            </div>
            <div style={{ color: 'var(--c-muted)', fontSize: 11, marginTop: 8, fontFamily: 'monospace' }}>{r.key}</div>
          </div>
        ))}
      </div>
    </>
  );
}
