// src/components/admin/ui/__tests__/DataTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column } from '../DataTable';

interface Row {
  id: string;
  name: string;
  email: string;
}

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email' },
];

const data: Row[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com' },
  { id: '2', name: 'Bob', email: 'bob@test.com' },
  { id: '3', name: 'Charlie', email: 'charlie@test.com' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders all rows', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('sorts by column on header click', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" />);
    fireEvent.click(screen.getByText('Name'));
    const cells = screen.getAllByRole('cell');
    // Default sort ascending — Alice first
    expect(cells[0].textContent).toBe('Alice');
    // Click again for descending
    fireEvent.click(screen.getByText('Name'));
    const cellsDesc = screen.getAllByRole('cell');
    expect(cellsDesc[0].textContent).toBe('Charlie');
  });

  it('renders empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} rowKey="id" emptyMessage="No users found" />);
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    const { container } = render(<DataTable columns={columns} data={[]} rowKey="id" loading />);
    expect(container.querySelectorAll('.admin-skeleton').length).toBeGreaterThan(0);
  });

  it('calls onRowClick when row clicked', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} rowKey="id" onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('supports row selection with checkboxes', () => {
    const onSelectionChange = vi.fn();
    render(<DataTable columns={columns} data={data} rowKey="id" selectable onSelectionChange={onSelectionChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "select all", rest are per-row
    expect(checkboxes).toHaveLength(4);
    fireEvent.click(checkboxes[1]); // select first row
    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  it('paginates when pageSize is set', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" pageSize={2} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    // Go to page 2
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });
});
