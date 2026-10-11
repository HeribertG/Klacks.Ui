// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { buildMapTileUrl } from './map-tile-url.helper';
import { buildExternalMapLink } from './external-map-link.helper';

describe('buildMapTileUrl', () => {
  it('fills zoom, column and row of a template without subdomains', () => {
    expect(buildMapTileUrl('https://tiles.example.test/{z}/{x}/{y}.png', [], 12, 2140, 1434)).toBe(
      'https://tiles.example.test/12/2140/1434.png',
    );
  });

  it('rotates the configured subdomains', () => {
    const template = 'https://{s}.tiles.example.test/{z}/{x}/{y}{r}.png';

    expect(buildMapTileUrl(template, ['x', 'y'], 3, 1, 1)).toBe('https://x.tiles.example.test/3/1/1.png');
    expect(buildMapTileUrl(template, ['x', 'y'], 3, 1, 2)).toBe('https://y.tiles.example.test/3/1/2.png');
  });

  it("falls back to Leaflet's default subdomains when none are configured", () => {
    expect(buildMapTileUrl('https://{s}.tiles.example.test/{z}/{x}/{y}.png', [], 1, 0, 0)).toBe(
      'https://a.tiles.example.test/1/0/0.png',
    );
  });
});

describe('buildExternalMapLink', () => {
  it('replaces every latitude and longitude placeholder', () => {
    expect(buildExternalMapLink('https://maps.example.test/?a={lat}&b={lon}#{lat}/{lon}', 46.9, 7.4)).toBe(
      'https://maps.example.test/?a=46.9&b=7.4#46.9/7.4',
    );
  });
});
