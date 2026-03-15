import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockAlerts = [
  {
    id: '1',
    type: 'past_due',
    title: 'Past Due Payment',
    message: 'alice@test.com — overdue',
    link: '/admin/users/1',
    severity: 'danger',
  },
  {
    id: '2',
    type: 'trial_expiring',
    title: 'Trial Expiring',
    message: 'bob@test.com — 2 days left',
    link: '/admin/users/2',
    severity: 'warning',
  },
];

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: mockAlerts }),
});

import { NotificationCenter } from '../../NotificationCenter';

describe('NotificationCenter', () => {
  it('renders bell icon', () => {
    render(<NotificationCenter />);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('shows unread badge with count', async () => {
    render(<NotificationCenter />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('toggles dropdown on click', async () => {
    render(<NotificationCenter />);
    await waitFor(() => screen.getByText('2'));
    fireEvent.click(screen.getByLabelText('Notifications'));
    expect(screen.getByText('Past Due Payment')).toBeInTheDocument();
    expect(screen.getByText('Trial Expiring')).toBeInTheDocument();
  });
});
