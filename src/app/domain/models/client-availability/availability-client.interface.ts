// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAvailabilityClient {
  id: string;
  displayName: string;
  groupIds: string[];
  legalEntity: boolean;
  name: string;
  firstName: string;
  company: string;
}
