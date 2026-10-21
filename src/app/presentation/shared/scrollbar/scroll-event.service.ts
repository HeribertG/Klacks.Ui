// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, signal } from '@angular/core';
import { ScrollPosition } from './scroll-position.interface';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class ScrollEventService {
  public scrollPosition = signal<ScrollPosition>({ horizontal: 0, vertical: 0 });
  public scroll$ = toObservable(this.scrollPosition);

  public emitScroll(horizontal: number, vertical: number): void {
    this.scrollPosition.set({ horizontal, vertical });
  }
}
