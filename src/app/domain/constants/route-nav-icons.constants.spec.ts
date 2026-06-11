// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { resolveNavIconsForRoute } from './route-nav-icons.constants';

describe('resolveNavIconsForRoute', () => {
  it('resolves an exact workplace route', () => {
    expect(resolveNavIconsForRoute('/workplace/absence')).toEqual(['open-absences']);
  });

  it('resolves a route with an entity id suffix', () => {
    expect(resolveNavIconsForRoute('/workplace/edit-address/0c4f2e1a')).toEqual(['open-employees']);
  });

  it('strips query strings and fragments', () => {
    expect(resolveNavIconsForRoute('/workplace/schedule?week=23#top')).toEqual(['open-schedules']);
  });

  it('does not collapse client-availability onto the client route', () => {
    expect(resolveNavIconsForRoute('/workplace/client-availability/2026')).toEqual(['open-availability']);
  });

  it('returns the logo candidates for the dashboard', () => {
    expect(resolveNavIconsForRoute('/workplace/dashboard')).toEqual(['header-logo-icon', 'header-logo-image']);
  });

  it('returns null for unmapped or empty routes', () => {
    expect(resolveNavIconsForRoute('/workplace/profile')).toBeNull();
    expect(resolveNavIconsForRoute('/login')).toBeNull();
    expect(resolveNavIconsForRoute('')).toBeNull();
    expect(resolveNavIconsForRoute(null)).toBeNull();
  });
});
