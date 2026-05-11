/**
 * Static notification fixture data + types for the notification system.
 *
 * Lives in a `.ts` file (not the JSX-bearing `NotificationSystem.tsx`)
 * so React Fast Refresh treats it as a plain data module and can
 * hot-swap it without invalidating the toast UI.
 */

export type ThreatLevel = 'critical' | 'high' | 'medium' | 'info' | 'success' | 'suspect';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  level: ThreatLevel;
  code?: string;
  timestamp?: string;
}
