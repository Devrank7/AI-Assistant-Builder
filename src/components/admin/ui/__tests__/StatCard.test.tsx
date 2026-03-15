import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Users" value="1,234" />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders positive trend with up arrow', () => {
    render(<StatCard label="MRR" value="$5,000" trend={{ value: 12, positive: true }} />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders negative trend with down arrow', () => {
    render(<StatCard label="Churn" value="3%" trend={{ value: 5, positive: false }} />);
    expect(screen.getByText('-5%')).toBeInTheDocument();
  });

  it('renders subtext when provided', () => {
    render(<StatCard label="MRR" value="$5,000" subtext="3 past due" />);
    expect(screen.getByText('3 past due')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(<StatCard label="MRR" value="$5,000" loading />);
    expect(container.querySelector('.admin-skeleton')).toBeInTheDocument();
  });
});
