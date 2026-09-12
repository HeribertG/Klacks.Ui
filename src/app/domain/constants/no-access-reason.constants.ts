// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Why a route guard sent the user to /no-access. The value travels two ways on purpose: through
 * NoAccessReasonService for the caller that awaited the navigation (deterministic, set before the
 * guard returns false), and as a query parameter so a deep link or a reload still shows the right
 * page text.
 */
export const NO_ACCESS_REASON_QUERY_PARAM = 'reason';

/** The user is signed in but lacks the role for this route. */
export const NO_ACCESS_REASON_PERMISSION = 'permission';

/** The route exists but its feature is not active in this installation (plugin off, no IMAP). */
export const NO_ACCESS_REASON_FEATURE = 'feature';

export type NoAccessReason =
  | typeof NO_ACCESS_REASON_PERMISSION
  | typeof NO_ACCESS_REASON_FEATURE;

/** Wording of the /no-access page for a missing right - the text this page always had. */
export const NO_ACCESS_PERMISSION_KEY = 'no-access.message';

/** Wording of the /no-access page for a feature that was never activated here. */
export const NO_ACCESS_FEATURE_DISABLED_KEY = 'no-access.feature-disabled';
