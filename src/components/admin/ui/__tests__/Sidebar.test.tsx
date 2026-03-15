import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn() }),
}));

import { Sidebar } from '../../Sidebar';

describe('Sidebar', () => {
  it('renders logo text', () => {
    render(<Sidebar />);
    expect(screen.getByText('WinBix AI')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders Cmd+K shortcut hint', () => {
    render(<Sidebar />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('highlights active link based on pathname', () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).toContain('text-[var(--admin-accent-blue)]');
  });
});
