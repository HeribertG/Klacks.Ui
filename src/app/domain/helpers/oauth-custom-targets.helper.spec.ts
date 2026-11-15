// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  checkNewOAuthCustomTarget,
  checkOAuthCustomTarget,
  parseOAuthCustomTargets,
  serializeOAuthCustomTargets,
} from './oauth-custom-targets.helper';
import {
  OAUTH_CUSTOM_TARGET_ERROR,
  OAUTH_CUSTOM_TARGET_MAX_ENTRIES,
  OAUTH_CUSTOM_TARGET_MAX_LENGTH,
} from 'src/app/domain/constants/oauth-connection.constants';

describe('checkOAuthCustomTarget', () => {
  it.each([
    ['https://tool.example.com/oauth/callback', 'https://tool.example.com/oauth/callback'],
    ['  https://tool.example.com  ', 'https://tool.example.com'],
    ['HTTPS://Tool.Example.COM/Callback', 'https://tool.example.com/Callback'],
    ['https://tool.example.com:443/cb', 'https://tool.example.com/cb'],
    ['https://tool.example.com/a/b/', 'https://tool.example.com/a/b/'],
    ['https://tool.example.com/', 'https://tool.example.com/'],
    ['https://a-b.example.co.uk/x_y.z~1', 'https://a-b.example.co.uk/x_y.z~1'],
    ['https://bücher.example/cb', 'https://xn--bcher-kva.example/cb'],
  ])('accepts %s and canonicalises it to %s', (input, canonical) => {
    expect(checkOAuthCustomTarget(input)).toEqual({ canonical, errorKey: null });
  });

  it.each([
    ['', OAUTH_CUSTOM_TARGET_ERROR.Empty],
    ['   ', OAUTH_CUSTOM_TARGET_ERROR.Empty],
    [`https://example.com/${'a'.repeat(OAUTH_CUSTOM_TARGET_MAX_LENGTH)}`, OAUTH_CUSTOM_TARGET_ERROR.TooLong],
    ['http://tool.example.com/cb', OAUTH_CUSTOM_TARGET_ERROR.NotHttps],
    ['tool.example.com/cb', OAUTH_CUSTOM_TARGET_ERROR.NotHttps],
    ['ftp://tool.example.com', OAUTH_CUSTOM_TARGET_ERROR.NotHttps],
    ['https://tool.example.com/cb?x=1', OAUTH_CUSTOM_TARGET_ERROR.ForbiddenCharacters],
    ['https://tool.example.com/cb#frag', OAUTH_CUSTOM_TARGET_ERROR.ForbiddenCharacters],
    ['https://user@tool.example.com/cb', OAUTH_CUSTOM_TARGET_ERROR.ForbiddenCharacters],
    ['https://tool.example.com\\@evil.com/cb', OAUTH_CUSTOM_TARGET_ERROR.ForbiddenCharacters],
    ['https://tool.example.com/%2e%2e/cb', OAUTH_CUSTOM_TARGET_ERROR.ForbiddenCharacters],
    ['https://tool.example.com/a b', OAUTH_CUSTOM_TARGET_ERROR.ForbiddenCharacters],
    ['https://tool.example.com:8443/cb', OAUTH_CUSTOM_TARGET_ERROR.Port],
    ['https://tool.example.com:/cb', OAUTH_CUSTOM_TARGET_ERROR.Port],
    ['https:///cb', OAUTH_CUSTOM_TARGET_ERROR.HostMissing],
    ['https://-bad.example.com/cb', OAUTH_CUSTOM_TARGET_ERROR.HostInvalid],
    ['https://bad..example.com/cb', OAUTH_CUSTOM_TARGET_ERROR.HostInvalid],
    ['https://bad_host.example.com/cb', OAUTH_CUSTOM_TARGET_ERROR.HostInvalid],
    [`https://${'a'.repeat(64)}.example.com/cb`, OAUTH_CUSTOM_TARGET_ERROR.HostInvalid],
    ['https://127.0.0.1/cb', OAUTH_CUSTOM_TARGET_ERROR.IpAddress],
    ['https://2130706433/cb', OAUTH_CUSTOM_TARGET_ERROR.IpAddress],
    ['https://0x7f.1/cb', OAUTH_CUSTOM_TARGET_ERROR.IpAddress],
    ['https://[::1]/cb', OAUTH_CUSTOM_TARGET_ERROR.Port],
    ['https://localhost/cb', OAUTH_CUSTOM_TARGET_ERROR.Localhost],
    ['https://LOCALHOST/cb', OAUTH_CUSTOM_TARGET_ERROR.Localhost],
    ['https://tool.example.com/a/../cb', OAUTH_CUSTOM_TARGET_ERROR.Path],
    ['https://tool.example.com/./cb', OAUTH_CUSTOM_TARGET_ERROR.Path],
    ['https://tool.example.com/a//b', OAUTH_CUSTOM_TARGET_ERROR.Path],
    ['https://tool.example.com//', OAUTH_CUSTOM_TARGET_ERROR.Path],
    ['https://tool.example.com/a,b', OAUTH_CUSTOM_TARGET_ERROR.Path],
  ])('rejects %s', (input, errorKey) => {
    expect(checkOAuthCustomTarget(input)).toEqual({ canonical: '', errorKey });
  });
});

describe('checkNewOAuthCustomTarget', () => {
  it('rejects a duplicate of an existing entry after canonicalisation', () => {
    const existing = ['https://tool.example.com/cb'];

    expect(checkNewOAuthCustomTarget(existing, 'HTTPS://TOOL.example.com:443/cb')).toEqual({
      canonical: '',
      errorKey: OAUTH_CUSTOM_TARGET_ERROR.Duplicate,
    });
  });

  it('keeps a different path on the same host as a new entry', () => {
    expect(checkNewOAuthCustomTarget(['https://tool.example.com/cb'], 'https://tool.example.com/other')).toEqual({
      canonical: 'https://tool.example.com/other',
      errorKey: null,
    });
  });

  it('rejects an entry once the list holds the maximum number of targets', () => {
    const full = Array.from({ length: OAUTH_CUSTOM_TARGET_MAX_ENTRIES }, (_, index) => `https://t${index}.example.com`);

    expect(checkNewOAuthCustomTarget(full, 'https://new.example.com').errorKey).toBe(OAUTH_CUSTOM_TARGET_ERROR.LimitReached);
    expect(checkNewOAuthCustomTarget(full.slice(1), 'https://new.example.com').errorKey).toBeNull();
  });

  it('reports the rule violation of an invalid entry before the duplicate check', () => {
    expect(checkNewOAuthCustomTarget([], 'http://tool.example.com').errorKey).toBe(OAUTH_CUSTOM_TARGET_ERROR.NotHttps);
  });
});

describe('parseOAuthCustomTargets and serializeOAuthCustomTargets', () => {
  it('round-trips a list through its JSON text', () => {
    const targets = ['https://a.example.com', 'https://b.example.com/x'];

    expect(parseOAuthCustomTargets(serializeOAuthCustomTargets(targets))).toEqual(targets);
  });

  it('canonicalises the stored entries and skips invalid entries and duplicates like the server', () => {
    const json = JSON.stringify([
      'HTTPS://Tool.Example.com:443/cb',
      'https://tool.example.com/cb',
      'http://insecure.example.com',
      42,
      'https://other.example.org',
    ]);

    expect(parseOAuthCustomTargets(json)).toEqual(['https://tool.example.com/cb', 'https://other.example.org']);
  });

  it('serialises an empty list as an empty JSON array', () => {
    expect(serializeOAuthCustomTargets([])).toBe('[]');
  });

  it.each(['', 'not json', '{"a":1}', '"text"', 'null', '42'])('reads %j as an empty list', (json) => {
    expect(parseOAuthCustomTargets(json)).toEqual([]);
  });
});
