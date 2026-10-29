// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ContainerTemplateRefreshHooks {
  isDirty(): boolean;
  save(): void;
  reload(): void;
}
