// How a client can pay online (Razorpay offers these in India). Shared by server and client.
export const ONLINE_METHODS = [
  { value: 'upi', label: 'UPI', note: 'Any UPI app' },
  { value: 'card', label: 'Card', note: 'Debit or credit' },
  { value: 'net_banking', label: 'Net banking', note: 'All major banks' },
] as const;

export type OnlineMethod = (typeof ONLINE_METHODS)[number]['value'];

export function isOnlineMethod(v: unknown): v is OnlineMethod {
  return ONLINE_METHODS.some((m) => m.value === v);
}
