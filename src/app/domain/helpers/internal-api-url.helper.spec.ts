// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { isInternalApiUrl } from './internal-api-url.helper';

describe('isInternalApiUrl', () => {
  const pageOrigin = 'http://localhost:4200';
  const crossOriginBase = 'https://localhost:5001/api/backend/';
  const relativeBase = '/api/backend/';

  it('accepts a URL below the configured base URL', () => {
    expect(isInternalApiUrl('https://localhost:5001/api/backend/Clients', crossOriginBase, pageOrigin)).toBe(true);
  });

  it('accepts the API root on the API origin when the Ui runs on another origin', () => {
    expect(isInternalApiUrl('https://localhost:5001/api/messaging/invitations', crossOriginBase, pageOrigin)).toBe(true);
  });

  it('accepts a relative /api/ path of the page', () => {
    expect(isInternalApiUrl('/api/backend/Clients', crossOriginBase, pageOrigin)).toBe(true);
  });

  it('accepts a URL below a relative base URL', () => {
    expect(isInternalApiUrl('/api/user-messenger-contacts/', relativeBase, pageOrigin)).toBe(true);
    expect(isInternalApiUrl('http://localhost:4200/api/backend/Clients', relativeBase, pageOrigin)).toBe(true);
  });

  it('rejects a foreign host even when its path contains /api/', () => {
    expect(isInternalApiUrl('https://evil.example/api/backend/Clients', crossOriginBase, pageOrigin)).toBe(false);
    expect(isInternalApiUrl('https://maps.example/v1/api/route', crossOriginBase, pageOrigin)).toBe(false);
  });

  it('rejects a path of the API origin outside /api/', () => {
    expect(isInternalApiUrl('https://localhost:5001/hubs/work-notifications', crossOriginBase, pageOrigin)).toBe(false);
  });

  it('rejects an empty or unparsable URL', () => {
    expect(isInternalApiUrl('', crossOriginBase, pageOrigin)).toBe(false);
    expect(isInternalApiUrl('http://[invalid', crossOriginBase, pageOrigin)).toBe(false);
  });
});
