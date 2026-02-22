// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

export interface ContextMenuClickEvent {
  event: string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContextMenuService {
  public clickedSignal = signal<ContextMenuClickEvent | null>(null);

  public hasClicked = toObservable(this.clickedSignal).pipe(
    filter((x): x is ContextMenuClickEvent => x !== null),
    map((x) => [x.event, x.value])
  );

  onClickEvent(event: string, valueEvent: string | undefined): void {
    this.clickedSignal.set({ event, value: valueEvent ?? '' });
  }
}
