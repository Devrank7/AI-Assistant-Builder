// src/components/admin/ui/__tests__/FilterBar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar, type FilterConfig } from '../FilterBar';

const filters: FilterConfig[] = [
  {
    key: 'plan',
    label: 'Plan',
    options: [
      { value: 'basic', label: 'Basic' },
      { value: 'pro', label: 'Pro' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'trial', label: 'Trial' },
    ],
  },
];

describe('FilterBar', () => {
  it('renders filter dropdowns', () => {
    render(<FilterBar filters={filters} values={{}} onChange={() => {}} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('calls onChange when filter selected', () => {
    const onChange = vi.fn();
    render(<FilterBar filters={filters} values={{}} onChange={onChange} />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'basic' } });
    expect(onChange).toHaveBeenCalledWith({ plan: 'basic' });
  });

  it('shows clear all when filters are active', () => {
    render(<FilterBar filters={filters} values={{ plan: 'basic' }} onChange={() => {}} />);
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('clears all filters on clear click', () => {
    const onChange = vi.fn();
    render(<FilterBar filters={filters} values={{ plan: 'basic' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('Clear all'));
    expect(onChange).toHaveBeenCalledWith({});
  });
});
