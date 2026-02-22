// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface TooltipConfig {
  text: string;
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root',
})
export class TooltipService {
  private tooltipSubject = new Subject<TooltipConfig | null>();
  public tooltip$ = this.tooltipSubject.asObservable();

  show(config: TooltipConfig): void {
    this.tooltipSubject.next(config);
  }

  hide(): void {
    this.tooltipSubject.next(null);
  }
}
