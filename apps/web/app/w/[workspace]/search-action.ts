'use server';

import { searchIndex, type SearchItem } from '@/lib/data/search';

/** Everything the palette can find, loaded when it opens. */
export async function searchAction(slug: string): Promise<SearchItem[]> {
  return searchIndex(slug);
}
