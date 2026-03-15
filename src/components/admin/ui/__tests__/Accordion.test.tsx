import { render, screen, fireEvent } from '@testing-library/react';
import { Accordion } from '../Accordion';

describe('Accordion', () => {
  it('renders title', () => {
    render(
      <Accordion title="Section 1">
        <p>Content</p>
      </Accordion>
    );
    expect(screen.getByText('Section 1')).toBeInTheDocument();
  });

  it('hides content by default', () => {
    render(
      <Accordion title="Section 1">
        <p>Hidden content</p>
      </Accordion>
    );
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('shows content when defaultOpen is true', () => {
    render(
      <Accordion title="Section 1" defaultOpen>
        <p>Visible content</p>
      </Accordion>
    );
    expect(screen.getByText('Visible content')).toBeInTheDocument();
  });

  it('toggles content on header click', () => {
    render(
      <Accordion title="Section 1">
        <p>Toggle content</p>
      </Accordion>
    );
    fireEvent.click(screen.getByText('Section 1'));
    expect(screen.getByText('Toggle content')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(
      <Accordion title="Knowledge" badge="42">
        <p>Items</p>
      </Accordion>
    );
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
