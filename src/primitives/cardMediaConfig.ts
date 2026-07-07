/**
 * Lookup tables and types backing `<CardMedia>`.
 *
 * Lives in a `.ts` file so React Fast Refresh keeps `CardMedia.tsx`
 * itself a "components-only" module — mixing constants and components
 * in the same `.tsx` file makes Vite invalidate the module on every
 * edit instead of hot-swapping it. See:
 * https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#consistent-components-exports
 */

import { ShieldAlert, AlertTriangle } from '@/lib/icons/central';

export const MEDIA_BADGE_CONFIG = {
  threat: { icon: ShieldAlert, color: 'text-red-500', usage: 'Confirmed threat detection' },
  warning: { icon: AlertTriangle, color: 'text-slate-10', usage: 'Unconfirmed or low-confidence' },
  bird: { icon: ShieldAlert, color: 'text-amber-400', usage: 'Bird / false positive' },
} as const;

export type MediaBadgeType = keyof typeof MEDIA_BADGE_CONFIG;
