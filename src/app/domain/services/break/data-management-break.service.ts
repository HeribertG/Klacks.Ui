// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { Break, IBreak } from 'src/app/domain/models/break/break-class';
import { DataBreakService } from 'src/app/infrastructure/api/break/data-break.service';
import { BulkAddBreaksRequest } from 'src/app/infrastructure/api/dtos/bulk-add-breaks-request.dto';
import { BulkDeleteBreaksRequest } from 'src/app/infrastructure/api/dtos/bulk-delete-breaks-request.dto';
import { BulkBreaksResponse } from 'src/app/infrastructure/api/dtos/bulk-breaks-response.dto';
import { Observable } from 'rxjs';
import { AnalyseScenarioService } from '../schedule/analyse-scenario.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementBreakService {
  private dataBreakService = inject(DataBreakService);
  private analyseScenarioService = inject(AnalyseScenarioService);

  public isCreating = signal(false);
  public lastCreated = signal<IBreak | undefined>(undefined);

  addBreak(value: Break): Observable<IBreak> {
    value.analyseToken = value.analyseToken ?? this.analyseScenarioService.activeToken() ?? undefined;
    this.isCreating.set(true);
    return new Observable(observer => {
      this.dataBreakService.addBreak(value).subscribe({
        next: (result) => {
          this.lastCreated.set(result);
          this.isCreating.set(false);
          observer.next(result);
          observer.complete();
        },
        error: (err) => {
          this.isCreating.set(false);
          observer.error(err);
        }
      });
    });
  }

  getBreak(id: string): Observable<IBreak> {
    return this.dataBreakService.getBreak(id);
  }

  updateBreak(value: Break): Observable<IBreak> {
    value.analyseToken = value.analyseToken ?? this.analyseScenarioService.activeToken() ?? undefined;
    return this.dataBreakService.updateBreak(value);
  }

  deleteBreak(id: string, periodStart: string, periodEnd: string): Observable<IBreak> {
    return this.dataBreakService.deleteBreak(id, periodStart, periodEnd);
  }

  bulkAddBreaks(request: BulkAddBreaksRequest): Observable<BulkBreaksResponse> {
    const analyseToken = this.analyseScenarioService.activeToken() ?? undefined;
    request.breaks = request.breaks.map(b => ({ ...b, analyseToken: b.analyseToken ?? analyseToken }));
    this.isCreating.set(true);
    return new Observable(observer => {
      this.dataBreakService.bulkAddBreaks(request).subscribe({
        next: (result) => {
          this.isCreating.set(false);
          observer.next(result);
          observer.complete();
        },
        error: (err) => {
          this.isCreating.set(false);
          observer.error(err);
        }
      });
    });
  }

  bulkDeleteBreaks(request: BulkDeleteBreaksRequest): Observable<BulkBreaksResponse> {
    return this.dataBreakService.bulkDeleteBreaks(request);
  }
}
