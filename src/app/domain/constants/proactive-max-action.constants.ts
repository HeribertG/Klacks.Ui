// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * How far Klacksy may go on its own for one trigger kind, mirroring the backend ProactiveMaxAction
 * enum. Shared by the governance settings card and the per-finding "mach du" delegation button, so both
 * surfaces send the same ordinal values the backend expects.
 */
export const PROACTIVE_MAX_ACTION = {
  Hint: 0,
  Prepare: 1,
  Execute: 2,
} as const;

export type ProactiveMaxAction = (typeof PROACTIVE_MAX_ACTION)[keyof typeof PROACTIVE_MAX_ACTION];
