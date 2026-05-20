import { ReactNode, useMemo, useState } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  accessor?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  className?: string;          // e.g. 'num' for right-aligned numbers
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPage?: (p: number) => void;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  empty?: string;
  loading?: boolean;
}

export default function DataTable<T>({
  columns, rows, total, page = 1, pageSize = 20, onPage,
  rowKey, onRowClick, toolbar, empty = 'Không có dữ liệu', loading
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.accessor) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.accessor!(a), vb = col.accessor!(b);
      if (va == null && vb == null) return 0;
      if (va == null) return -dir;
      if (vb == null) return dir;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, sortKey, sortDir, columns]);

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }

  const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div className="dt-wrap">
      {toolbar && <div className="dt-toolbar">{toolbar}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table className="dt">
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} style={{ width: c.width }}
                    className={`${c.className || ''} ${c.sortable ? 'sortable' : ''}`}
                    onClick={() => c.sortable && toggleSort(c.key)}>
                  {c.header}
                  {sortKey === c.key && <span> {sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="dt-empty" colSpan={columns.length}>Đang tải…</td></tr>}
            {!loading && sorted.length === 0 &&
              <tr><td className="dt-empty" colSpan={columns.length}>{empty}</td></tr>}
            {!loading && sorted.map(r => (
              <tr key={rowKey(r)} onClick={() => onRowClick?.(r)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
                {columns.map(c => (
                  <td key={c.key} className={c.className}>
                    {c.render ? c.render(r) : (c.accessor ? String(c.accessor(r) ?? '') : '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total !== undefined && onPage && (
        <div className="pager">
          <div>Tổng: <b>{total.toLocaleString('vi-VN')}</b> · Trang {page}/{totalPages}</div>
          <div className="controls">
            <button onClick={() => onPage(1)} disabled={page <= 1}>« Đầu</button>
            <button onClick={() => onPage(page - 1)} disabled={page <= 1}>‹ Trước</button>
            <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}>Sau ›</button>
            <button onClick={() => onPage(totalPages)} disabled={page >= totalPages}>Cuối »</button>
          </div>
        </div>
      )}
    </div>
  );
}
