// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Observable } from 'rxjs';
import { CanComponentDeactivate } from './can-component-deactivate.interface';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class CanDeactivateGuard {
  canDeactivate(
    component: CanComponentDeactivate,
    _currentRoute?: ActivatedRouteSnapshot,
    _currentState?: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return component.canDeactivate ? component.canDeactivate(nextState?.url) : true;
  }
}
