'use server';

import { revalidatePath } from 'next/cache';
import {
  markAllRead,
  markRead,
  notifications,
  type NotificationRow,
} from '@/lib/data/notifications';

export async function notificationsAction(
  slug: string,
): Promise<{ rows: NotificationRow[]; unread: number }> {
  return notifications(slug);
}

export async function markReadAction(slug: string, id: string) {
  await markRead(id, slug);
  revalidatePath(`/w/${slug}`, 'layout');
}

export async function markAllReadAction(slug: string) {
  await markAllRead(slug);
  revalidatePath(`/w/${slug}`, 'layout');
}
