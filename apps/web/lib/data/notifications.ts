// Server only. The in-app notification list and each person's settings for it.
import { newId, store } from './shared';
import type { NotificationCategory, WorkspaceSettings } from './types';
import { relativeTime } from './views';

/**
 * Adds a notification if its category is on in the app. Email follows the same settings once
 * email sending is set up (RESEND_API_KEY); until then nothing is emailed.
 */
export function notify(
  category: NotificationCategory,
  title: string,
  detail: string,
  /** Inside the workspace: "/projects/acme-web". */
  href: string,
) {
  const s = store();
  if (!s.settings.notificationPrefs[category]?.inApp) return;
  s.notifications.unshift({
    id: newId('n'),
    category,
    title,
    detail,
    href,
    at: new Date().toISOString(),
    read: false,
  });
}

export type NotificationRow = {
  id: string;
  title: string;
  detail: string;
  href: string;
  when: string;
  at: string;
  read: boolean;
};

export async function notifications(
  slug: string,
): Promise<{ rows: NotificationRow[]; unread: number }> {
  const now = new Date();
  const rows = [...store().notifications]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 50)
    .map((n) => ({
      id: n.id,
      title: n.title,
      detail: n.detail,
      href: `/w/${slug}${n.href}`,
      when: relativeTime(n.at, now),
      at: n.at,
      read: n.read,
    }));
  return { rows, unread: store().notifications.filter((n) => !n.read).length };
}

export async function markRead(id: string) {
  const n = store().notifications.find((x) => x.id === id);
  if (n) n.read = true;
}

export async function markAllRead() {
  for (const n of store().notifications) n.read = true;
}

export async function saveNotificationPrefs(prefs: WorkspaceSettings['notificationPrefs']) {
  store().settings.notificationPrefs = prefs;
}
