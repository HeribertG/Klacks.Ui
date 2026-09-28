// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { toCommercialLicenseUrl } from './commercial-license-url.helper';

describe('toCommercialLicenseUrl', () => {
  it('links German to the unprefixed page', () => {
    expect(toCommercialLicenseUrl('de')).toBe('https://klacks-software.ch/lizenz');
  });

  it('prefixes other website languages', () => {
    expect(toCommercialLicenseUrl('fr')).toBe('https://klacks-software.ch/fr/lizenz');
  });

  it('lower-cases regional Chinese codes to the website slug', () => {
    expect(toCommercialLicenseUrl('zh-CN')).toBe('https://klacks-software.ch/zh-cn/lizenz');
    expect(toCommercialLicenseUrl('zh-TW')).toBe('https://klacks-software.ch/zh-tw/lizenz');
  });

  it('falls back to the unprefixed page for unknown or missing languages', () => {
    expect(toCommercialLicenseUrl('xx')).toBe('https://klacks-software.ch/lizenz');
    expect(toCommercialLicenseUrl(undefined)).toBe('https://klacks-software.ch/lizenz');
  });
});
