// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shrink-only list of production files that still declare more than one top-level class or interface, keyed by path
 * relative to Klacks.Ui with the number of declarations allowed. one-class-interface-per-file.guard.spec.ts fails on
 * any unlisted file with more than one declaration, on any listed file that grew, and on any entry whose count already
 * dropped. Never add an entry; the target state is an empty list.
 */
export const MULTI_DECLARATION_FILES: Readonly<Record<string, number>> = {
};
