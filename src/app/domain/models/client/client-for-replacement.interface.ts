// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IClientForReplacement {
  id: string;
  name?: string;
  firstName?: string;
  company?: string;
  legalEntity: boolean;
  idNumber: number;
  groupIds?: string[];
}
