// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Observable } from 'rxjs';
import { CanComponentDeactivate } from './can-component-deactivate.interface';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CanDeactivateGuard {
  canDeactivate(
    component: CanComponentDeactivate
  ): Observable<boolean> | Promise<boolean> | boolean {
    return component.canDeactivate ? component.canDeactivate() : true;
  }
}
