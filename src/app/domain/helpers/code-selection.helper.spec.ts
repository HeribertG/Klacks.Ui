// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { isCodeSelected, selectionFromWire, toggleCode, toWireCodes } from './code-selection.helper';

const ALL = ['CH', 'DE', 'FR'];

describe('code selection helper', () => {
  it('treats a null selection as everything checked', () => {
    expect(isCodeSelected(null, 'CH')).toBe(true);
    expect(isCodeSelected(new Set(['DE']), 'CH')).toBe(false);
    expect(isCodeSelected(new Set(['DE']), 'DE')).toBe(true);
  });

  it('unchecking one entry out of "all" leaves the others checked', () => {
    const selection = toggleCode(null, 'DE', false, ALL);

    expect([...(selection as ReadonlySet<string>)]).toEqual(['CH', 'FR']);
  });

  it('checking the last missing entry returns to "all"', () => {
    const selection = toggleCode(new Set(['CH', 'FR']), 'DE', true, ALL);

    expect(selection).toBeNull();
  });

  it('an empty set stays "none checked" and checking one entry narrows to it', () => {
    expect(toggleCode(new Set(), 'FR', true, ALL)).toEqual(new Set(['FR']));
  });

  it('sends no codes while everything or nothing is checked', () => {
    expect(toWireCodes(null, ALL)).toEqual([]);
    expect(toWireCodes(new Set(ALL), ALL)).toEqual([]);
    expect(toWireCodes(new Set(), ALL)).toEqual([]);
  });

  it('sends only the checked codes of the visible entries once narrowed', () => {
    expect(toWireCodes(new Set(['CH', 'FR']), ALL)).toEqual(['CH', 'FR']);
    expect(toWireCodes(new Set(['CH', 'XX']), ['CH', 'DE'])).toEqual(['CH']);
  });

  it('restores the selection from the wire codes', () => {
    expect(selectionFromWire([])).toBeNull();
    expect(selectionFromWire(undefined)).toBeNull();
    expect(selectionFromWire(['CH', 'DE'])).toEqual(new Set(['CH', 'DE']));
  });
});
