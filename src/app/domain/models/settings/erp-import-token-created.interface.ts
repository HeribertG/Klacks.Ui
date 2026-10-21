// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IErpImportTokenCreated {
  id: string;
  dropPointId: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string;
  token: string;
}
