// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CanDeactivateGuard } from './can-deactivate.guard';
import { CanComponentDeactivate } from './can-component-deactivate.interface';

describe('CanDeactivateGuard', () => {
  const guard = new CanDeactivateGuard();
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  it('passes the target of the navigation to the component and returns its answer', () => {
    const canDeactivate = vi.fn(() => false);

    const result = guard.canDeactivate({ canDeactivate }, route, state, { url: '/workplace/shift' } as RouterStateSnapshot);

    expect(canDeactivate).toHaveBeenCalledWith('/workplace/shift');
    expect(result).toBe(false);
  });

  it('allows a component without the check', () => {
    expect(guard.canDeactivate({} as CanComponentDeactivate, route, state)).toBe(true);
  });
});
