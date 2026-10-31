import type { LimitInfo } from './data/plan';
import type { Errors, Fields } from './forms';

/** What a form action sends back: a message per field, and the values to put back in the form. */
export type FormState = {
  errors?: Errors;
  values?: Fields;
  /** Shown above the form when the problem isn't one field's. */
  message?: string;
  /** Set when the action worked and the form should clear. */
  done?: number;
  /** Set when the plan has no room: the form opens the upgrade dialog. */
  limit?: LimitInfo;
};

export const EMPTY_FORM: FormState = {};
