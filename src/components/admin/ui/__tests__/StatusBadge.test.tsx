import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders with correct text', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('applies green classes for active status', () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByText('active');
    expect(badge.className).toContain('bg-emerald');
  });

  it('applies yellow classes for trial status', () => {
    render(<StatusBadge status="trial" />);
    const badge = screen.getByText('trial');
    expect(badge.className).toContain('bg-amber');
  });

  it('applies red classes for past_due status', () => {
    render(<StatusBadge status="past_due" />);
    const badge = screen.getByText('past_due');
    expect(badge.className).toContain('bg-red');
  });

  it('applies gray classes for unknown status', () => {
    render(<StatusBadge status="canceled" />);
    const badge = screen.getByText('canceled');
    expect(badge.className).toContain('bg-slate');
  });

  it('renders custom label when provided', () => {
    render(<StatusBadge status="active" label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
