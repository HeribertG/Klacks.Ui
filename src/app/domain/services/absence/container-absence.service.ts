// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the absence types that may be planned inside a container (appliesToContainer). Errors of the read propagate to the caller.
 */

import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { IAbsence } from 'src/app/domain/models/absence/absence.interface';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';

@Injectable({ providedIn: 'root' })
export class ContainerAbsenceService {
  private dataAbsenceService = inject(DataAbsenceService);

  readContainerAbsences(): Observable<IAbsence[]> {
    return this.dataAbsenceService
      .readAbsenceList()
      .pipe(map((absences) => absences.filter((absence) => absence.appliesToContainer)));
  }
}
