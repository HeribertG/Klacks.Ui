// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Loads the clients of the client availability grid and, when the filter asks for the individual sort, orders them
 * by the per-group sort preference (unranked clients alphabetically after the ranked ones).
 * @param filter - Client availability filter; individualSort decides whether the sort preference is applied
 */
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { IClientAvailabilityClientFilter } from 'src/app/domain/models/client-availability/client-availability-client-filter.interface';
import { IClientAvailabilityClientResource } from 'src/app/domain/models/client-availability/client-availability-client-resource.interface';
import { DataClientAvailabilityService } from 'src/app/infrastructure/api/client-availability/data-client-availability.service';
import { ClientSortPreferenceService } from '../schedule/client-sort-preference.service';

@Injectable({ providedIn: 'root' })
export class ClientAvailabilityClientListService {
  private dataClientAvailability = inject(DataClientAvailabilityService);
  private clientSortPreference = inject(ClientSortPreferenceService);

  loadClients(filter: IClientAvailabilityClientFilter): Promise<IClientAvailabilityClientResource[]> {
    return firstValueFrom(
      this.dataClientAvailability.getClients(filter).pipe(
        map((response) =>
          filter.individualSort ? this.clientSortPreference.applyTo(response.clients) : response.clients
        )
      )
    );
  }
}
