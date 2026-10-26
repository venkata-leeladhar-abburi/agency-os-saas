import {
  ArrowRight,
  ChatCircleText,
  CurrencyInr,
  Plus,
  Receipt,
  SealCheck,
  XCircle,
} from '@phosphor-icons/react/dist/ssr';
import { ActivityFeed, type ActivityItem } from '@agency-os/ui';
import type { Activity } from '@/lib/data/types';
import { relativeTime } from '@/lib/data/views';

const KIND: Record<Activity['kind'], Pick<ActivityItem, 'icon' | 'tone'>> = {
  created: { icon: Plus },
  note: { icon: ChatCircleText },
  stage: { icon: ArrowRight, tone: 'brand' },
  won: { icon: SealCheck, tone: 'success' },
  lost: { icon: XCircle, tone: 'warning' },
  invoice: { icon: Receipt, tone: 'brand' },
  payment: { icon: CurrencyInr, tone: 'success' },
};

/** A record's history, newest first. */
export function Activities({ items }: { items: Activity[] }) {
  if (items.length === 0)
    return <p className="text-body-sm text-muted-foreground">Nothing has happened here yet.</p>;
  const now = new Date();
  return (
    <ActivityFeed
      items={items.map((a) => ({
        id: a.id,
        ...KIND[a.kind],
        who: a.who,
        text: a.kind === 'note' ? `added a note: “${a.text}”` : a.text,
        when: relativeTime(a.at, now),
        dateTime: a.at,
      }))}
    />
  );
}
