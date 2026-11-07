// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { inject, Injectable, signal } from '@angular/core';
import { Break } from 'src/app/domain/models/break/break-class';
import { IBreak } from 'src/app/domain/models/break/break.interface';
import { DataBreakService } from 'src/app/infrastructure/api/break/data-break.service';
import { BulkAddBreaksRequest } from 'src/app/domain/models/dtos/bulk-add-breaks-request.dto';
import { BulkDeleteBreaksRequest } from 'src/app/domain/models/dtos/bulk-delete-breaks-request.dto';
import { BulkBreaksResponse } from 'src/app/domain/models/dtos/bulk-breaks-response.dto';
import { RemovableWork } from 'src/app/domain/models/dtos/removable-work.dto';
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
        },
        complete: () => {
          this.isCreating.set(false);
          observer.complete();
        },
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

  confirmBreak(breakId: string): Observable<IBreak> {
    return this.dataBreakService.confirmBreak(breakId);
  }

  unconfirmBreak(breakId: string): Observable<IBreak> {
    return this.dataBreakService.unconfirmBreak(breakId);
  }

  previewTakenWorks(request: BulkAddBreaksRequest): Observable<RemovableWork[]> {
    return this.dataBreakService.previewTakenWorks(this.withActiveToken(request));
  }

  private withActiveToken(request: BulkAddBreaksRequest): BulkAddBreaksRequest {
    const analyseToken = this.analyseScenarioService.activeToken() ?? undefined;
    return {
      ...request,
      breaks: request.breaks.map(b => ({ ...b, analyseToken: b.analyseToken ?? analyseToken })),
    };
  }

  bulkAddBreaks(request: BulkAddBreaksRequest): Observable<BulkBreaksResponse> {
    const tokened = this.withActiveToken(request);
    this.isCreating.set(true);
    return new Observable(observer => {
      this.dataBreakService.bulkAddBreaks(tokened).subscribe({
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
