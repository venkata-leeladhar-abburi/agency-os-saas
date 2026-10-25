import { DELIVER_SCREENS } from './screens-deliver';
import { MONEY_SCREENS, PORTAL_SCREENS } from './screens-money';
import { R0_SCREENS } from './screens-r0';
import { SELL_SCREENS } from './screens-sell';
import type { ScreenDef } from './types';

/** Every R0 and R1 screen from docs/02-product/screen-inventory.md, in inventory order. */
export const SCREENS: ScreenDef[] = [
  ...R0_SCREENS,
  ...SELL_SCREENS,
  ...DELIVER_SCREENS,
  ...MONEY_SCREENS,
  ...PORTAL_SCREENS,
].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));

export function findScreen(slug: string) {
  return SCREENS.find((s) => s.slug === slug);
}
