// src/components/admin/ui/__tests__/QuickActionMenu.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActionMenu, type MenuItem } from '../QuickActionMenu';

const items: MenuItem[] = [
  { label: 'Edit', onClick: vi.fn() },
  { type: 'divider' },
  { label: 'Delete', onClick: vi.fn(), variant: 'danger' },
];

describe('QuickActionMenu', () => {
  it('renders trigger button', () => {
    render(<QuickActionMenu items={items} />);
    expect(screen.getByLabelText('Actions')).toBeInTheDocument();
  });

  it('shows menu on click', () => {
    render(<QuickActionMenu items={items} />);
    fireEvent.click(screen.getByLabelText('Actions'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onClick and closes menu', () => {
    render(<QuickActionMenu items={items} />);
    fireEvent.click(screen.getByLabelText('Actions'));
    fireEvent.click(screen.getByText('Edit'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((items[0] as any).onClick).toHaveBeenCalled();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('renders submenu items', () => {
    const subItems: MenuItem[] = [
      {
        label: 'Change Plan',
        submenu: [
          { label: 'Basic', onClick: vi.fn() },
          { label: 'Pro', onClick: vi.fn() },
        ],
      },
    ];
    render(<QuickActionMenu items={subItems} />);
    fireEvent.click(screen.getByLabelText('Actions'));
    fireEvent.click(screen.getByText('Change Plan'));
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });
});
