// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Loads and saves the shift preferences of one client: reads the stored preferences together with the shifts the
 * client may get and splits them into the preferred and the blacklisted category; saving sends both categories as
 * one bulk list (preferred first).
 * @param clientId - The client whose shift preferences are read or written
 */
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { DataShiftPreferenceService } from 'src/app/infrastructure/api/shift/data-shift-preference.service';
import { IClientShiftPreference } from 'src/app/domain/models/shift/client-shift-preference.interface';
import { IClientShiftPreferenceSet } from 'src/app/domain/models/shift/client-shift-preference-set.interface';
import { ShiftPreferenceType } from 'src/app/domain/models/shift/shift-preference-type.enum';

@Injectable({
  providedIn: 'root',
})
export class ClientShiftPreferenceService {
  private api = inject(DataShiftPreferenceService);

  load(clientId: string): Observable<IClientShiftPreferenceSet> {
    return forkJoin({
      preferences: this.api.getByClient(clientId),
      shifts: this.api.getAvailableShifts(clientId),
    }).pipe(
      map(({ preferences, shifts }) => ({
        availableShifts: shifts,
        preferred: preferences.filter((p) => p.preferenceType === ShiftPreferenceType.Preferred),
        blacklist: preferences.filter((p) => p.preferenceType === ShiftPreferenceType.Blacklist),
      })),
    );
  }

  save(
    clientId: string,
    preferred: IClientShiftPreference[],
    blacklist: IClientShiftPreference[],
  ): Observable<IClientShiftPreference[]> {
    return this.api.saveAll(clientId, [...preferred, ...blacklist]);
  }
}
