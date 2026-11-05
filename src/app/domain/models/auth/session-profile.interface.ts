// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISessionProfile {
  id: string;
  username: string;
  subject?: string;
  version?: string;
  expTime?: Date | string | null;
}
