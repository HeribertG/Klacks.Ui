// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IEntityChanged {
  entityTypes: string[];
  operation: string;
  skillName: string;
  timestamp: string;
}
