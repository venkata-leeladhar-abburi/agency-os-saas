import { describe, expect, it } from 'vitest';
import {
  dueDate,
  exportLutText,
  formatDocumentNumber,
  invoiceType,
  isOverdue,
  reminderSchedule,
} from './invoices';

describe('invoice rules', () => {
  it('picks the document type from the tax treatment', () => {
    expect(invoiceType('intra')).toBe('tax_invoice');
    expect(invoiceType('inter')).toBe('tax_invoice');
    expect(invoiceType('export_lut')).toBe('export_lut');
    expect(invoiceType('none')).toBe('bill_of_supply');
    expect(invoiceType('intra', true)).toBe('proforma');
  });

  it('numbers tax invoices and proformas in separate series', () => {
    expect(formatDocumentNumber('OSS', 'tax_invoice', '2027-03-31', 14)).toBe('OSS/26-27/014');
    expect(formatDocumentNumber('OSS', 'export_lut', '2027-04-01', 1)).toBe('OSS/27-28/001');
    expect(formatDocumentNumber('OSS', 'proforma', '2026-10-26', 3)).toBe('OSS/PF26-27/003');
    expect(() => formatDocumentNumber('OSS', 'proforma', '2026-10-26', 0)).toThrow();
    expect(() => formatDocumentNumber('ONESTOP', 'proforma', '2026-10-26', 1)).toThrow(
      '16 characters',
    );
  });

  it('works out the due date from the payment terms', () => {
    expect(dueDate('2026-10-26')).toBe('2026-11-02');
    expect(dueDate('2026-10-26', 0)).toBe('2026-10-26');
    expect(dueDate('2027-02-20', 15)).toBe('2027-03-07');
    expect(() => dueDate('2026-10-26', -1)).toThrow();
    expect(() => dueDate('2026-10-26', 1.5)).toThrow();
  });

  it('schedules reminders, none before the issue date', () => {
    expect(reminderSchedule('2026-10-26', '2026-11-02')).toEqual([
      { kind: 'before_due', on: '2026-10-30' },
      { kind: 'on_due', on: '2026-11-02' },
      { kind: 'after_due_3', on: '2026-11-05' },
      { kind: 'after_due_7', on: '2026-11-09' },
    ]);
    expect(reminderSchedule('2026-10-26', '2026-10-26').map((r) => r.kind)).toEqual([
      'after_due_3',
      'after_due_7',
    ]);
  });

  it('works out overdue from the status and due date', () => {
    expect(isOverdue('issued', '2026-10-25', '2026-10-26')).toBe(true);
    expect(isOverdue('partially_paid', '2026-10-25', '2026-10-26')).toBe(true);
    expect(isOverdue('issued', '2026-10-26', '2026-10-26')).toBe(false);
    expect(isOverdue('paid', '2026-10-01', '2026-10-26')).toBe(false);
    expect(isOverdue('issued', null, '2026-10-26')).toBe(false);
  });

  it('writes the export-under-LUT line', () => {
    expect(exportLutText('AD360000000000X', '2026-04-01')).toBe(
      'Supply meant for export under LUT (ARN AD360000000000X, dated 1 Apr 2026) without payment of IGST.',
    );
  });
});
