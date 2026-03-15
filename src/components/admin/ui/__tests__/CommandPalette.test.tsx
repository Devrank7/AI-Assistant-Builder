import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock fetch
global.fetch = vi.fn();

import { CommandPalette } from '../../CommandPalette';

describe('CommandPalette', () => {
  it('does not render when closed', () => {
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText('Search users, clients...')).not.toBeInTheDocument();
  });

  it('opens on Cmd+K', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText('Search users, clients...')).toBeInTheDocument();
  });

  it('opens on custom event', () => {
    render(<CommandPalette />);
    document.dispatchEvent(new CustomEvent('open-command-palette'));
    expect(screen.getByPlaceholderText('Search users, clients...')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText('Search users, clients...')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Search users, clients...')).not.toBeInTheDocument();
  });
});
