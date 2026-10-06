export interface Announcement {
  /** Unique, never-reused identifier. */
  id: string;
  /** ISO date string — when this announcement was introduced. */
  date: string;
  /** ISO date string — stop showing after this date. */
  expiresAt: string;
  title: string;
  body: string;
}

/**
 * Newest first. Only the first eligible announcement is shown per app open.
 *
 * To announce a new feature:
 *   1. Add an entry at the TOP of this array.
 *   2. Push an OTA update: `eas update --branch production --message "..."`.
 */
export const ANNOUNCEMENTS: Announcement[] = [
  // {
  //   id: '2026-10-widget-support',
  //   date: '2026-10-06',
  //   expiresAt: '2026-10-20',
  //   title: "What's New: Home Screen Widgets",
  //   body: 'You can now add a PaceCue widget to your home screen to start workouts faster!',
  // },
];
