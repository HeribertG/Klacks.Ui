// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { parseNavigationOptionValue, toNavigationOptionValue } from './navigation-option-value.helper';

describe('navigation option value', () => {
  it('keeps a route without target as the plain route', () => {
    expect(toNavigationOptionValue('/workplace/settings')).toBe('/workplace/settings');
  });

  it('gives the same route a distinct value per target', () => {
    expect(toNavigationOptionValue('/workplace/settings', 'llm-provider')).not.toBe(
      toNavigationOptionValue('/workplace/settings'),
    );
  });

  it('round-trips route and target', () => {
    expect(parseNavigationOptionValue(toNavigationOptionValue('/workplace/settings', 'llm-provider'))).toEqual({
      route: '/workplace/settings',
      target: 'llm-provider',
    });
  });

  it('parses a plain route without a target', () => {
    expect(parseNavigationOptionValue('/workplace/client')).toEqual({ route: '/workplace/client' });
  });

  it('ignores an empty target', () => {
    expect(toNavigationOptionValue('/workplace/client', '')).toBe('/workplace/client');
    expect(parseNavigationOptionValue('/workplace/client#')).toEqual({ route: '/workplace/client' });
  });
});
