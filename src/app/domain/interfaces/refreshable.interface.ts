// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IRefreshable {
  readonly refreshableEntities: readonly string[];
  reload(): void;
}
