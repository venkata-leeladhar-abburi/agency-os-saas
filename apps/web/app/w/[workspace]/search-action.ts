'use server';

import { search, type SearchItem } from '@/lib/data/search';

/** What matches the words typed in the command palette, a few of each kind. */
export async function searchAction(slug: string, query: string): Promise<SearchItem[]> {
  return search(query.slice(0, 100), slug);
}
