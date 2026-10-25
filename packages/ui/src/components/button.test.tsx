import { PaperPlaneTilt, Trash } from '@phosphor-icons/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';
import { IconButton } from './icon-button';

describe('Button', () => {
  it('is a button of type "button" by default and runs onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Send proposal</Button>);
    const button = screen.getByRole('button', { name: 'Send proposal' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('works from the keyboard', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save draft</Button>);
    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('keeps the label while loading, is disabled and aria-busy', async () => {
    const onClick = vi.fn();
    render(
      <Button icon={PaperPlaneTilt} loading onClick={onClick}>
        Sending
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Sending' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the variant classes from tokens', () => {
    render(<Button variant="primary">Create invoice</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('shows a keyboard hint', () => {
    render(<Button kbd="Ctrl K">Search</Button>);
    expect(screen.getByText('Ctrl K').tagName).toBe('KBD');
  });

  it('renders a link with button styles when asChild', () => {
    render(
      <Button asChild variant="primary">
        <a href="/invoices/14">Open invoice</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Open invoice' });
    expect(link).toHaveAttribute('href', '/invoices/14');
    expect(link).toHaveClass('bg-primary');
  });
});

describe('IconButton', () => {
  it('uses the label as its accessible name', () => {
    render(<IconButton icon={Trash} label="Delete lead" />);
    expect(screen.getByRole('button', { name: 'Delete lead' })).toBeInTheDocument();
  });

  it('shows the label as a tooltip on keyboard focus', async () => {
    render(<IconButton icon={Trash} label="Delete lead" />);
    await userEvent.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Delete lead');
  });
});
