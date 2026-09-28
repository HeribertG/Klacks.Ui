// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IClientAvailability {
  id: string;
  clientId: string;
  date: string;
  hour: number;
  isAvailable: boolean;
}
