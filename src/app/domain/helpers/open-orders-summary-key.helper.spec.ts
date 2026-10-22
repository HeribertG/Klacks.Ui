// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { openOrdersSummaryKey } from './open-orders-summary-key.helper';
import { OPEN_ORDERS_SUMMARY_I18N } from 'src/app/domain/constants/open-orders-summary.constants';

describe('openOrdersSummaryKey', () => {
  it.each([
    ['1', '0', OPEN_ORDERS_SUMMARY_I18N.OneNoneSoon],
    ['1', '1', OPEN_ORDERS_SUMMARY_I18N.OneSoon],
    ['12', '0', OPEN_ORDERS_SUMMARY_I18N.ManyNoneSoon],
    ['12', '1', OPEN_ORDERS_SUMMARY_I18N.ManyOneSoon],
    ['12', '3', OPEN_ORDERS_SUMMARY_I18N.General],
    ['2', '2', OPEN_ORDERS_SUMMARY_I18N.General],
  ])('count %s with soonCount %s reads %s', (count, soonCount, expected) => {
    expect(openOrdersSummaryKey({ count, soonCount })).toBe(expected);
  });

  it.each([
    [undefined],
    [{}],
    [{ count: '3' }],
    [{ count: 'drei', soonCount: '1' }],
    [{ count: '-1', soonCount: '0' }],
    [{ count: '1', soonCount: '2' }],
  ])('falls back to the general sentence for %j', (params) => {
    expect(openOrdersSummaryKey(params as Record<string, string> | undefined)).toBe(OPEN_ORDERS_SUMMARY_I18N.General);
  });
});
