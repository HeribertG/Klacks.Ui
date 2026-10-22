// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  IClientAvailabilityClientResource,
} from 'src/app/domain/models/client-availability/client-availability-client-resource.interface';

export interface ClientAvailabilityReportRow extends IClientAvailabilityClientResource {
  totalHours: number;
  daysWithAvailability: number;
}
