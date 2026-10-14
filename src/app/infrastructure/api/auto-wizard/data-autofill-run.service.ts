// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * API service for the autofill run presence: reads every run in progress the caller may see, whatever group and
 * period the schedule shows. Sent without the global loading spinner because it runs in the background.
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { AUTOFILL_RUNS_ACTIVE_PATH } from 'src/app/domain/constants/autofill-run-presence.constants';
import { IAutofillRunPresence } from 'src/app/domain/interfaces/autofill-run-presence.interface';

@Injectable({
  providedIn: 'root',
})
export class DataAutofillRunService {
  private readonly httpClient = inject(HttpClient);

  getActive(): Observable<IAutofillRunPresence[]> {
    return this.httpClient.get<IAutofillRunPresence[]>(`${environment.baseUrl}${AUTOFILL_RUNS_ACTIVE_PATH}`, {
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }
}
