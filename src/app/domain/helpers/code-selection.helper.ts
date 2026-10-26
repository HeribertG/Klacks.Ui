// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Selection of codes in a checkbox list where "nothing narrowed yet" is the default. A null selection means every
 * entry is checked; a set holds exactly the checked entries (an empty set = none checked).
 * @param selection - Current selection, null = all entries checked
 * @param code - Code of the entry that is read or toggled
 * @param checked - New checked state of the toggled entry
 * @param allCodes - Codes of every entry in the list
 * @param visibleCodes - Codes of the entries currently offered; the wire form only covers these
 * @param wireCodes - Codes the filter holds on the wire, empty = no restriction
 */

export type CodeSelection = ReadonlySet<string> | null;

export function isCodeSelected(selection: CodeSelection, code: string): boolean {
  return selection === null || selection.has(code);
}

export function toggleCode(
  selection: CodeSelection,
  code: string,
  checked: boolean,
  allCodes: readonly string[],
): CodeSelection {
  const next = new Set(selection ?? allCodes);
  if (checked) {
    next.add(code);
  } else {
    next.delete(code);
  }
  return allCodes.every((entry) => next.has(entry)) ? null : next;
}

export function toWireCodes(selection: CodeSelection, visibleCodes: readonly string[]): string[] {
  if (selection === null) {
    return [];
  }
  const checked = visibleCodes.filter((code) => selection.has(code));
  return checked.length === 0 || checked.length === visibleCodes.length ? [] : checked;
}

export function selectionFromWire(wireCodes: readonly string[] | undefined): CodeSelection {
  return wireCodes && wireCodes.length > 0 ? new Set(wireCodes) : null;
}
