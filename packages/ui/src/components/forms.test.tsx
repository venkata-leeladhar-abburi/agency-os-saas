import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { Select } from './select';
import { Switch } from './switch';
import { Textarea } from './textarea';

describe('Input', () => {
  it('is labelled and described by its hint', () => {
    render(<Input label="Budget" hint="Before GST." prefix="₹" />);
    const input = screen.getByLabelText('Budget');
    expect(input).toHaveAccessibleDescription('Before GST.');
    expect(screen.getByText('₹')).toBeInTheDocument();
  });

  it('marks errors with aria-invalid and reads the error first', () => {
    render(
      <Input
        label="GSTIN"
        hint="15 characters"
        error="A GSTIN has 15 characters. This one has 14."
      />,
    );
    const input = screen.getByLabelText('GSTIN');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'A GSTIN has 15 characters. This one has 14. 15 characters',
    );
  });

  it('announces required and shows optional', () => {
    render(
      <>
        <Input label="Client name" required />
        <Input label="Website" optional />
      </>,
    );
    expect(screen.getByLabelText(/Client name/)).toBeRequired();
    expect(screen.getByText('(required)', { exact: false })).toHaveClass('sr-only');
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('accepts typing and can be disabled', async () => {
    const onChange = vi.fn();
    render(
      <>
        <Input label="Name" onChange={onChange} />
        <Input label="Number" disabled defaultValue="OSS/26-27/014" />
      </>,
    );
    await userEvent.type(screen.getByLabelText('Name'), 'Kite');
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(screen.getByLabelText('Number')).toBeDisabled();
  });
});

describe('Textarea and Select', () => {
  it('labels a textarea with 3 rows by default', () => {
    render(<Textarea label="Scope" />);
    expect(screen.getByLabelText('Scope')).toHaveAttribute('rows', '3');
  });

  it('lists options and changes value', async () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Currency"
        options={['INR', { value: 'USD', label: 'US dollar' }]}
        onChange={onChange}
      />,
    );
    const select = screen.getByLabelText('Currency');
    await userEvent.selectOptions(select, 'USD');
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole('option', { name: 'US dollar' })).toHaveProperty('selected', true);
  });

  it('shows a placeholder option that cannot be chosen', () => {
    render(
      <Select
        label="Owner"
        placeholder="Choose a person"
        defaultValue=""
        options={['Kiran Rao']}
      />,
    );
    expect(screen.getByRole('option', { name: 'Choose a person' })).toBeDisabled();
  });
});

describe('Checkbox and Switch', () => {
  it('toggles a checkbox by clicking its label and with Space', async () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        label="Send a copy to me"
        description="To your email"
        onCheckedChange={onCheckedChange}
      />,
    );
    const box = screen.getByRole('checkbox', { name: 'Send a copy to me' });
    expect(box).toHaveAccessibleDescription('To your email');
    await userEvent.click(screen.getByText('Send a copy to me'));
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    box.focus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it('supports the indeterminate state', () => {
    render(<Checkbox label="Select all" checked="indeterminate" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
  });

  it('switches with the keyboard and reports its state', async () => {
    render(<Switch label="Payment reminders" />);
    const control = screen.getByRole('switch', { name: 'Payment reminders' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    control.focus();
    await userEvent.keyboard(' ');
    expect(control).toHaveAttribute('aria-checked', 'true');
  });

  it('cannot be changed when disabled', async () => {
    render(<Switch label="Two-step sign-in" disabled defaultChecked />);
    const control = screen.getByRole('switch');
    await userEvent.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');
  });
});
