// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

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

  private ignoreClicksUntil = 0;

  markOpened(guardGhostClicks: boolean): void {
    this.ignoreClicksUntil = guardGhostClicks
      ? Date.now() + TouchInteraction.GhostClickGuardMs
      : 0;
  }

  onClickEvent(event: string, valueEvent: string | undefined): void {
    if (Date.now() < this.ignoreClicksUntil) {
      return;
    }
    this.clickedSignal.set({ event, value: valueEvent ?? '' });
  }
}
