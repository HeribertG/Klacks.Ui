// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Wire model for the default shift macro endpoint: the macro the backend assigns to a new shift
 * when none is chosen, or null when no default macro of category Shift is configured.
 */
export interface IDefaultShiftMacro {
  macroId: string | null;
}
