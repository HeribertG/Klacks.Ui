// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@angular/core';
import { TooltipConfig } from './tooltip-config.interface';
import { Subject } from 'rxjs';

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
