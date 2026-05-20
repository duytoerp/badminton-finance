import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DataTable, { type Column } from './DataTable';

interface Row { id: string; name: string; debt: number; }

const rows: Row[] = [
  { id: '1', name: 'Charlie', debt: 30 },
  { id: '2', name: 'Alice', debt: 50 },
  { id: '3', name: 'Bob', debt: 10 }
];

const cols: Column<Row>[] = [
  { key: 'name', header: 'Name', sortable: true, accessor: r => r.name },
  { key: 'debt', header: 'Debt', sortable: true, accessor: r => r.debt, className: 'num' }
];

function rowNamesInOrder() {
  const tbody = screen.getAllByRole('rowgroup')[1]; // [0] = thead, [1] = tbody
  return within(tbody).getAllByRole('row').map(r => r.children[0].textContent);
}

describe('DataTable (desktop)', () => {
  it('renders headers and rows', () => {
    render(<DataTable columns={cols} rows={rows} rowKey={r => r.id} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Debt')).toBeInTheDocument();
    expect(rowNamesInOrder()).toEqual(['Charlie', 'Alice', 'Bob']);
  });

  it('sorts ascending by string on header click', async () => {
    render(<DataTable columns={cols} rows={rows} rowKey={r => r.id} />);
    await userEvent.click(screen.getByText('Name'));
    expect(rowNamesInOrder()).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('toggles to descending on second click', async () => {
    render(<DataTable columns={cols} rows={rows} rowKey={r => r.id} />);
    const nameHeader = screen.getByText('Name');
    await userEvent.click(nameHeader);
    await userEvent.click(nameHeader);
    expect(rowNamesInOrder()).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('sorts numerically on numeric column', async () => {
    render(<DataTable columns={cols} rows={rows} rowKey={r => r.id} />);
    await userEvent.click(screen.getByText('Debt'));
    expect(rowNamesInOrder()).toEqual(['Bob', 'Charlie', 'Alice']); // 10, 30, 50
  });

  it('shows empty message when no rows', () => {
    render(<DataTable columns={cols} rows={[]} rowKey={r => r.id} empty="Trống" />);
    expect(screen.getByText('Trống')).toBeInTheDocument();
  });

  it('shows loading message', () => {
    render(<DataTable columns={cols} rows={[]} rowKey={r => r.id} loading />);
    expect(screen.getByText(/Đang tải/)).toBeInTheDocument();
  });

  it('fires onRowClick when row clicked', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={cols} rows={rows} rowKey={r => r.id} onRowClick={onRowClick} />);
    await userEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it('renders pager and disables Prev on page 1', async () => {
    const onPage = vi.fn();
    render(<DataTable columns={cols} rows={rows} rowKey={r => r.id}
                     total={50} page={1} pageSize={10} onPage={onPage} />);
    expect(screen.getByText(/Trang 1\/5/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /« Đầu/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /‹ Trước/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Sau ›/ }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('disables Next on last page', () => {
    render(<DataTable columns={cols} rows={rows} rowKey={r => r.id}
                     total={50} page={5} pageSize={10} onPage={() => {}} />);
    expect(screen.getByRole('button', { name: /Sau ›/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cuối »/ })).toBeDisabled();
  });
});
