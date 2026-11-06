// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  brokenKeywordWishCount,
  hasKeywordWishes,
  keywordWishOutcomeKey,
  scheduleCommandKeywordLabel,
  ScheduleCommandKeywordLabels,
  toKeywordWishRows,
} from './keyword-wish.helper';
import { KeywordWishes } from 'src/app/domain/models/schedule/keyword-wishes.interface';

const LABELS: ScheduleCommandKeywordLabels = {
  commandKeywordFree: 'FREI',
  commandKeywordNegFree: '-FREI',
  commandKeywordEarly: 'FRUEH',
  commandKeywordNegEarly: '-FRUEH',
  commandKeywordLate: 'SPAET',
  commandKeywordNegLate: '-SPAET',
  commandKeywordNight: 'NACHT',
  commandKeywordNegNight: '-NACHT',
};

const EMPTY: KeywordWishes = { brokenFree: 0, brokenOnly: 0, brokenNo: 0, unfulfilled: 0, items: [] };

describe('keyword-wish.helper', () => {
  it('maps every backend keyword name to the configured keyword label', () => {
    // Arrange
    const expected: Record<string, string> = {
      Free: 'FREI',
      NotFree: '-FREI',
      OnlyEarly: 'FRUEH',
      NoEarly: '-FRUEH',
      OnlyLate: 'SPAET',
      NoLate: '-SPAET',
      OnlyNight: 'NACHT',
      NoNight: '-NACHT',
    };

    // Act / Assert
    for (const [keyword, label] of Object.entries(expected)) {
      expect(scheduleCommandKeywordLabel(keyword, LABELS)).toBe(label);
    }
  });

  it('shows an unknown keyword name as it came', () => {
    // Arrange / Act / Assert
    expect(scheduleCommandKeywordLabel('Something', LABELS)).toBe('Something');
  });

  it('maps outcomes to their i18n keys and an unknown outcome to the fallback key', () => {
    // Arrange / Act / Assert
    expect(keywordWishOutcomeKey('BrokenFree')).toBe('keywordWishes.outcome.brokenFree');
    expect(keywordWishOutcomeKey('BrokenOnly')).toBe('keywordWishes.outcome.brokenOnly');
    expect(keywordWishOutcomeKey('BrokenNo')).toBe('keywordWishes.outcome.brokenNo');
    expect(keywordWishOutcomeKey('Unfulfilled')).toBe('keywordWishes.outcome.unfulfilled');
    expect(keywordWishOutcomeKey('Other')).toBe('keywordWishes.outcome.unknown');
  });

  it('counts the broken tiers without the unfulfilled wishes', () => {
    // Arrange
    const wishes: KeywordWishes = { ...EMPTY, brokenFree: 2, brokenOnly: 1, brokenNo: 3, unfulfilled: 5 };

    // Act / Assert
    expect(brokenKeywordWishCount(wishes)).toBe(6);
    expect(brokenKeywordWishCount(null)).toBe(0);
  });

  it('reports content only when a count or an item exists', () => {
    // Arrange / Act / Assert
    expect(hasKeywordWishes(undefined)).toBe(false);
    expect(hasKeywordWishes(EMPTY)).toBe(false);
    expect(hasKeywordWishes({ ...EMPTY, unfulfilled: 1 })).toBe(true);
    expect(hasKeywordWishes({ ...EMPTY, brokenNo: 1 })).toBe(true);
  });

  it('resolves employee names and falls back for an employee not shown', () => {
    // Arrange
    const items = [
      { clientId: 'c-1', date: '2026-11-02', keyword: 'Free', outcome: 'BrokenFree' },
      { clientId: 'c-9', date: '2026-11-03', keyword: 'NoNight', outcome: 'BrokenNo' },
    ];
    const clients = [{ id: 'c-1', firstName: 'Anna', name: 'Muster' }];

    // Act
    const rows = toKeywordWishRows(items, clients, 'Unknown');

    // Assert
    expect(rows).toEqual([
      { clientName: 'Anna Muster', date: '2026-11-02', keyword: 'Free', outcome: 'BrokenFree' },
      { clientName: 'Unknown', date: '2026-11-03', keyword: 'NoNight', outcome: 'BrokenNo' },
    ]);
  });
});
